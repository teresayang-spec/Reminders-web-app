import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Bell, BellRing, ChevronDown, Clock3, Globe2, Plus, Trash2, X } from 'lucide-react'

type Reminder = { id: string; title: string; note: string; date: string; time: string; timezone: string }

const zones = [
  'America/Los_Angeles', 'America/New_York', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney',
]

const sample: Reminder[] = [
  { id: '1', title: 'Call Mum', note: 'Check in and make weekend plans', date: '2026-08-05', time: '18:00', timezone: 'America/Los_Angeles' },
  { id: '2', title: 'Design review', note: 'Bring the latest onboarding flow', date: '2026-08-06', time: '10:30', timezone: 'America/Los_Angeles' },
  { id: '3', title: 'Water the plants', note: '', date: '2026-08-08', time: '09:00', timezone: 'America/Los_Angeles' },
]

const initialZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles'

function formatZone(zone: string) { return zone.replace('_', ' ').replace('/', ' · ') }
function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
}
function zoneTime(zone: string) {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone }).format(new Date())
}
function nowInZone(zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return { date: `${value('year')}-${value('month')}-${value('day')}`, time: `${value('hour')}:${value('minute')}` }
}

export default function App() {
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('remindly-reminders')
    return saved ? JSON.parse(saved) : sample
  })
  const [timezone, setTimezone] = useState(() => localStorage.getItem('remindly-timezone') || initialZone)
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState({ title: '', note: '', date: new Date().toISOString().slice(0, 10), time: '09:00', timezone })
  const [alert, setAlert] = useState<Reminder | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => 'Notification' in window ? Notification.permission : 'denied')
  const notified = useRef(new Set<string>(JSON.parse(localStorage.getItem('remindly-notified') || '[]')))

  useEffect(() => { localStorage.setItem('remindly-reminders', JSON.stringify(reminders)) }, [reminders])
  useEffect(() => { localStorage.setItem('remindly-timezone', timezone) }, [timezone])
  useEffect(() => { setForm(f => ({ ...f, timezone })) }, [timezone])

  useEffect(() => {
    const checkReminders = () => reminders.forEach(reminder => {
      const now = nowInZone(reminder.timezone)
      const key = `${reminder.id}-${reminder.date}-${reminder.time}-${reminder.timezone}`
      if (now.date === reminder.date && now.time === reminder.time && !notified.current.has(key)) {
        notified.current.add(key)
        localStorage.setItem('remindly-notified', JSON.stringify([...notified.current]))
        setAlert(reminder)
        if ('Notification' in window && Notification.permission === 'granted') new Notification(reminder.title, { body: reminder.note || `Scheduled for ${reminder.time}` })
      }
    })
    checkReminders()
    const interval = window.setInterval(checkReminders, 15_000)
    return () => window.clearInterval(interval)
  }, [reminders])

  const sorted = useMemo(() => [...reminders].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [reminders])
  const addReminder = (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setReminders(current => [...current, { ...form, id: crypto.randomUUID(), title: form.title.trim(), note: form.note.trim() }])
    setForm({ title: '', note: '', date: new Date().toISOString().slice(0, 10), time: '09:00', timezone })
    setIsOpen(false)
  }
  const removeReminder = (id: string) => setReminders(current => current.filter(r => r.id !== id))
  const enableNotifications = async () => {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  return <main className="min-h-screen px-5 py-6 sm:px-8 sm:py-9 lg:px-12">
    <div className="mx-auto max-w-4xl">
      <header className="mb-14 flex items-center justify-between animate-rise">
        <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1c1b1a] text-white"><Bell size={17} strokeWidth={2.3}/></div><span className="text-lg font-semibold tracking-[-.03em]">remindly</span></div>
        <button onClick={() => setIsOpen(true)} className="hidden items-center gap-2 rounded-xl bg-[#1c1b1a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#343231] sm:flex"><Plus size={16}/> New reminder</button>
      </header>

      <section className="animate-rise" style={{ animationDelay: '70ms' }}>
        <p className="mb-3 font-mono text-xs text-[#77736e]">{zoneTime(timezone)} · {formatZone(timezone)}</p>
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Your reminders</h1>
            <p className="mt-2 text-[15px] text-[#77736e]">A calm place for the things you don’t want to forget.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">{notificationPermission !== 'granted' && <button onClick={enableNotifications} className="flex items-center gap-2 rounded-xl border border-[#e5e1dc] bg-white px-3 py-2 text-sm text-[#4c4945] shadow-[0_1px_2px_rgba(28,27,26,.03)] hover:bg-[#f8f6f3]"><BellRing size={15}/> Enable alerts</button>}<label className="relative flex items-center gap-2 rounded-xl border border-[#e5e1dc] bg-white px-3 py-2 text-sm text-[#4c4945] shadow-[0_1px_2px_rgba(28,27,26,.03)]"><Globe2 size={15}/><select value={timezone} onChange={e => setTimezone(e.target.value)} className="appearance-none bg-transparent pr-5 outline-none">{zones.map(zone => <option key={zone}>{zone}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3"/></label></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e7e3de] bg-white shadow-[0_8px_30px_rgba(35,30,25,.04)]">
          {sorted.length ? sorted.map((reminder, index) => 
          <article key={reminder.id} className="group flex gap-3 border-b border-[#eeeae6] px-5 py-5 last:border-0 sm:items-center sm:px-6">
            <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f3f1ef] text-[#77736e] sm:mt-0">
              <Clock3 size={16}/>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <h2 className="font-medium tracking-[-.02em]">{reminder.title}</h2>
                <span className="font-mono text-xs text-[#9b9690]">{formatDate(reminder.date)} · {reminder.time}</span>
              </div>
              {reminder.note && <p className="mt-1 truncate text-sm text-[#77736e]">{reminder.note}</p>}
            </div>
            <button aria-label={`Delete ${reminder.title}`} onClick={() => removeReminder(reminder.id)} className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#aaa49e] opacity-100 transition hover:bg-[#fdf0ed] hover:text-[#c24b36] sm:mt-0 sm:opacity-0 sm:group-hover:opacity-100">
              <Trash2 size={16}/>
            </button>
          </article>) 
          : 
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-[#f3f1ef] text-[#77736e]">
              <Bell size={18}/>
            </div>
            <p className="font-medium">Nothing scheduled</p>
            <p className="mt-1 text-sm text-[#77736e]">Add a reminder to get started.</p>
          </div>}
        </div>
      </section>

      {alert && <div role="alert" className="fixed bottom-5 left-5 right-5 z-10 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[#e7e3de] bg-white p-4 shadow-xl animate-rise sm:left-auto sm:right-8">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f3f1ef]">
          <BellRing size={16}/>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{alert.title}</p>
          <p className="mt-0.5 text-sm text-[#77736e]">{alert.note || 'It’s time for your reminder.'}</p>
          </div>
          <button onClick={() => setAlert(null)} aria-label="Dismiss reminder" className="text-[#77736e] hover:text-[#1c1b1a]">
            <X size={17}/>
          </button>
        </div>}
            
      <button onClick={() => setIsOpen(true)} className="fixed bottom-5 right-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#1c1b1a] text-white shadow-lg sm:hidden" aria-label="New reminder">
        <Plus size={22}/>
      </button>
      
      {isOpen && 
      <div className="fixed inset-0 z-20 grid place-items-center bg-[#1c1b1a]/25 p-4 backdrop-blur-[2px] sm:p-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl animate-rise sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-.04em]">New reminder</h2>
            <p className="mt-1 text-sm text-[#77736e]">It will be saved locally.</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[#77736e] hover:bg-[#f3f1ef]">
              <X size={18}/>
              </button>
              </div>
        <form onSubmit={addReminder} className="space-y-4">
        <label className="block text-sm font-medium">What do you need to remember?
          <input autoFocus required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Send the proposal" className="mt-1.5 w-full rounded-xl border border-[#e5e1dc] px-3.5 py-3 text-[15px] outline-none placeholder:text-[#aaa49e] focus:border-[#89837c]"/></label>
          <label className="block text-sm font-medium">Note 
          <span className="font-normal text-[#9b9690]">(optional)</span>
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Add a little context" className="mt-1.5 w-full rounded-xl border border-[#e5e1dc] px-3.5 py-3 text-[15px] outline-none placeholder:text-[#aaa49e] focus:border-[#89837c]"/></label>
          <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Date
          <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#e5e1dc] px-3 py-3 text-sm outline-none focus:border-[#89837c]"/></label>
          <label className="block text-sm font-medium">Time
            <input required type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#e5e1dc] px-3 py-3 text-sm outline-none focus:border-[#89837c]"/></label>
            </div>
          <label className="block text-sm font-medium">Time zone
          <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} className="mt-1.5 w-full rounded-xl border border-[#e5e1dc] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#89837c]">{zones.map(zone => <option key={zone} value={zone}>{formatZone(zone)}</option>)}
          </select>
          </label>
          <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c1b1a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#343231]">
            <Plus size={16}/> 
            Add reminder
            </button>
        </form>
        </div>
        </div>}
    </div>
  </main>
}
