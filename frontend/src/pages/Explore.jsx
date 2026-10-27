import { useEffect, useMemo, useState } from 'react'
import { Search, GraduationCap, Wallet, MapPin, Sparkles, ChevronDown, Heart, X } from 'lucide-react'
import { supabase } from '../supabaseClient' // change to `import supabase from ...` if yours is a default export
import diamond from '../assets/romora_diamond.svg'
import ProfileMenu from '../components/ProfileMenu'

// Every SVG in src/assets/avatars, keyed by file name: { rohan: '/src/assets/avatars/rohan.svg', ... }
const AVATARS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/avatars/*.svg', { eager: true, query: '?url', import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url])
)

const FOOD = { veg: 'Veg', non_veg: 'Non-veg', no_preference: 'Any food' }
const FURNISHING = { unfurnished: 'Unfurnished', semi_furnished: 'Semi-furnished', fully_furnished: 'Fully furnished' }
const MOVE_IN = { immediate: 'Moving in now', within_month: 'Within a month', flexible: 'Flexible' }

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

function Card({ row, sent, likesYou, onHello }) {
  const [open, setOpen] = useState(false)
  const { person, prefs, score, why, reasons } = row
  const { bars, chips } = parseReasons(reasons)
  const superMatch = score >= 90

  return (
    <article className="rounded-3xl border border-[#deece2] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] sm:p-8">
      <div className="flex gap-5">
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-extrabold tracking-tight text-[#121e18]">{person.full_name}</h3>
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
            {superMatch && <img src={diamond} alt="Super match" className="h-5 w-3" />}
            {score}%
          </div>
        )}
      </div>

      {why && (
        <div className="mt-5 rounded-2xl bg-[#EAFBF2]/70 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-[#3d4a3f]/70"><Sparkles size={14} /> Why you match</div>
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
        <button
          onClick={onHello}
          disabled={sent}
          className="rounded-full bg-[#006d3b] px-7 py-2.5 text-sm font-bold text-white shadow-md shadow-[#006d3b]/10 transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:bg-[#deece2] disabled:text-[#3d4a3f] disabled:shadow-none"
        >
          {sent ? 'Hello sent' : likesYou ? 'Say hello back' : 'Say hello'}
        </button>
      </div>
    </article>
  )
}

const SELECT = `id, match_score, match_reasons, ai_explanation,
  a:student_profiles!profile_a_id(id, full_name, branch, year_of_study, avatar_seed, preferences(*)),
  b:student_profiles!profile_b_id(id, full_name, branch, year_of_study, avatar_seed, preferences(*))`

export default function Explore() {
  const [me, setMe] = useState(null)
  const [rows, setRows] = useState([])
  const [sent, setSent] = useState(new Set())
  const [received, setReceived] = useState(new Set())
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [mutual, setMutual] = useState(null)
  const [q, setQ] = useState('')
  const [maxBudget, setMaxBudget] = useState(20000)
  const [locality, setLocality] = useState('all')
  const [food, setFood] = useState('all')
  const [view, setView] = useState('best')
  const [others, setOthers] = useState([])

  useEffect(() => {
    let ignore = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Log in to see your matches.'); setStatus('error'); return }
      const { data: mine, error: e1 } = await supabase.from('student_profiles').select('id, full_name, avatar_seed').eq('user_id', user.id).maybeSingle()
      if (e1 || !mine) { setError('Create your profile first to see matches.'); setStatus('error'); return }

      const [m, l, o] = await Promise.all([
        supabase.from('matches').select(SELECT).or(`profile_a_id.eq.${mine.id},profile_b_id.eq.${mine.id}`),
        supabase.from('likes').select('liker_profile_id, liked_profile_id').or(`liker_profile_id.eq.${mine.id},liked_profile_id.eq.${mine.id}`),
        supabase.from('student_profiles').select('id, full_name, branch, year_of_study, avatar_seed, preferences(*)').neq('id', mine.id),
      ])
      if (ignore) return
      if (m.error) { setError(m.error.message); setStatus('error'); return }

      const list = (m.data || []).map((r) => {
        const person = r.a?.id === mine.id ? r.b : r.a
        const p = Array.isArray(person?.preferences) ? person.preferences[0] : person?.preferences
        return { id: r.id, person, prefs: p || {}, score: toPct(r.match_score), why: r.ai_explanation, reasons: r.match_reasons }
      }).filter((r) => r.person).sort((x, y) => y.score - x.score)

      const likes = l.data || []
      const matched = new Set(list.map((r) => r.person.id))
      setOthers((o.data || []).filter((p) => !matched.has(p.id)).map((p) => ({
        id: `p-${p.id}`, person: p, score: null,
        prefs: (Array.isArray(p.preferences) ? p.preferences[0] : p.preferences) || {},
      })))
      setMe(mine)
      setRows(list)
      setSent(new Set(likes.filter((x) => x.liker_profile_id === mine.id).map((x) => x.liked_profile_id)))
      setReceived(new Set(likes.filter((x) => x.liked_profile_id === mine.id).map((x) => x.liker_profile_id)))
      setStatus('ready')
    }
    load()
    return () => { ignore = true }
  }, [])

  async function sayHello(row) {
    const { error: err } = await supabase.from('likes').insert({ liker_profile_id: me.id, liked_profile_id: row.person.id })
    if (err && err.code !== '23505') { alert(err.message); return }
    setSent((s) => new Set(s).add(row.person.id))
    if (received.has(row.person.id)) setMutual(row.person)
  }

  const localities = useMemo(() => [...new Set(rows.map((r) => r.prefs.preferred_locality).filter(Boolean))].sort(), [rows])
  const pool = view === 'everyone'
    ? [...rows, ...[...others].sort((x, y) => x.person.full_name.localeCompare(y.person.full_name))]
    : view === 'mutual'
      ? [...rows, ...others].filter((r) => sent.has(r.person.id) && received.has(r.person.id))
      : rows
  const shown = pool.filter((r) => {
    const text = `${r.person.full_name} ${r.person.branch} ${r.prefs.preferred_locality || ''}`.toLowerCase()
    return text.includes(q.toLowerCase())
      && (r.prefs.budget_min ?? 0) <= maxBudget
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
            {[['best', 'Explore'], ['mutual', 'Matches']].map(([k, l]) => {
              const active = k === 'mutual' ? view === 'mutual' : view !== 'mutual'
              return (
                <button key={k} onClick={() => setView(k)} className={`pb-1 ${active ? 'border-b-2 border-[#006d3b] text-[#006d3b]' : 'text-[#3d4a3f] hover:text-[#121e18]'}`}>{l}</button>
              )
            })}
          </nav>
          <div className="ml-auto">{me && <ProfileMenu avatarSrc={AVATARS[me.avatar_seed]} name={me.full_name} />}</div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-6 px-5 py-8 sm:px-10 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-3xl bg-[#e9f7ee] p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold text-[#006d3b]">Filters</h2>
          <div className="mt-5 flex flex-col gap-6">
            <label className="flex flex-col gap-2 text-sm font-bold text-[#3d4a3f]">
              <span className="flex justify-between">Max budget <span>{money(maxBudget)}</span></span>
              <input type="range" min="5000" max="20000" step="500" value={maxBudget} onChange={(e) => setMaxBudget(+e.target.value)} className="accent-[#006d3b]" />
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
            <button onClick={() => { setMaxBudget(20000); setLocality('all'); setFood('all'); setQ('') }} className="w-fit text-sm font-bold text-[#006d3b] hover:underline">Reset filters</button>
          </div>
        </aside>

        <section className="min-w-0 max-w-[840px]">
          <h1 className="text-3xl font-extrabold tracking-tight">{greeting}{me ? `, ${me.full_name.split(' ')[0]}` : ''} 👋</h1>
          <div className="relative mt-5">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#006d3b]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, branch or locality" className="w-full rounded-2xl border border-[#bccabc]/40 bg-white py-3.5 pl-13 pr-5 font-semibold outline-none placeholder:text-[#3d4a3f]/50 focus:border-[#006d3b] focus:ring-2 focus:ring-[#006d3b]/20" style={{ paddingLeft: '3.25rem' }} />
          </div>

          {view !== 'mutual' && (
            <div className="mt-6 flex gap-8 border-b border-[#bccabc]/30">
              {[['best', 'Best match'], ['everyone', 'Everyone']].map(([k, l]) => (
                <button key={k} onClick={() => setView(k)} className={`-mb-px pb-3 font-bold ${view === k ? 'border-b-2 border-[#006d3b] text-[#006d3b]' : 'text-[#3d4a3f] hover:text-[#121e18]'}`}>{l}</button>
              ))}
            </div>
          )}

          {status === 'ready' && (
            <div className="mt-5 rounded-2xl border border-[#006d3b]/10 bg-[#EAFBF2] px-5 py-4 text-[15px] font-semibold text-[#3d4a3f]">
              <Sparkles size={16} className="mr-2 inline text-[#006d3b]" />
              You have <b className="text-[#006d3b]">{rows.length} compatible roommates</b>
              {likesYouCount > 0 && <>, and <b className="text-[#006d3b]">{likesYouCount} already liked you</b></>}.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-5">
            {status === 'loading' && <p className="py-16 text-center font-semibold text-[#3d4a3f]">Finding your matches…</p>}
            {status === 'error' && <p className="rounded-2xl bg-[#ffdad6] p-5 font-semibold text-[#93000a]">{error}</p>}
            {status === 'ready' && shown.length === 0 && (
              <p className="py-16 text-center font-semibold text-[#3d4a3f]">{view === 'mutual' ? 'No mutual matches yet. Say hello to someone who already liked you.' : 'No one fits these filters. Try raising your budget or resetting them.'}</p>
            )}
            {shown.map((r) => (
              <Card key={r.id} row={r} sent={sent.has(r.person.id)} likesYou={received.has(r.person.id)} onHello={() => sayHello(r)} />
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
            <button onClick={() => setMutual(null)} className="mt-6 rounded-full bg-[#006d3b] px-8 py-2.5 font-bold text-white">Keep exploring</button>
          </div>
        </div>
      )}
    </div>
  )
}