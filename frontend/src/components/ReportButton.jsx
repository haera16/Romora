import { useState } from 'react'
import { Flag } from 'lucide-react'
import { supabase } from '../supabaseClient' // change to `import supabase from ...` if yours is a default export

export default function ReportButton({ myProfileId, reportedId }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState('') // '', 'sending', 'done', or an error message

  async function submit() {
    if (!reason.trim()) return
    setStatus('sending')
    const { error } = await supabase.from('reports').insert({
      reporter_profile_id: myProfileId,
      reported_profile_id: reportedId,
      reason: reason.trim().slice(0, 500),
    })
    if (error?.code === '23505') setStatus("You've already reported this profile.")
    else if (error) setStatus("Couldn't send the report. Try again.")
    else {
      setStatus('done')
      setReason('')
    }
  }

  if (status === 'done') {
    return <p className="text-xs font-semibold text-[#006d3b]">Report sent. Our team will review it.</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-bold text-[#3d4a3f]/70 hover:text-[#93000a]"
      >
        <Flag size={12} /> Report this profile
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What's wrong with this profile?"
            className="w-full rounded-xl border border-[#bccabc]/60 p-2 text-sm font-semibold outline-none focus:border-[#006d3b]"
          />
          <button
            type="button"
            onClick={submit}
            disabled={status === 'sending' || !reason.trim()}
            className="rounded-full bg-[#93000a] px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending...' : 'Submit report'}
          </button>
          {status && status !== 'sending' && <p className="text-xs font-semibold text-[#93000a]">{status}</p>}
        </div>
      )}
    </div>
  )
}