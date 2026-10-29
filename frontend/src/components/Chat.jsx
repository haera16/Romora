import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient' // change to `import supabase from ...` if yours is a default export

export default function Chat({ myProfileId, otherProfileId, heightClass = 'h-96' }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true

    const inThisChat = (m) =>
      (m.sender_profile_id === myProfileId && m.recipient_profile_id === otherProfileId) ||
      (m.sender_profile_id === otherProfileId && m.recipient_profile_id === myProfileId)

    supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_profile_id.eq.${myProfileId},recipient_profile_id.eq.${otherProfileId}),` +
        `and(sender_profile_id.eq.${otherProfileId},recipient_profile_id.eq.${myProfileId})`
      )
      .order('created_at')
      .then(({ data }) => {
        if (active) setMessages(data || [])
      })

    const channel = supabase
      .channel(`chat-${myProfileId}-${otherProfileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (!inThisChat(payload.new)) return
        setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [myProfileId, otherProfileId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setError('')
    const { error: err } = await supabase.from('messages').insert({
      sender_profile_id: myProfileId,
      recipient_profile_id: otherProfileId,
      body,
    })
    if (err) setError("Couldn't send. You can only message mutual matches.")
    else setText('')
  }

  return (
    <div className={`flex ${heightClass} flex-col rounded-2xl border border-[#deece2] bg-white`}>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm font-semibold text-[#3d4a3f]/70">
            No messages yet. Say hi and ask about their area and move-in date.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] break-words rounded-2xl px-3 py-2 text-sm font-semibold ${m.sender_profile_id === myProfileId
                ? 'ml-auto bg-[#006d3b] text-white'
                : 'bg-[#EAFBF2] text-[#121e18]'
              }`}
          >
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {error && <p className="px-4 pb-1 text-xs font-semibold text-[#93000a]">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-[#deece2] p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Type a message"
          className="flex-1 rounded-full border border-[#bccabc]/60 px-4 py-2 text-sm font-semibold outline-none focus:border-[#006d3b] focus:ring-2 focus:ring-[#006d3b]/20"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-[#006d3b] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}