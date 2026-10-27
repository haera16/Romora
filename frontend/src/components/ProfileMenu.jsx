import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { supabase } from '../supabaseClient'

// Avatar + first name + chevron, so it's obvious this is a clickable account menu.
// Usage: <ProfileMenu avatarSrc={url} name={profile.full_name} />
export default function ProfileMenu({ avatarSrc, name }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-[#006d3b]/30 bg-[#EAFBF2] py-1 pl-1 pr-3 text-sm font-bold text-[#006d3b] transition hover:border-[#006d3b] hover:bg-[#d9f5e4] focus:outline-none focus:ring-2 focus:ring-[#006d3b]"
      >
        <span className="flex h-10 w-10 items-end justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#006d3b]">
          {avatarSrc
            ? <img src={avatarSrc} alt="" className="h-full w-full object-cover object-top" />
            : <span className="self-center font-extrabold">{name?.[0]}</span>}
        </span>
        <span className="hidden sm:inline">{name?.split(' ')[0]}</span>
        <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-[#deece2] bg-white p-2 shadow-xl">
          {name && <p className="truncate px-3 py-2 text-sm font-extrabold text-[#121e18]">{name}</p>}
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#3d4a3f] hover:bg-[#EAFBF2]"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}