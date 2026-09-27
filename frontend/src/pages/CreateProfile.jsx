import { useState } from 'react'
import { supabase } from '../supabaseClient'

function CreateProfile() {
  const [form, setForm] = useState({
    username: '', full_name: '', year_of_study: '', branch: '', gender: '',
    roll_number: '', budget_min: '', budget_max: '', furnishing: '',
    move_in_timeline: '', food_preference: '', group_size: '', preferred_locality: ''
  })
  const [message, setMessage] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('You must be logged in first.')
      return
    }

    // Step 1: create the profile
    const { data: profile, error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: user.id,
        username: form.username,
        full_name: form.full_name,
        year_of_study: form.year_of_study,
        branch: form.branch,
        gender: form.gender,
        roll_number: form.roll_number,
      })
      .select()
      .single()

    if (profileError) {
      setMessage(profileError.message)
      return
    }

    // Step 2: create preferences, linked to the profile just created
    const { error: prefError } = await supabase
      .from('preferences')
      .insert({
        profile_id: profile.id,
        budget_min: form.budget_min,
        budget_max: form.budget_max,
        furnishing: form.furnishing,
        move_in_timeline: form.move_in_timeline,
        food_preference: form.food_preference,
        group_size: form.group_size,
        preferred_locality: form.preferred_locality,
      })

    if (prefError) {
      setMessage(prefError.message)
    } else {
      setMessage('Profile created successfully!')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" placeholder="Username" onChange={handleChange} />
      <input name="full_name" placeholder="Full name" onChange={handleChange} />
      <input name="roll_number" placeholder="Roll number" onChange={handleChange} />
      <input name="year_of_study" placeholder="Year of study" type="number" onChange={handleChange} />
      <input name="branch" placeholder="Branch" onChange={handleChange} />
      <select name="gender" onChange={handleChange}>
        <option value="">Select gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <input name="budget_min" placeholder="Min budget" type="number" onChange={handleChange} />
      <input name="budget_max" placeholder="Max budget" type="number" onChange={handleChange} />
      <select name="furnishing" onChange={handleChange}>
        <option value="">Furnishing</option>
        <option value="unfurnished">Unfurnished</option>
        <option value="semi_furnished">Semi-furnished</option>
        <option value="fully_furnished">Fully furnished</option>
      </select>
      <select name="move_in_timeline" onChange={handleChange}>
        <option value="">Move-in timeline</option>
        <option value="immediate">Immediate</option>
        <option value="within_month">Within a month</option>
        <option value="flexible">Flexible</option>
      </select>
      <select name="food_preference" onChange={handleChange}>
        <option value="">Food preference</option>
        <option value="veg">Veg</option>
        <option value="non_veg">Non-veg</option>
        <option value="no_preference">No preference</option>
      </select>
      <select name="group_size" onChange={handleChange}>
        <option value="">Group size</option>
        <option value="solo">Solo</option>
        <option value="two">Two</option>
        <option value="three_plus">Three+</option>
      </select>
      <input name="preferred_locality" placeholder="Preferred locality" onChange={handleChange} />
      <button type="submit">Create profile</button>
      {message && <p>{message}</p>}
    </form>
  )
}

export default CreateProfile