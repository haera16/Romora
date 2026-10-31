import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Hash, GraduationCap, BookOpen, IndianRupee, MapPin, Home, Sparkles, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { refreshMyMatches } from '../lib/api'

// "" (blank) -> null, otherwise a real number
function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// "" (blank) -> null, otherwise the text with extra spaces removed
function toTextOrNull(value) {
  const text = String(value ?? '').trim()
  return text === '' ? null : text
}

const money = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const INPUT = 'w-full rounded-2xl border bg-white py-3 pr-4 text-[15px] text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2'
const OK = 'border-slate-200 focus:border-[#2D6A44] focus:ring-[#2D6A44]/20'
const BAD = 'border-red-400 focus:border-red-500 focus:ring-red-200'

function TextField({ label, icon: Icon, hint, error, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input {...props} className={`${INPUT} ${error ? BAD : OK} ${Icon ? 'pl-11' : 'pl-4'}`} />
      </span>
      {error
        ? <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>
        : hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function Chips({ label, options, value, onChange, cols = 3 }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-slate-700">{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${value === v
              ? 'border-[#2D6A44] bg-[#2D6A44] text-white shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#2D6A44]/50'
              }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-base font-extrabold text-slate-800">
        <Icon size={18} className="text-[#2D6A44]" /> {title}
      </h2>
      {children}
    </section>
  )
}

function CreateProfile() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', full_name: '', year_of_study: '', branch: '', gender: '',
    roll_number: '', budget_min: '', budget_max: '', furnishing: '',
    move_in_timeline: '', food_preference: '', group_size: '', preferred_locality: '',
    preferred_roommate_gender: 'any', bio_raw: ''
  })
  // username and gender saved on the account during sign-up
  const [account, setAccount] = useState({ username: '', gender: '', email: '' })
  const [accountLoaded, setAccountLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const errorRef = useRef(null)

  // The error sits at the bottom of a long form, so bring it into view
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAccount({
        username: user?.user_metadata?.username ?? '',
        gender: user?.user_metadata?.gender ?? '',
        email: user?.email ?? '',
      })
      setAccountLoaded(true)
    })
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }
  const setField = (name) => (value) => setForm((f) => ({ ...f, [name]: value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in first.')
      return
    }

    // Prefer what was saved at sign-up; fall back to the form if it is missing
    const username = (account.username || form.username).trim()
    const gender = account.gender || form.gender
    const budgetMin = toNumberOrNull(form.budget_min)
    const budgetMax = toNumberOrNull(form.budget_max)

    // Roll number must be the part of the KIIT email before @kiit.ac.in
    const emailRoll = (user.email || '').split('@')[0].toLowerCase()
    if (form.roll_number.trim().toLowerCase() !== emailRoll) return setError('Use your own roll no')

    if (!username) return setError('Please choose a username')
    if (!gender) return setError('Please select a gender')
    if (!form.year_of_study) return setError('Please select your year of study')
    if (budgetMin === null || budgetMax === null) {
      return setError('Please enter your minimum and maximum budget')
    }
    if (budgetMin > budgetMax) {
      return setError('Minimum budget cannot be higher than maximum budget')
    }
    if (!form.furnishing || !form.move_in_timeline || !form.food_preference || !form.group_size) {
      return setError('Please choose an option for every preference')
    }

    setSaving(true)

    // Step 1: create the profile
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: user.id,
        username,
        full_name: toTextOrNull(form.full_name),
        year_of_study: toNumberOrNull(form.year_of_study),
        branch: toTextOrNull(form.branch),
        gender,
        roll_number: toTextOrNull(form.roll_number),
        bio_raw: toTextOrNull(form.bio_raw),
      })
      .select('id') // CHANGED: only ask for the id, because roll_number is hidden from the browser
      .single()

    if (profileError) {
      setSaving(false)
      // 23505 is Postgres' code for "this value must be unique but already exists"
      setError(
        profileError.code === '23505'
          ? 'A profile with this username or roll number already exists.'
          : profileError.message
      )
      return
    }

    // Step 2: create preferences, linked to the profile just created
    const { error: prefError } = await supabase
      .from('preferences')
      .insert({
        profile_id: profile.id,
        budget_min: budgetMin,
        budget_max: budgetMax,
        furnishing: form.furnishing,
        move_in_timeline: form.move_in_timeline,
        food_preference: form.food_preference,
        group_size: form.group_size,
        preferred_locality: toTextOrNull(form.preferred_locality),
        preferred_roommate_gender: form.preferred_roommate_gender,
      })

    if (prefError) {
      // Undo step 1 so we do not leave a half-finished profile behind
      await supabase.from('student_profiles').delete().eq('id', profile.id)
      setSaving(false)
      setError(prefError.message)
      return
    }

    await refreshMyMatches() // score this user against everyone now; fine if the backend is off
    setSaving(false)
    navigate('/explore')
  }

  const budgetMin = toNumberOrNull(form.budget_min)
  const budgetMax = toNumberOrNull(form.budget_max)
  const emailRollNow = account.email.split('@')[0].toLowerCase()
  const typedRoll = form.roll_number.trim().toLowerCase()
  // Flag it as soon as a wrong digit is typed, not only on submit
  const rollWrong = accountLoaded && emailRollNow !== '' && typedRoll !== '' && !emailRollNow.startsWith(typedRoll)
  const budgetBad = budgetMin !== null && budgetMax !== null && budgetMin > budgetMax

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-b from-[#e3f2fd] to-white px-4 py-10">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-slate-200/70">
        <div className="flex items-center justify-center gap-2 bg-[#2D6A44] py-3 text-sm font-bold text-white">
          <ShieldCheck size={16} /> Step 2 of 2: tell us about you
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 px-6 py-8 sm:px-10">
          <header className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Create your profile</h1>
            <p className="mt-1 text-slate-500">This is how we find roommates you'll actually get along with.</p>
          </header>

          <Section icon={User} title="About you">
            {accountLoaded && !account.username && (
              <TextField label="Username" icon={User} name="username" value={form.username} onChange={handleChange} placeholder="e.g. arnav_kiit" required />
            )}
            <TextField label="Full name" icon={User} name="full_name" value={form.full_name} onChange={handleChange} placeholder="Your name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Roll number" icon={Hash} name="roll_number" value={form.roll_number} onChange={handleChange} placeholder="e.g. 23052001" hint="Must match your KIIT email" error={rollWrong ? 'Use your own roll no' : undefined} required />
              <TextField label="Branch" icon={BookOpen} name="branch" value={form.branch} onChange={handleChange} placeholder="e.g. CSE" required />
            </div>
            {accountLoaded && !account.gender && (
              <Chips label="Gender" cols={2} value={form.gender} onChange={setField('gender')} options={[['male', 'Male'], ['female', 'Female']]} />
            )}
            <Chips label="Year of study" cols={4} value={form.year_of_study} onChange={setField('year_of_study')} options={['1', '2', '3', '4'].map((y) => [y, `Year ${y}`])} />
            <label className="block">
              <span className="mb-1.5 flex justify-between text-sm font-semibold text-slate-700">
                About you <span className="font-normal text-slate-400">{form.bio_raw.length}/200 (optional)</span>
              </span>
              <textarea name="bio_raw" rows={3} maxLength={200} value={form.bio_raw} onChange={handleChange} placeholder="Early riser? Night coder? Tell future roommates what you're like." className={`${INPUT} ${OK} resize-none pl-4`} />
            </label>
          </Section>

          <Section icon={Home} title="Budget and place">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Min budget / month" icon={IndianRupee} name="budget_min" type="number" min="0" value={form.budget_min} onChange={handleChange} placeholder="8000" required />
              <TextField label="Max budget / month" icon={IndianRupee} name="budget_max" type="number" min="0" value={form.budget_max} onChange={handleChange} placeholder="12000" required />
            </div>
            {budgetMin !== null && budgetMax !== null && (
              <p className={`-mt-2 text-sm font-semibold ${budgetBad ? 'text-red-600' : 'text-[#2D6A44]'}`}>
                {budgetBad ? 'Minimum is higher than maximum' : `${money(budgetMin)} – ${money(budgetMax)} / month`}
              </p>
            )}
            <TextField label="Preferred locality" icon={MapPin} name="preferred_locality" value={form.preferred_locality} onChange={handleChange} placeholder="e.g. Patia, KIIT Square" hint="Optional" />
            <Chips label="Furnishing" value={form.furnishing} onChange={setField('furnishing')} options={[['unfurnished', 'Unfurnished'], ['semi_furnished', 'Semi'], ['fully_furnished', 'Fully']]} />
          </Section>

          <Section icon={Sparkles} title="Lifestyle">
            <Chips label="Move-in" value={form.move_in_timeline} onChange={setField('move_in_timeline')} options={[['immediate', 'Immediate'], ['within_month', 'Within a month'], ['flexible', 'Flexible']]} />
            <Chips label="Food" value={form.food_preference} onChange={setField('food_preference')} options={[['veg', 'Veg'], ['non_veg', 'Non-veg'], ['no_preference', 'No preference']]} />
            <Chips label="Group size" value={form.group_size} onChange={setField('group_size')} options={[['solo', 'Solo'], ['two', 'Two'], ['three_plus', 'Three+']]} />
            <Chips label="Roommate gender" value={form.preferred_roommate_gender} onChange={setField('preferred_roommate_gender')} options={[['male', 'Male'], ['female', 'Female'], ['any', 'Any']]} />
          </Section>

          {error && (
            <p ref={errorRef} role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2D6A44] py-4 text-base font-bold text-white shadow-lg shadow-[#2D6A44]/20 transition hover:bg-[#245737] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Finding your matches...' : <>Create profile <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateProfile