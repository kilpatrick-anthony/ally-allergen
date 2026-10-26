export const PLATFORM_TIMEZONE = 'Europe/Dublin'
const DAY = 86400000
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: PLATFORM_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
export function localDay(date: Date): string {
  const parts = dayFormatter.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export const shiftDay = (day: string, amount: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY).toISOString().slice(0, 10)
function validDay(day: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(`${day}T00:00:00Z`)) &&
    shiftDay(day, 0) === day
  )
}
/** Resolve local midnight without assuming every Irish calendar day is 24 hours. */
export function localMidnight(day: string): Date {
  const wall = Date.parse(`${day}T00:00:00Z`)
  let guess = wall
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: PLATFORM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess))
    const get = (type: string) => Number(parts.find((part) => part.type === type)!.value)
    const displayed = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
    guess += wall - displayed
  }
  return new Date(guess)
}
export function platformRange(params: URLSearchParams, now = new Date()) {
  const today = localDay(now)
  const preset = params.get('range') || 'last_week'
  let start: string, end: string
  if (preset === 'custom') {
    start = params.get('start') || ''
    end = params.get('end') || ''
    if (!validDay(start) || !validDay(end) || end < start || end > today)
      throw new Error('Choose valid start and end dates, ending no later than today.')
  } else {
    if (params.has('start') || params.has('end'))
      throw new Error('Choose Custom dates to specify a date range.')
    if (preset === 'last_week') {
      const monday = shiftDay(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7))
      start = shiftDay(monday, -7)
      end = shiftDay(monday, -1)
    } else if (preset === '7d' || preset === '30d') {
      const days = preset === '7d' ? 7 : 30
      start = shiftDay(today, -days)
      end = shiftDay(today, -1)
    } else throw new Error('Choose a valid reporting period.')
  }
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1
  if (days > 366) throw new Error('Choose a reporting period of 366 days or fewer.')
  const previousEnd = shiftDay(start, -1),
    previousStart = shiftDay(start, -days)
  return {
    range: {
      start,
      end,
      previousStart,
      previousEnd,
      days,
      timezone: PLATFORM_TIMEZONE,
      partial: end === today,
    },
    currentStart: localMidnight(start),
    currentEnd: new Date(Math.min(localMidnight(shiftDay(end, 1)).getTime(), now.getTime())),
    previousStart: localMidnight(previousStart),
    previousEnd: localMidnight(start),
  }
}
export type PlatformRange = ReturnType<typeof platformRange>['range']
