import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Trilens from '../components/Trilens'

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48)

export default function OnboardingPage({ onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    const slug = slugify(name) || `org-${Date.now()}`
    const { error: err } = await supabase
      .from('organizations')
      .insert({ name: name.trim(), slug })
    setBusy(false)
    if (err) {
      setError(err.code === '23505'
        ? 'That name is taken — try adding your market or team name.'
        : err.message)
      return
    }
    onCreated()
  }

  return (
    <div className="auth-form-side" style={{ minHeight: '100vh' }}>
      <form className="auth-card" onSubmit={create}>
        <div className="trilens" style={{ marginBottom: 20 }}>
          <Trilens size={38} />
          <span className="trilens-name">triskope</span>
        </div>
        <h1>Name your workspace</h1>
        <p className="sub">Usually your team or brokerage name. You'll be its owner.</p>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="orgname">Workspace name</label>
          <input id="orgname" value={name} required minLength={2}
            placeholder="e.g. Stack Coastal Group"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy || name.trim().length < 2}>
          {busy ? 'Creating…' : 'Create workspace'}
        </button>
      </form>
    </div>
  )
}
