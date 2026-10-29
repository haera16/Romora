import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, GraduationCap, Wallet, MapPin, Sparkles, ChevronDown, Heart, X, BadgeCheck } from 'lucide-react'
import { supabase } from '../supabaseClient' // change to `import supabase from ...` if yours is a default export
import diamond from '../assets/romora_diamond.svg'
import ProfileMenu from '../components/ProfileMenu'
import { refreshMyMatches } from '../lib/api'

// Every SVG in src/assets/avatars, keyed by file name: { rohan: '/src/assets/avatars/rohan.svg', ... }
const AVATARS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/avatars/*.svg', { eager: true, query: '?url', import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url])
)

const FOOD = { veg: 'Veg', non_veg: 'Non-veg', no_preference: 'Any food' }
const FURNISHING = { unfurnished: 'Unfurnished', semi_furnished: 'Semi-furnished', fully_furnished: 'Fully furnished' }
const MOVE_IN = { immediate: 'Moving in now', within_month: 'Within a month', flexible: 'Flexible' }

// How much of the candidate's budget range fits the range [my min, B] (0..1)
function overlapFrac(myMin, B, p) {
  const lo = Math.min(myMin, B)
  if (B - lo < 1) return B >= p.budget_min && B <= p.budget_max ? 1 : 0
  const ov = Math.max(0, Math.min(B, p.budget_max) - Math.max(lo, p.budget_min))
  return Math.min(1, ov / Math.min(B - lo, Math.max(p.budget_max - p.budget_min, 1)))
}

// 1 at the user's own budget; drops as the slider moves away from what fits this person
function budgetFactor(my, B, p) {
  if (p.budget_min == null) return 1
  const base = overlapFrac(my.min, my.max, p)
  return base <= 0 ? 1 : Math.min(1, overlapFrac(my.min, B, p) / base)
}

const MOVE_PHRASE = { immediate: 'plan to move in right away', within_month: 'plan to move in within a month', flexible: 'are both flexible on move-in' }
const GROUP_PHRASE = { solo: 'want a room of your own', two: 'want a two-person share', three_plus: 'are happy in a larger group' }

// Built only from facts both profiles actually share, so nothing is invented
function explainEstimate(mp, p, my, B) {
  if (!mp) return null
  const bits = []
  if (mp.preferred_locality && mp.preferred_locality === p.preferred_locality) bits.push(`both want to live in ${p.preferred_locality}`)
  if (mp.furnishing && mp.furnishing === p.furnishing) bits.push(`both prefer a ${FURNISHING[p.furnishing].toLowerCase()} place`)
  if (mp.move_in_timeline === p.move_in_timeline) bits.push(MOVE_PHRASE[p.move_in_timeline])
  if (mp.food_preference === p.food_preference && p.food_preference !== 'no_preference') bits.push(`both prefer ${FOOD[p.food_preference].toLowerCase()} food`)
  else if (mp.food_preference === 'no_preference' || p.food_preference === 'no_preference') bits.push('have compatible food habits')
  if (mp.group_size && mp.group_size === p.group_size) bits.push(GROUP_PHRASE[p.group_size])
  const lo = Math.max(my.min, p.budget_min), hi = Math.min(B, p.budget_max)
  if (hi >= lo) bits.push(`have budgets that overlap between ${money(lo)} and ${money(hi)}`)
  if (!bits.length) return null
  const list = bits.slice(0, 4)
  const text = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
  return `You two ${text}. This is an early estimate from your preferences; your full match will add more.`
}

// Same hard filters as matching.py: a pair failing any of these is never a match
function hardBlock(me, mp, person, p) {
  if (!mp || p.budget_min == null) return null
  const wants = (pref, g) => !pref || pref === 'any' || pref === g
  if (!wants(mp.preferred_roommate_gender, person.gender) || !wants(p.preferred_roommate_gender, me.gender)) return 'roommate gender preference'
  if (!(mp.budget_min <= p.budget_max && p.budget_min <= mp.budget_max)) return 'budgets do not overlap'
  const ta = mp.move_in_timeline, tb = p.move_in_timeline
  if (!(ta === tb || ta === 'flexible' || tb === 'flexible')) return 'move-in timing'
  return null
}

// Quick in-browser estimate for people the Python matcher hasn't scored yet (e.g. a brand-new profile)
function estimate(me, mp, person, p, my, B) {
  if (!mp || p.budget_min == null) return null
  const wants = (pref, g) => !pref || pref === 'any' || pref === g
  if (!wants(mp.preferred_roommate_gender, person.gender) || !wants(p.preferred_roommate_gender, me.gender)) return null
  const bf = overlapFrac(my.min, B, p)
  if (bf <= 0) return null
  const same = (a, b) => (a && a === b ? 1 : 0)
  const food = mp.food_preference === 'no_preference' || p.food_preference === 'no_preference' ? 0.7 : same(mp.food_preference, p.food_preference)
  const move = mp.move_in_timeline === p.move_in_timeline ? 1 : mp.move_in_timeline === 'flexible' || p.move_in_timeline === 'flexible' ? 0.7 : 0.2
  return Math.round(100 * (0.35 * bf + 0.2 * food + 0.15 * same(mp.furnishing, p.furnishing) + 0.15 * move + 0.05 * same(mp.group_size, p.group_size) + 0.1 * same(mp.preferred_locality, p.preferred_locality)))
}

const toPct = (s) => Math.round(s <= 1 ? s * 100 : s)
const money = (n) => (n == null ? '' : `₹${Number(n).toLocaleString('en-IN')}`)

// match_reasons shape isn't known, so this accepts a list of strings or an object of numeric scores.
function parseReasons(r) {
  if (!r) return { bars: [], chips: [] }
  if (Array.isArray(r)) {
    return { bars: [], chips: r.map((x) => (typeof x === 'string' ? x : x?.label || x?.reason)).filter(Boolean) }
  }
  if (typeof r === 'object') {
    const bars = Object.entries(r)
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => ({ label: k.replace(/_/g, ' '), pct: Math.round(v <= 1 ? v * 100 : v) }))
    return { bars, chips: [] }
  }
  return { bars: [], chips: [] }
}

function Avatar({ person, size = 'h-20 w-20 rounded-2xl' }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className={`flex ${size} shrink-0 items-end justify-center overflow-hidden bg-[#EAFBF2] ring-1 ring-[#bccabc]`}>
      {broken || !AVATARS[person.avatar_seed] ? (
        <span className="self-center text-2xl font-extrabold text-[#006d3b]">{person.full_name?.[0]}</span>
      ) : (
        <img src={AVATARS[person.avatar_seed]} alt="" className="h-full w-full object-cover object-top" onError={() => setBroken(true)} />
      )}
    </div>
  )
}

function Card({ row, sent, likesYou, mutual, onHello, onMessage, top, verified }) {
  const [open, setOpen] = useState(false)
  const { person, prefs, score, why, reasons } = row
  const { bars, chips } = parseReasons(reasons)

  return (
    <article className="rounded-3xl border border-[#deece2] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] sm:p-8">
      <div className="flex gap-5">
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-extrabold tracking-tight text-[#121e18]">{person.full_name}</h3>
            {/* Badge shows only when this person's roll number passed ID verification at sign-up */}
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAFBF2] px-2.5 py-0.5 text-xs font-bold text-[#006d3b]">
                <BadgeCheck size={14} /> Verified
              </span>
            )}
            {top && <span className="rounded-full bg-[#006d3b] px-3 py-0.5 text-xs font-bold text-white">★ Top match</span>}
            {likesYou && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f3df9d] px-3 py-0.5 text-xs font-bold text-[#70622c]">
                <Heart size={12} fill="currentColor" /> Likes you
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-[#3d4a3f]">
            <span className="flex items-center gap-1.5"><GraduationCap size={16} /> {person.branch}, Year {person.year_of_study}</span>
            {prefs.budget_min != null && <span className="flex items-center gap-1.5"><Wallet size={16} /> {money(prefs.budget_min)} – {money(prefs.budget_max)}</span>}
            {prefs.preferred_locality && <span className="flex items-center gap-1.5"><MapPin size={16} /> {prefs.preferred_locality}</span>}
          </div>
        </div>
        {score != null && (
          <div className="flex h-fit shrink-0 items-center gap-1.5 rounded-full bg-[#f3df9d] px-3 py-1 text-sm font-extrabold text-[#70622c]">
            <img src={diamond} alt="" className="h-5 w-3" />
            {row.estimated ? '~' : ''}{score}%
          </div>
        )}
        {score == null && row.note && (
          <div className="h-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{row.note}</div>
        )}
      </div>

      {why && (
        <div className="mt-5 rounded-2xl bg-[#EAFBF2]/70 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-[#3d4a3f]/70"><Sparkles size={14} /> {row.estimated ? 'Why you might match' : 'Why you match'}</div>
          <p className="text-[15px] italic leading-6 text-[#3d4a3f]">{why}</p>
        </div>
      )}

      {open && (bars.length > 0 || chips.length > 0) && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex justify-between text-xs font-bold capitalize text-[#3d4a3f]"><span>{b.label}</span><span>{b.pct}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-[#deece2]"><div className="h-full rounded-full bg-[#006d3b]" style={{ width: `${b.pct}%` }} /></div>
            </div>
          ))}
          {chips.map((c) => (
            <span key={c} className="w-fit rounded-full bg-[#d2e5f1] px-3 py-1 text-xs font-bold capitalize text-[#0a1e26]">{c}</span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#3d4a3f]">
          {prefs.food_preference && <span className="rounded-full bg-[#EAFBF2] px-3 py-1">{FOOD[prefs.food_preference]}</span>}
          {prefs.furnishing && <span className="rounded-full bg-[#EAFBF2] px-3 py-1">{FURNISHING[prefs.furnishing]}</span>}
          {prefs.move_in_timeline && <span className="rounded-full bg-[#EAFBF2] px-3 py-1">{MOVE_IN[prefs.move_in_timeline]}</span>}
          {(bars.length > 0 || chips.length > 0) && (
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 px-2 text-[#006d3b] hover:underline">
              Details <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
        {mutual ? (
          <button
            onClick={onMessage}
            className="rounded-full bg-[#006d3b] px-7 py-2.5 text-sm font-bold text-white shadow-md shadow-[#006d3b]/10 transition hover:scale-105 active:scale-95"
          >
            Message
          </button>
        ) : (
          <button
            onClick={onHello}
            disabled={sent}
            className="rounded-full bg-[#006d3b] px-7 py-2.5 text-sm font-bold text-white shadow-md shadow-[#006d3b]/10 transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:bg-[#deece2] disabled:text-[#3d4a3f] disabled:shadow-none"
          >
            {sent ? 'Hello sent' : likesYou ? 'Say hello back' : 'Say hello'}
          </button>
        )}
      </div>
    </article>
  )
}

// roll_number is selected so the card can check it against the verified list
const SELECT = `id, match_score, match_reasons, ai_explanation,
  a:student_profiles!profile_a_id(id, roll_number, full_name, branch, year_of_study, avatar_seed, preferences(*)),
  b:student_profiles!profile_b_id(id, roll_number, full_name, branch, year_of_study, avatar_seed, preferences(*))`

export default function Explore() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [rows, setRows] = useState([])
  const [sent, setSent] = useState(new Set())
  const [received, setReceived] = useState(new Set())
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [mutual, setMutual] = useState(null)
  const [q, setQ] = useState('')
  const [maxBudget, setMaxBudget] = useState(20000)
  const [myBudget, setMyBudget] = useState({ min: 5000, max: 20000 })
  const [locality, setLocality] = useState('all')
  const [food, setFood] = useState('all')
  const [view, setView] = useState('best')
  const [others, setOthers] = useState([])
  const [verifiedRolls, setVerifiedRolls] = useState(new Set()) // roll numbers that passed ID verification

  // Latest "sent" set for the realtime handler below (avoids a stale closure)
  const sentRef = useRef(sent)
  useEffect(() => { sentRef.current = sent }, [sent])

  useEffect(() => {
    let ignore = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Log in to see your matches.'); setStatus('error'); return }
      const { data: mine, error: e1 } = await supabase.from('student_profiles').select('id, full_name, avatar_seed, gender, preferences(*)').eq('user_id', user.id).maybeSingle()
      if (e1 || !mine) { setError('Create your profile first to see matches.'); setStatus('error'); return }

      const [m, l, o, v, h] = await Promise.all([
        supabase.from('matches').select(SELECT).or(`profile_a_id.eq.${mine.id},profile_b_id.eq.${mine.id}`),
        supabase.from('likes').select('liker_profile_id, liked_profile_id').or(`liker_profile_id.eq.${mine.id},liked_profile_id.eq.${mine.id}`),
        supabase.from('student_profiles').select('id, roll_number, full_name, branch, year_of_study, avatar_seed, gender, preferences(*)').neq('id', mine.id),
        supabase.from('verified_ids').select('roll_number'),
        supabase.from('hidden_profiles').select('profile_id'), // profiles hidden after repeated reports
      ])
      if (ignore) return
      if (m.error) { setError(m.error.message); setStatus('error'); return }

      const hidden = new Set((h.data || []).map((x) => x.profile_id))

      // No stored matches yet (new profile)? Ask the backend to score this user now, then read again.
      let matchData = m.data
      if ((matchData || []).length === 0 && (await refreshMyMatches())) {
        const again = await supabase.from('matches').select(SELECT).or(`profile_a_id.eq.${mine.id},profile_b_id.eq.${mine.id}`)
        matchData = again.data
        if (ignore) return
      }

      const list = (matchData || []).map((r) => {
        const person = r.a?.id === mine.id ? r.b : r.a
        const p = Array.isArray(person?.preferences) ? person.preferences[0] : person?.preferences
        return { id: r.id, person, prefs: p || {}, score: toPct(r.match_score), why: r.ai_explanation, reasons: r.match_reasons }
      }).filter((r) => r.person && !hidden.has(r.person.id)).sort((x, y) => y.score - x.score)

      const likes = l.data || []
      const matched = new Set(list.map((r) => r.person.id))
      setOthers((o.data || []).filter((p) => !matched.has(p.id) && !hidden.has(p.id)).map((p) => ({
        id: `p-${p.id}`, person: p, score: null,
        prefs: (Array.isArray(p.preferences) ? p.preferences[0] : p.preferences) || {},
      })))
      const mp = Array.isArray(mine.preferences) ? mine.preferences[0] : mine.preferences
      if (mp?.budget_max) { setMyBudget({ min: mp.budget_min, max: mp.budget_max }); setMaxBudget(mp.budget_max) }
      setVerifiedRolls(new Set((v.data || []).map((x) => String(x.roll_number).toUpperCase())))
      setMe(mine)
      setRows(list)
      setSent(new Set(likes.filter((x) => x.liker_profile_id === mine.id).map((x) => x.liked_profile_id)))
      setReceived(new Set(likes.filter((x) => x.liked_profile_id === mine.id).map((x) => x.liker_profile_id)))
      setStatus('ready')
    }
    load()
    return () => { ignore = true }
  }, [])

  // Live: when someone likes me, update instantly. If I had already liked them, it's a match.
  useEffect(() => {
    if (!me) return
    const channel = supabase
      .channel('explore-likes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, async ({ new: like }) => {
        if (like.liked_profile_id !== me.id) return
        setReceived((prev) => new Set(prev).add(like.liker_profile_id))
        if (sentRef.current.has(like.liker_profile_id)) {
          const { data } = await supabase
            .from('student_profiles')
            .select('id, full_name, avatar_seed')
            .eq('id', like.liker_profile_id)
            .maybeSingle()
          if (data) setMutual(data)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [me])

  // Explanations are written a few seconds after scores; pick them up as they arrive
  useEffect(() => {
    if (status !== 'ready') return
    const missing = rows.filter((r) => !r.why).map((r) => r.id)
    if (!missing.length) return
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      const { data } = await supabase.from('matches').select('id, ai_explanation').in('id', missing)
      const got = new Map((data || []).filter((x) => x.ai_explanation).map((x) => [x.id, x.ai_explanation]))
      if (got.size) setRows((rs) => rs.map((r) => (got.has(r.id) ? { ...r, why: got.get(r.id) } : r)))
      if (tries >= 15 || got.size === missing.length) clearInterval(timer)
    }, 4000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, rows.length])

  async function sayHello(row) {
    const { error: err } = await supabase.from('likes').insert({ liker_profile_id: me.id, liked_profile_id: row.person.id })
    if (err && err.code !== '23505') { alert(err.message); return }
    setSent((s) => new Set(s).add(row.person.id))
    if (received.has(row.person.id)) setMutual(row.person)
  }

  const localities = useMemo(() => [...new Set(rows.map((r) => r.prefs.preferred_locality).filter(Boolean))].sort(), [rows])
  const myPrefs = Array.isArray(me?.preferences) ? me.preferences[0] : me?.preferences
  const adjusted = useMemo(
    () => rows.map((r) => ({ ...r, score: Math.round(r.score * (0.5 + 0.5 * budgetFactor(myBudget, maxBudget, r.prefs))) })),
    [rows, myBudget, maxBudget]
  )
  const estimated = useMemo(
    () => others.map((r) => {
      const blocked = me ? hardBlock(me, myPrefs, r.person, r.prefs) : null
      // Estimate only while the matcher has not scored this user yet. Otherwise anyone without a
      // stored match is simply not compatible, and gets no percentage.
      const sc = me && !blocked && rows.length === 0 ? estimate(me, myPrefs, r.person, r.prefs, myBudget, maxBudget) : null
      const note = blocked ? `Not compatible: ${blocked}` : sc != null ? null : rows.length === 0 ? 'Outside your budget' : 'Not scored yet'
      return { ...r, score: sc, note, estimated: sc != null, why: sc != null ? explainEstimate(myPrefs, r.prefs, myBudget, maxBudget) : null }
    }),
    [others, rows.length, me, myPrefs, myBudget, maxBudget]
  )
  const byScore = (a, b) => (b.score ?? -1) - (a.score ?? -1) || a.person.full_name.localeCompare(b.person.full_name)
  const noStored = rows.length === 0
  const bestList = (noStored ? estimated.filter((r) => r.score != null) : [...adjusted]).sort(byScore)
  const pool = view === 'everyone' ? [...adjusted, ...estimated].sort(byScore) : bestList
  const shown = pool.filter((r) => {
    const text = `${r.person.full_name} ${r.person.branch} ${r.prefs.preferred_locality || ''}`.toLowerCase()
    return text.includes(q.toLowerCase())
      && (r.prefs.budget_min == null || (r.prefs.budget_min <= maxBudget && r.prefs.budget_max >= Math.min(myBudget.min, maxBudget)))
      && (locality === 'all' || r.prefs.preferred_locality === locality)
      && (food === 'all' || r.prefs.food_preference === food)
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const likesYouCount = rows.filter((r) => received.has(r.person.id) && !sent.has(r.person.id)).length
  const chip = (active) => `rounded-full px-4 py-1.5 text-sm font-bold transition ${active ? 'bg-[#006d3b] text-white' : 'bg-[#d8e6dd] text-[#3d4a3f] hover:bg-[#bccabc]/50'}`

  return (
    <div className="min-h-screen bg-[#FFFDF8] font-['Nunito_Sans',sans-serif] text-[#121e18]">
      <header className="sticky top-0 z-30 border-b border-[#bccabc]/20 bg-[#FFFDF8]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-5 sm:px-10">
          <img src={diamond} alt="" className="h-7 w-4" />
          <span className="text-xl font-black tracking-tight text-[#006d3b]">Romora</span>
          <nav className="ml-8 flex gap-6 text-sm font-bold">
            <button className="border-b-2 border-[#006d3b] pb-1 text-[#006d3b]">Explore</button>
            <button onClick={() => navigate('/messages')} className="pb-1 text-[#3d4a3f] hover:text-[#121e18]">Messages</button>
          </nav>
          <div className="ml-auto">{me && <ProfileMenu avatarSrc={AVATARS[me.avatar_seed]} name={me.full_name} />}</div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-6 px-5 py-8 sm:px-10 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-3xl bg-[#e9f7ee] p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold text-[#006d3b]">Filters</h2>
          <div className="mt-5 flex flex-col gap-6">
            <label className="flex flex-col gap-2 text-sm font-bold text-[#3d4a3f]">
              <span className="flex justify-between">Budget up to <span>{money(maxBudget)}</span></span>
              <input type="range" min={Math.min(4000, myBudget.min)} max={Math.max(20000, myBudget.max)} step="500" value={maxBudget} onChange={(e) => setMaxBudget(+e.target.value)} className="accent-[#006d3b]" />
              <span className="text-xs font-semibold text-[#3d4a3f]/70">Your budget: {money(myBudget.min)} – {money(myBudget.max)}. Match % shifts as you move this.</span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-[#3d4a3f]">
              Locality
              <select value={locality} onChange={(e) => setLocality(e.target.value)} className="rounded-2xl bg-white px-4 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#006d3b]">
                <option value="all">Anywhere</option>
                {localities.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-2 text-sm font-bold text-[#3d4a3f]">
              Food
              <div className="flex flex-wrap gap-2">
                {[['all', 'All'], ...Object.entries(FOOD)].map(([k, v]) => (
                  <button key={k} onClick={() => setFood(k)} className={chip(food === k)}>{v}</button>
                ))}
              </div>
            </div>
            <button onClick={() => { setMaxBudget(myBudget.max); setLocality('all'); setFood('all'); setQ('') }} className="w-fit text-sm font-bold text-[#006d3b] hover:underline">Reset filters</button>
          </div>
        </aside>

        <section className="min-w-0 max-w-[840px]">
          <h1 className="text-3xl font-extrabold tracking-tight">{greeting}{me ? `, ${me.full_name.split(' ')[0]}` : ''} 👋</h1>
          <div className="relative mt-5">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#006d3b]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, branch or locality" className="w-full rounded-2xl border border-[#bccabc]/40 bg-white py-3.5 pl-13 pr-5 font-semibold outline-none placeholder:text-[#3d4a3f]/50 focus:border-[#006d3b] focus:ring-2 focus:ring-[#006d3b]/20" style={{ paddingLeft: '3.25rem' }} />
          </div>

          <div className="mt-6 flex gap-8 border-b border-[#bccabc]/30">
            {[['best', 'Best match'], ['everyone', 'Everyone']].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className={`-mb-px pb-3 font-bold ${view === k ? 'border-b-2 border-[#006d3b] text-[#006d3b]' : 'text-[#3d4a3f] hover:text-[#121e18]'}`}>{l}</button>
            ))}
          </div>

          {status === 'ready' && (
            <div className="mt-5 rounded-2xl border border-[#006d3b]/10 bg-[#EAFBF2] px-5 py-4 text-[15px] font-semibold text-[#3d4a3f]">
              <Sparkles size={16} className="mr-2 inline text-[#006d3b]" />
              {noStored ? <>We're still computing your full matches, so these are <b className="text-[#006d3b]">{bestList.length} estimated matches</b></> : <>You have <b className="text-[#006d3b]">{rows.length} compatible roommates</b></>}
              {likesYouCount > 0 && <>, and <b className="text-[#006d3b]">{likesYouCount} already liked you</b></>}.
              {shown.length !== pool.length && <> Showing <b className="text-[#006d3b]">{shown.length}</b> with your filters.</>}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-5">
            {status === 'loading' && <p className="py-16 text-center font-semibold text-[#3d4a3f]">Finding your matches…</p>}
            {status === 'error' && <p className="rounded-2xl bg-[#ffdad6] p-5 font-semibold text-[#93000a]">{error}</p>}
            {status === 'ready' && shown.length === 0 && (
              <p className="py-16 text-center font-semibold text-[#3d4a3f]">No one fits these filters. Try raising your budget or resetting them.</p>
            )}
            {shown.map((r, i) => (
              <Card
                key={r.id}
                row={r}
                top={view === 'best' && i === 0 && r.score != null}
                sent={sent.has(r.person.id)}
                likesYou={received.has(r.person.id)}
                mutual={sent.has(r.person.id) && received.has(r.person.id)}
                verified={verifiedRolls.has(String(r.person.roll_number || '').toUpperCase())}
                onHello={() => sayHello(r)}
                onMessage={() => navigate('/messages')}
              />
            ))}
          </div>
        </section>
      </main>

      {mutual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121e18]/50 p-5" onClick={() => setMutual(null)}>
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMutual(null)} aria-label="Close" className="absolute right-4 top-4 text-[#3d4a3f]"><X size={20} /></button>
            <div className="mx-auto flex w-fit"><Avatar person={mutual} /></div>
            <img src={diamond} alt="" className="mx-auto mt-5 h-10 w-6" />
            <h2 className="mt-3 text-2xl font-extrabold">It's a match!</h2>
            <p className="mt-1 font-semibold text-[#3d4a3f]">You and {mutual.full_name} said hello to each other.</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => { setMutual(null); navigate('/messages') }} className="rounded-full bg-[#006d3b] px-6 py-2.5 font-bold text-white">Send a message</button>
              <button onClick={() => setMutual(null)} className="rounded-full bg-[#deece2] px-6 py-2.5 font-bold text-[#3d4a3f]">Later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}