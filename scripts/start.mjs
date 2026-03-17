#!/usr/bin/env node
/**
 * paperclip-railway/scripts/start.mjs
 *
 * Railway-aware startup wrapper for paperclipai.
 *
 * Architecture:
 *  - This script ALWAYS owns port 3100 (Railway's public port)
 *  - Before launch: serves the /setup UI on 3100
 *  - After launch:  runs Paperclip internally on port 3099,
 *                   and proxies all non-/setup traffic from 3100 → 3099
 *  - /setup/* routes remain alive forever for the invite URL display
 */

import { createServer, request as httpRequest } from "http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_PORT = parseInt(process.env.PORT || "3100", 10);
const PAPERCLIP_PORT = 3099; // internal port paperclip listens on
const PAPERCLIP_HOME = process.env.PAPERCLIP_HOME || "/paperclip";
const SETUP_FLAG = join(PAPERCLIP_HOME, ".setup_complete");
const INVITE_FILE = join(PAPERCLIP_HOME, "bootstrap-invite.txt");
const CONFIG_PATH = join(PAPERCLIP_HOME, "config.json");

// Global state
let paperclipReady = false;
let bootstrapInviteUrl = null;

// ─── helpers ────────────────────────────────────────────────────────────────

function isSetupComplete() {
  return process.env.SETUP_COMPLETE === "true" || existsSync(SETUP_FLAG);
}

function markSetupComplete() {
  mkdirSync(PAPERCLIP_HOME, { recursive: true });
  writeFileSync(SETUP_FLAG, new Date().toISOString());
}

function requiredVars() {
  return [
    {
      key: "DATABASE_URL",
      label: "Database URL",
      description: "PostgreSQL connection string from Railway Postgres service",
      example: "postgresql://user:pass@host:5432/dbname",
      required: true,
    },
    {
      key: "BETTER_AUTH_SECRET",
      label: "Auth Secret",
      description: "Random 32+ char secret for session signing. Use Railway's secret() generator.",
      example: "use ${{secret(32)}} in Railway",
      required: true,
    },
    {
      key: "PAPERCLIP_PUBLIC_URL",
      label: "Public URL",
      description: "Your Railway public domain (https://your-app.up.railway.app)",
      example: "https://your-app.up.railway.app",
      required: true,
    },
    {
      key: "PAPERCLIP_ALLOWED_HOSTNAMES",
      label: "Allowed Hostnames",
      description: "Comma-separated hostnames Railway assigned. Must match your public URL host.",
      example: "your-app.up.railway.app",
      required: true,
    },
    {
      key: "PAPERCLIP_DEPLOYMENT_MODE",
      label: "Deployment Mode",
      description: "Use 'authenticated' for production (requires login).",
      example: "authenticated",
      required: false,
    },
    {
      key: "PAPERCLIP_HOME",
      label: "Paperclip Home",
      description: "Persistent data directory. Must match your Railway volume mount path.",
      example: "/paperclip",
      required: false,
    },
    {
      key: "ANTHROPIC_API_KEY",
      label: "Anthropic API Key",
      description: "Optional. Enables Claude Code adapter for agents.",
      example: "sk-ant-...",
      required: false,
    },
    {
      key: "OPENAI_API_KEY",
      label: "OpenAI API Key",
      description: "Optional. Enables Codex/GPT adapter for agents.",
      example: "sk-...",
      required: false,
    },
  ];
}

function checkEnvStatus() {
  return requiredVars().map((v) => ({
    ...v,
    value: process.env[v.key] ? "✓ Set" : "",
    missing: v.required && !process.env[v.key],
  }));
}

// ─── proxy ───────────────────────────────────────────────────────────────────

function proxyToPaperclip(req, res) {
  if (!paperclipReady) {
    res.writeHead(503, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f10;color:#fff">
      <div style="text-align:center">
        <div style="font-size:32px;margin-bottom:16px">⏳</div>
        <h2>Paperclip is starting up...</h2>
        <p style="color:#71717a;margin-top:8px">This page will refresh automatically.</p>
        <script>setTimeout(()=>location.reload(),3000)<\/script>
      </div></body></html>`);
    return;
  }

  const options = {
    hostname: "127.0.0.1",
    port: PAPERCLIP_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${PAPERCLIP_PORT}` },
  };

  const proxy = httpRequest(options, (paperclipRes) => {
    res.writeHead(paperclipRes.statusCode, paperclipRes.headers);
    paperclipRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Paperclip is restarting, please refresh in a moment.");
  });

  req.pipe(proxy, { end: true });
}

