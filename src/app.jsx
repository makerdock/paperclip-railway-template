import { useState, useEffect } from 'preact/hooks'
import './app.css'

function getWeekId(date) {
  const d = new Date(date)
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay() + 1)
  const year = start.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const days = Math.floor((start - jan1) / 86400000)
  const week = Math.ceil((days + jan1.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function parseDate(d) {
  return new Date(d + 'T00:00:00')
}

function formatDay(dateStr) {
  const d = parseDate(dateStr)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Calendar({ days, onSelect, today }) {
  const firstDay = parseDate(days[0].date)
  const startOfMonth = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1)
  const endOfMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0)
  const startPad = startOfMonth.getDay() === 0 ? 6 : startOfMonth.getDay() - 1
  const totalDays = endOfMonth.getDate()
  const daySet = new Set(days.map(d => d.date))

  const cells = []
  for (let i = 0; i < startPad; i++) {
    cells.push(<div class="calendar-day empty" />)
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = dateStr === today
    const hasMeals = daySet.has(dateStr)
    cells.push(
      <button
        class={`calendar-day ${isToday ? 'today' : ''} ${hasMeals ? 'has-meals' : ''}`}
        onClick={() => hasMeals && onSelect(dateStr)}
        disabled={!hasMeals}
      >
        <span class="day-number">{d}</span>
        {hasMeals && <span class="day-dot" />}
      </button>
    )
  }

  const monthName = startOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div class="week-label">{monthName}</div>
      <div class="calendar-grid">
        <div class="calendar-header">Mon</div>
        <div class="calendar-header">Tue</div>
        <div class="calendar-header">Wed</div>
        <div class="calendar-header">Thu</div>
        <div class="calendar-header">Fri</div>
        <div class="calendar-header">Sat</div>
        <div class="calendar-header">Sun</div>
        {cells}
      </div>
    </div>
  )
}

function DayView({ day, onBack, onSwap }) {
  const [swapping, setSwapping] = useState(null)

  return (
    <div class="day-view">
      <div class="header">
        <button onClick={onBack}>← Back</button>
        <h1>{day.dayOfWeek}</h1>
        <div style={{ width: 60 }} />
      </div>
      <div class="day-date">{formatDay(day.date)}</div>

      {day.meals.map(meal => (
        <div class="meal-card">
          <div class="meal-header">
            <div>
              <div class="meal-slot">{meal.slot}</div>
              <div class="meal-name">{meal.name}</div>
            </div>
            <div class="meal-time">{meal.time}</div>
          </div>
          <div class="meal-macros">
            <span class="macro-badge">{meal.kcal} kcal</span>
            <span class="macro-badge">{meal.protein}g protein</span>
          </div>

          {meal.alternatives?.length > 0 && (
            <>
              <button class="swap-btn" onClick={() => setSwapping(swapping === meal.slot ? null : meal.slot)}>
                {swapping === meal.slot ? 'Cancel' : 'Swap → Alternative'}
              </button>

              {swapping === meal.slot && (
                <div class="swap-panel">
                  <h4>Choose alternative</h4>
                  {meal.alternatives.map(alt => (
                    <button class="swap-option" onClick={() => onSwap(day.date, meal.slot, alt)}>
                      <span class="name">{alt.name}</span>
                      <span class="macros">{alt.kcal} kcal · {alt.protein}g protein</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export function App() {
  const [plan, setPlan] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [swaps, setSwaps] = useState({})

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch('/meal-plan.json')
      .then(r => r.json())
      .then(setPlan)
  }, [])

  if (!plan) {
    return <div class="empty-state"><p>Loading meal plan...</p></div>
  }

  const handleSwap = (date, slot, alt) => {
    setSwaps(prev => ({ ...prev, [`${date}:${slot}`]: alt }))
    setSelectedDate(null)
    setTimeout(() => setSelectedDate(date), 50)
  }

  const getDayData = (date) => {
    const day = plan.days.find(d => d.date === date)
    if (!day) return null
    return {
      ...day,
      meals: day.meals.map(m => ({
        ...m,
        name: swaps[`${date}:${m.slot}`]?.name || m.name,
        kcal: swaps[`${date}:${m.slot}`]?.kcal || m.kcal,
        protein: swaps[`${date}:${m.slot}`]?.protein || m.protein,
      }))
    }
  }

  if (selectedDate) {
    const day = getDayData(selectedDate)
    if (day) {
      return <DayView day={day} onBack={() => setSelectedDate(null)} onSwap={handleSwap} />
    }
  }

  return (
    <div>
      <div class="header">
        <h1>bhojan</h1>
        <button onClick={() => setSelectedDate(today)}>Today</button>
      </div>
      <div class="week-label">Week {plan.weekId}</div>
      <Calendar days={plan.days} today={today} onSelect={setSelectedDate} />
    </div>
  )
}
