import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

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

function CreateProfile() {
  const [form, setForm] = useState({
    username: '', full_name: '', year_of_study: '', branch: '', gender: '',
    roll_number: '', budget_min: '', budget_max: '', furnishing: '',
    move_in_timeline: '', food_preference: '', group_size: '', preferred_locality: ''
  })
  // username and gender saved on the account during sign-up
  const [account, setAccount] = useState({ username: '', gender: '' })
  const [accountLoaded, setAccountLoaded] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAccount({
        username: user?.user_metadata?.username ?? '',
        gender: user?.user_metadata?.gender ?? '',
      })
      setAccountLoaded(true)
    })
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

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

    if (!username) return setError('Please choose a username')
    if (!gender) return setError('Please select a gender')
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
      })
      .select()
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
      })

    if (prefError) {
      // Undo step 1 so we do not leave a half-finished profile behind
      await supabase.from('student_profiles').delete().eq('id', profile.id)
      setSaving(false)
      setError(prefError.message)
      return
    }

    setSaving(false)
    setMessage('Profile created successfully!')
  }

  return (
    <form onSubmit={handleSubmit}>
      {accountLoaded && !account.username && (
        <input name="username" placeholder="Username" onChange={handleChange} required />
      )}
      <input name="full_name" placeholder="Full name" onChange={handleChange} required />
      <input name="roll_number" placeholder="Roll number" onChange={handleChange} required />
      <input name="year_of_study" placeholder="Year of study" type="number" min="1" max="5" onChange={handleChange} required />
      <input name="branch" placeholder="Branch" onChange={handleChange} required />
      {accountLoaded && !account.gender && (
        <select name="gender" onChange={handleChange} required>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      )}
      <input name="budget_min" placeholder="Min budget" type="number" min="0" onChange={handleChange} required />
      <input name="budget_max" placeholder="Max budget" type="number" min="0" onChange={handleChange} required />
      <select name="furnishing" onChange={handleChange} required>
        <option value="">Furnishing</option>
        <option value="unfurnished">Unfurnished</option>
        <option value="semi_furnished">Semi-furnished</option>
        <option value="fully_furnished">Fully furnished</option>
      </select>
      <select name="move_in_timeline" onChange={handleChange} required>
        <option value="">Move-in timeline</option>
        <option value="immediate">Immediate</option>
        <option value="within_month">Within a month</option>
        <option value="flexible">Flexible</option>
      </select>
      <select name="food_preference" onChange={handleChange} required>
        <option value="">Food preference</option>
        <option value="veg">Veg</option>
        <option value="non_veg">Non-veg</option>
        <option value="no_preference">No preference</option>
      </select>
      <select name="group_size" onChange={handleChange} required>
        <option value="">Group size</option>
        <option value="solo">Solo</option>
        <option value="two">Two</option>
        <option value="three_plus">Three+</option>
      </select>
      <input name="preferred_locality" placeholder="Preferred locality (optional)" onChange={handleChange} />
      <button type="submit" disabled={saving}>
        {saving ? 'Creating profile...' : 'Create profile'}
      </button>
      {error && <p>{error}</p>}
      {message && <p>{message}</p>}
    </form>
  )
}

export default CreateProfile