// ─── main HTTP server (always on PUBLIC_PORT) ─────────────────────────────

function startMainServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost`);

    // ── /setup/* routes (always handled by us, never proxied) ──

    if (url.pathname === "/setup/status" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ vars: checkEnvStatus() }));
      return;
    }

    if (url.pathname === "/setup/invite" && req.method === "GET") {
      // Try reading from file if not in memory (e.g. after restart)
      if (!bootstrapInviteUrl && existsSync(INVITE_FILE)) {
        try { bootstrapInviteUrl = readFileSync(INVITE_FILE, "utf8").trim(); } catch(_) {}
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url: bootstrapInviteUrl, ready: paperclipReady }));
      return;
    }

    if (url.pathname === "/setup/rotate-invite" && req.method === "POST") {
      const rotate = spawn(
        "node",
        ["node_modules/.bin/paperclipai", "auth", "bootstrap-ceo"],
        {
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, PAPERCLIP_CONFIG: CONFIG_PATH },
        }
      );
      let out = "";
      rotate.stdout.on("data", (d) => {
        out += d.toString();
        const match = out.match(/https?:\/\/\S+\/invite\/pcp_bootstrap_\S+/);
        if (match) {
          bootstrapInviteUrl = match[0].trim();
          writeFileSync(INVITE_FILE, bootstrapInviteUrl);
        }
      });
      rotate.stderr.on("data", (d) => process.stderr.write(d));
      rotate.on("exit", () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ url: bootstrapInviteUrl }));
      });
      return;
    }

    if (url.pathname === "/setup/launch" && req.method === "POST") {
      if (isSetupComplete()) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, message: "Already launched." }));
        return;
      }
      markSetupComplete();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Launching Paperclip..." }));
      setTimeout(() => launchPaperclip(), 300);
      return;
    }

    // /setup page itself
    if (url.pathname === "/setup") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(getSetupHTML());
      return;
    }

    // ── Everything else ──
    if (isSetupComplete()) {
      proxyToPaperclip(req, res);
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(getSetupHTML());
    }
  });

  server.listen(PUBLIC_PORT, "0.0.0.0", () => {
    if (isSetupComplete()) {
      console.log(`\n🔄 Wrapper on port ${PUBLIC_PORT} → proxying to Paperclip on ${PAPERCLIP_PORT}`);
    } else {
      console.log(`\n🔧 Paperclip Railway Setup — open your Railway URL to configure and launch.\n`);
    }
  });
}

// ─── paperclip launcher ──────────────────────────────────────────────────────

function buildConfig() {
  return {
    $meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "onboard",
    },
    database: {
      provider: "postgres",
      connectionString: process.env.DATABASE_URL,
    },
    logging: {
      mode: "file",
      logDir: join(PAPERCLIP_HOME, "logs"),
    },
    server: {
      deploymentMode: process.env.PAPERCLIP_DEPLOYMENT_MODE || "authenticated",
      deploymentExposure: process.env.PAPERCLIP_DEPLOYMENT_EXPOSURE || "public",
      allowedHostnames: (process.env.PAPERCLIP_ALLOWED_HOSTNAMES || "")
        .split(",").map((h) => h.trim()).filter(Boolean),
      port: PAPERCLIP_PORT,
      host: "127.0.0.1",
    },
    auth: {
      baseUrlMode: "explicit",
      publicBaseUrl: process.env.PAPERCLIP_PUBLIC_URL || "",
      disableSignUp: process.env.PAPERCLIP_AUTH_DISABLE_SIGN_UP === "true",
    },
    storage: {
      provider: "local_disk",
      localDiskPath: join(PAPERCLIP_HOME, "storage"),
    },
    secrets: {
      provider: "local_encrypted",
      localEncrypted: {
        keyFilePath: join(PAPERCLIP_HOME, "secrets.key"),
      },
    },
  };
}

function launchPaperclip() {
  console.log(`\n🚀 Starting Paperclip on internal port ${PAPERCLIP_PORT}...\n`);

  mkdirSync(PAPERCLIP_HOME, { recursive: true });
  mkdirSync(join(PAPERCLIP_HOME, "logs"), { recursive: true });
  mkdirSync(join(PAPERCLIP_HOME, "storage"), { recursive: true });

  // Always regenerate config to pick up any fixes
  if (existsSync(CONFIG_PATH)) unlinkSync(CONFIG_PATH);
  const config = buildConfig();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`   Wrote config to ${CONFIG_PATH}`);

  const env = {
    ...process.env,
    PAPERCLIP_CONFIG: CONFIG_PATH,
    PAPERCLIP_HOME: PAPERCLIP_HOME,
    PORT: String(PAPERCLIP_PORT),
    HOST: "127.0.0.1",
    NODE_ENV: process.env.NODE_ENV || "production",
  };

  const cli = spawn(
    "node",
    ["node_modules/.bin/paperclipai", "run"],
    { stdio: ["ignore", "pipe", "pipe"], env }
  );

  cli.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    // Capture the bootstrap invite URL from logs
    const match = text.match(/https?:\/\/\S+\/invite\/pcp_bootstrap_\S+/);
    if (match) {
      bootstrapInviteUrl = match[0].trim();
      writeFileSync(INVITE_FILE, bootstrapInviteUrl);
      console.log(`\n✅ Bootstrap invite URL saved to ${INVITE_FILE}\n`);
    }

    // Detect when server is ready
    if (text.includes("Server listening on") || text.includes("server listening")) {
      paperclipReady = true;
      console.log(`\n✅ Paperclip ready — proxying ${PUBLIC_PORT} → ${PAPERCLIP_PORT}\n`);
    }
  });

  cli.stderr.on("data", (chunk) => process.stderr.write(chunk));

  cli.on("error", (err) => {
    console.error("Failed to start paperclipai:", err);
    process.exit(1);
  });

  cli.on("exit", (code) => {
    console.log(`paperclipai exited with code ${code}`);
    process.exit(code ?? 0);
  });
}

// ─── entrypoint ─────────────────────────────────────────────────────────────

startMainServer();

if (isSetupComplete()) {
  launchPaperclip();
}

// ─── setup HTML ─────────────────────────────────────────────────────────────

function getSetupHTML() {
  const launched = isSetupComplete();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Paperclip Railway Setup</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f0f10; --surface: #18181b; --border: #27272a;
      --accent: #6366f1; --success: #22c55e; --warning: #f59e0b;
      --error: #ef4444; --text: #fafafa; --muted: #71717a; --radius: 10px;
    }
    body {
      background: var(--bg); color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh; display: flex; align-items: center;
      justify-content: center; padding: 24px;
    }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); width: 100%; max-width: 780px; overflow: hidden; }
    .card-header { padding: 28px 32px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 14px; }
    .logo { width: 40px; height: 40px; background: var(--accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .card-header h1 { font-size: 20px; font-weight: 600; }
    .card-header p { font-size: 13px; color: var(--muted); margin-top: 2px; }
    .card-body { padding: 24px 32px 32px; }
    .section-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
    .var-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .var-row { display: grid; grid-template-columns: 200px 1fr 80px; align-items: center; gap: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; }
    .var-row.missing { border-color: var(--error); }
    .var-row.ok { border-color: var(--success); }
    .var-key { font-size: 13px; font-weight: 600; font-family: monospace; }
    .var-key small { display: block; font-family: sans-serif; font-weight: 400; font-size: 11px; color: var(--muted); margin-top: 2px; }
    .var-example { font-size: 12px; color: var(--muted); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .var-status { text-align: right; font-size: 12px; font-weight: 600; }
    .status-ok { color: var(--success); } .status-missing { color: var(--error); } .status-optional { color: var(--muted); }
    .banner { border-radius: 8px; padding: 14px 16px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .banner.info { background: #1e1b4b; border: 1px solid #3730a3; color: #c7d2fe; }
    .banner.warn { background: #1c1400; border: 1px solid var(--warning); color: #fde68a; }
    .banner.success { background: #052e16; border: 1px solid var(--success); color: #bbf7d0; }
    .banner.error { background: #1f0707; border: 1px solid var(--error); color: #fca5a5; }
    .actions { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; align-items: center; }
    button { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s, transform 0.1s; }
    button:active { transform: scale(0.97); }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: var(--border); color: var(--text); }
    .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); font-size: 12px; padding: 8px 14px; }
    .spinner { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .invite-box { background: var(--bg); border: 1px solid var(--success); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .invite-box h3 { font-size: 14px; margin-bottom: 14px; color: #bbf7d0; }
    .invite-url-row { display: flex; gap: 8px; align-items: center; }
    .invite-url-input { flex: 1; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 9px 12px; border-radius: 6px; font-size: 12px; font-family: monospace; min-width: 0; }
    .invite-actions { display: flex; gap: 8px; margin-top: 12px; align-items: center; flex-wrap: wrap; }
    .divider { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
    .step-list { counter-reset: steps; list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .step-list li { counter-increment: steps; padding: 12px 16px 12px 44px; position: relative; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--muted); line-height: 1.5; }
    .step-list li::before { content: counter(steps); position: absolute; left: 14px; top: 12px; width: 20px; height: 20px; background: var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text); }
    .step-list li strong { color: var(--text); }
    code { background: var(--border); padding: 1px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
  </style>
</head>
<body>
<div class="card">
  <div class="card-header">
    <div class="logo">📎</div>
    <div>
      <h1>Paperclip — Railway Setup</h1>
      <p id="subtitle">${launched ? "Paperclip is running. Register your admin account below." : "Configure your environment variables, then launch the server."}</p>
    </div>
  </div>
  <div class="card-body">

    <!-- ── INVITE SECTION (shown after launch) ── -->
    <div id="invite-section" style="display:${launched ? "block" : "none"}">
      <div class="section-title">Admin registration</div>

      <div id="invite-waiting" class="banner info" style="display:none">
        <span class="spinner"></span>
        <span>Waiting for Paperclip to start and generate the bootstrap invite URL...</span>
      </div>

      <div id="invite-ready" class="invite-box" style="display:none">
        <h3>✅ Paperclip is running! Use this link to register as admin:</h3>
        <div class="invite-url-row">
          <input class="invite-url-input" id="invite-url-input" readonly placeholder="Loading..." />
          <button class="btn-secondary" onclick="copyInvite(this)">📋 Copy</button>
        </div>
        <div class="invite-actions">
          <a id="invite-open-link" href="#" target="_blank">
            <button class="btn-primary">🔗 Open in new tab</button>
          </a>
          <button class="btn-ghost" onclick="rotateInvite(this)" id="rotate-btn">🔄 Rotate invite link</button>
        </div>
        <p style="margin-top:14px; font-size:12px; color:var(--muted)">
          After registering your account, go to Railway Variables → set <code>PAPERCLIP_AUTH_DISABLE_SIGN_UP=true</code> → redeploy to lock down new signups.
        </p>
      </div>

      <hr class="divider" />
      <div class="section-title">Environment variable status</div>
      <div id="status-banner" class="banner info"><span>⏳</span><span>Checking...</span></div>
      <div class="var-list" id="var-list"></div>
    </div>

    <!-- ── SETUP SECTION (shown before launch) ── -->
    <div id="setup-section" style="display:${launched ? "none" : "block"}">
      <div class="section-title">How to set up</div>
      <ol class="step-list">
        <li>Go to your <strong>Railway project</strong> → open the Paperclip service → click <strong>Variables</strong>.</li>
        <li>Add each required variable below (those marked <span style="color:var(--error)">Missing</span>).</li>
        <li>For <code>BETTER_AUTH_SECRET</code>, use Railway's generator: set the value to <code>\${{secret(32)}}</code>.</li>
        <li>Click <strong>Refresh Status</strong> below — all required vars should turn green.</li>
        <li>Click <strong>Launch Paperclip</strong>. DB migrations run automatically on first boot.</li>
      </ol>

      <div class="section-title">Environment variable status</div>
      <div id="status-banner" class="banner info"><span>⏳</span><span style="margin-left:6px">Checking environment variables...</span></div>
      <div class="var-list" id="var-list"></div>

      <div class="actions">
        <button class="btn-primary" id="launch-btn" disabled onclick="launch()">🚀 Launch Paperclip</button>
        <button class="btn-secondary" onclick="refresh()">🔄 Refresh Status</button>
      </div>
      <div id="launch-progress" style="display:none; margin-top:16px; align-items:center; gap:10px; font-size:13px; color:var(--muted)">
        <span class="spinner"></span>
        <span id="launch-msg">Launching Paperclip...</span>
      </div>
    </div>

  </div>
</div>

<script>
  const launched = ${launched};

  async function refresh() {
    try {
      const res = await fetch('/setup/status');
      const { vars } = await res.json();
      renderVars(vars);
      updateBanner(vars);
    } catch(e) {
      setBanner('error', '❌ Could not reach setup server.');
    }
  }

  function renderVars(vars) {
    const list = document.getElementById('var-list');
    if (!list) return;
    list.innerHTML = vars.map(v => {
      const cls = v.missing ? 'missing' : v.value ? 'ok' : '';
      const statusCls = v.missing ? 'status-missing' : v.value ? 'status-ok' : 'status-optional';
      const statusText = v.missing ? '✗ Missing' : v.value ? '✓ Set' : '— Optional';
      return \`<div class="var-row \${cls}">
        <div class="var-key">\${v.key}<small>\${v.label}</small></div>
        <div class="var-example">\${v.value || v.example}</div>
        <div class="var-status \${statusCls}">\${statusText}</div>
      </div>\`;
    }).join('');
  }

  function updateBanner(vars) {
    const missing = vars.filter(v => v.missing);
    const btn = document.getElementById('launch-btn');
    if (missing.length === 0) {
      setBanner('success', '✅ All required variables are set. You can launch Paperclip.');
      if (btn) btn.disabled = false;
    } else {
      setBanner('warn', \`⚠️ \${missing.length} required variable\${missing.length>1?'s are':' is'} missing: \${missing.map(v=>v.key).join(', ')}\`);
      if (btn) btn.disabled = true;
    }
  }

  function setBanner(type, msg) {
    const b = document.getElementById('status-banner');
    if (!b) return;
    b.className = 'banner ' + type;
    b.innerHTML = \`<span>\${msg}</span>\`;
  }

  async function launch() {
    document.getElementById('launch-btn').disabled = true;
    const prog = document.getElementById('launch-progress');
    prog.style.display = 'flex';
    try {
      await fetch('/setup/launch', { method: 'POST' });
    } catch(_) {}
    document.getElementById('launch-msg').textContent = 'Paperclip is starting up...';
    setTimeout(() => {
      document.getElementById('setup-section').style.display = 'none';
      document.getElementById('invite-section').style.display = 'block';
      document.getElementById('subtitle').textContent = 'Paperclip is running. Register your admin account below.';
      refresh();
      pollForInvite();
    }, 1500);
  }

  async function pollForInvite() {
    document.getElementById('invite-waiting').style.display = 'flex';
    document.getElementById('invite-ready').style.display = 'none';
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/setup/invite');
        const data = await res.json();
        if (data.url) {
          clearInterval(interval);
          showInvite(data.url);
        }
      } catch(_) {}
      if (attempts > 90) {
        clearInterval(interval);
        document.getElementById('invite-waiting').innerHTML =
          '<span>⚠️ Could not auto-retrieve invite URL. Check Railway deploy logs — look for a line containing <strong>/invite/pcp_bootstrap_</strong></span>';
      }
    }, 2000);
  }

  function showInvite(url) {
    document.getElementById('invite-waiting').style.display = 'none';
    document.getElementById('invite-ready').style.display = 'block';
    document.getElementById('invite-url-input').value = url;
    document.getElementById('invite-open-link').href = url;
  }

  function copyInvite(btn) {
    const val = document.getElementById('invite-url-input').value;
    navigator.clipboard.writeText(val).then(() => {
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
  }

  async function rotateInvite(btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Rotating...';
    try {
      const res = await fetch('/setup/rotate-invite', { method: 'POST' });
      const data = await res.json();
      if (data.url) showInvite(data.url);
      else alert('Rotation ran but no URL returned. Check logs.');
    } catch(e) {
      alert('Failed to rotate invite. Check logs.');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔄 Rotate invite link';
    }
  }

  // Init
  if (launched) {
    pollForInvite();
    refresh();
  } else {
    refresh();
  }
</script>
</body>
</html>`;
}
