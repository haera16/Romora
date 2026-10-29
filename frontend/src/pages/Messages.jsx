import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck } from 'lucide-react'
import { supabase } from '../supabaseClient' // change to `import supabase from ...` if yours is a default export
import diamond from '../assets/romora_diamond.svg'
import ProfileMenu from '../components/ProfileMenu'
import Chat from '../components/Chat'
import ReportButton from '../components/ReportButton'

const AVATARS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/avatars/*.svg', { eager: true, query: '?url', import: 'default' }))
    .map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url])
)

function Avatar({ person, size = 'h-12 w-12 rounded-xl' }) {
  const src = AVATARS[person.avatar_seed]
  return (
    <div className={`flex ${size} shrink-0 items-end justify-center overflow-hidden bg-[#EAFBF2] ring-1 ring-[#bccabc]`}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <span className="self-center text-lg font-extrabold text-[#006d3b]">{person.full_name?.[0]}</span>
      )}
    </div>
  )
}

export default function Messages() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [partners, setPartners] = useState([]) // mutual matches, as profile rows
  const [last, setLast] = useState({}) // partner id -> latest message
  const [verifiedRolls, setVerifiedRolls] = useState(new Set())
  const [activeId, setActiveId] = useState(null)
  const [status, setStatus] = useState('loading')

  // Mutual likes = people I liked who also liked me
  const loadPartners = useCallback(async (myId) => {
    const { data: likes } = await supabase
      .from('likes')
      .select('liker_profile_id, liked_profile_id')
      .or(`liker_profile_id.eq.${myId},liked_profile_id.eq.${myId}`)
    const sent = new Set((likes || []).filter((x) => x.liker_profile_id === myId).map((x) => x.liked_profile_id))
    const received = new Set((likes || []).filter((x) => x.liked_profile_id === myId).map((x) => x.liker_profile_id))
    const ids = [...sent].filter((id) => received.has(id))
    if (!ids.length) { setPartners([]); return }
    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('id, roll_number, full_name, branch, year_of_study, avatar_seed')
      .in('id', ids)
    setPartners(profiles || [])
  }, [])

  useEffect(() => {
    let ignore = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('error'); return }
      const { data: mine } = await supabase.from('student_profiles').select('id, full_name, avatar_seed').eq('user_id', user.id).maybeSingle()
      if (!mine) { setStatus('error'); return }

      const [msgs, v] = await Promise.all([
        supabase.from('messages').select('*')
          .or(`sender_profile_id.eq.${mine.id},recipient_profile_id.eq.${mine.id}`)
          .order('created_at', { ascending: false }).limit(500),
        supabase.from('verified_ids').select('roll_number'),
      ])
      if (ignore) return

      const latest = {}
      for (const m of msgs.data || []) {
        const other = m.sender_profile_id === mine.id ? m.recipient_profile_id : m.sender_profile_id
        if (!latest[other]) latest[other] = m // rows are newest first
      }
      setLast(latest)
      setVerifiedRolls(new Set((v.data || []).map((x) => String(x.roll_number).toUpperCase())))
      await loadPartners(mine.id)
      if (ignore) return
      setMe(mine)
      setStatus('ready')
    }
    load()
    return () => { ignore = true }
  }, [loadPartners])

  // Live: a new like can create a match, a new message updates the preview and ordering
  useEffect(() => {
    if (!me) return
    const channel = supabase
      .channel('messages-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, () => loadPartners(me.id))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
        if (m.sender_profile_id !== me.id && m.recipient_profile_id !== me.id) return
        const other = m.sender_profile_id === me.id ? m.recipient_profile_id : m.sender_profile_id
        setLast((prev) => ({ ...prev, [other]: m }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [me, loadPartners])

  const sorted = useMemo(
    () => [...partners].sort((a, b) => {
      const ta = last[a.id]?.created_at, tb = last[b.id]?.created_at
      if (ta && tb) return tb.localeCompare(ta)
      if (ta) return -1
      if (tb) return 1
      return a.full_name.localeCompare(b.full_name)
    }),
    [partners, last]
  )
  const active = partners.find((p) => p.id === activeId) || null

  return (
    <div className="min-h-screen bg-[#FFFDF8] font-['Nunito_Sans',sans-serif] text-[#121e18]">
      <header className="sticky top-0 z-30 border-b border-[#bccabc]/20 bg-[#FFFDF8]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-5 sm:px-10">
          <img src={diamond} alt="" className="h-7 w-4" />
          <span className="text-xl font-black tracking-tight text-[#006d3b]">Romora</span>
          <nav className="ml-8 flex gap-6 text-sm font-bold">
            <button onClick={() => navigate('/explore')} className="pb-1 text-[#3d4a3f] hover:text-[#121e18]">Explore</button>
            <button className="border-b-2 border-[#006d3b] pb-1 text-[#006d3b]">Messages</button>
          </nav>
          <div className="ml-auto">{me && <ProfileMenu avatarSrc={AVATARS[me.avatar_seed]} name={me.full_name} />}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-10">
        {status === 'loading' && <p className="py-16 text-center font-semibold text-[#3d4a3f]">Loading your matches…</p>}
        {status === 'error' && <p className="rounded-2xl bg-[#ffdad6] p-5 font-semibold text-[#93000a]">Log in and create your profile to see messages.</p>}

        {status === 'ready' && (
          <div className="grid gap-5 md:grid-cols-[320px_1fr]">
            {/* Matches list */}
            <aside className={`${active ? 'hidden md:block' : ''} h-fit rounded-3xl border border-[#deece2] bg-white p-3`}>
              <h1 className="px-3 pb-2 pt-3 text-lg font-extrabold text-[#006d3b]">Your matches</h1>
              {sorted.length === 0 && (
                <p className="px-3 py-8 text-center text-sm font-semibold text-[#3d4a3f]/80">
                  No matches yet. When you and someone else say hello to each other, they show up here.
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {sorted.map((p) => {
                  const m = last[p.id]
                  const mine = m?.sender_profile_id === me.id
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setActiveId(p.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${p.id === activeId ? 'bg-[#EAFBF2]' : 'hover:bg-[#EAFBF2]/60'}`}
                      >
                        <Avatar person={p} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-extrabold">{p.full_name}</span>
                            {verifiedRolls.has(String(p.roll_number || '').toUpperCase()) && <BadgeCheck size={14} className="shrink-0 text-[#006d3b]" />}
                          </div>
                          <p className="truncate text-sm font-semibold text-[#3d4a3f]/80">
                            {m ? `${mine ? 'You: ' : ''}${m.body}` : 'Say hi to start the chat'}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </aside>

            {/* Open chat */}
            <section className={`${active ? '' : 'hidden md:block'} rounded-3xl border border-[#deece2] bg-white p-5`}>
              {!active ? (
                <p className="py-24 text-center font-semibold text-[#3d4a3f]/70">Pick a match to start talking.</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <button onClick={() => setActiveId(null)} aria-label="Back to matches" className="text-[#3d4a3f] md:hidden"><ArrowLeft size={20} /></button>
                    <Avatar person={active} size="h-10 w-10 rounded-xl" />
                    <div>
                      <h2 className="font-extrabold leading-tight">{active.full_name}</h2>
                      <p className="text-xs font-semibold text-[#3d4a3f]/80">{active.branch}, Year {active.year_of_study}</p>
                    </div>
                  </div>
                  <Chat key={active.id} myProfileId={me.id} otherProfileId={active.id} heightClass="h-[60vh]" />
                  <div className="mt-3">
                    <ReportButton key={active.id} myProfileId={me.id} reportedId={active.id} />
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}