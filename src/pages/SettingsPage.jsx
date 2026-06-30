import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SettingsPage({ org, session }) {
  const [name, setName] = useState(org.name)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const canEdit = ['owner', 'admin'].includes(org.role)

  async function save(e) {
    e.preventDefault()
    setBusy(true); setSaved(false)
    const { error } = await supabase.from('organizations')
      .update({ name: name.trim() }).eq('id', org.id)
    setBusy(false)
    if (!error) setSaved(true)
  }

  return (
    <>
      <div className="page-head"><h2>Settings</h2></div>
      <div className="list-wrap">
        <form className="settings-card" onSubmit={save}>
          {saved && <div className="form-info">Saved. Refresh to see it in the sidebar.</div>}
          <div className="field">
            <label htmlFor="ws">Workspace name</label>
            <input id="ws" value={name} disabled={!canEdit}
              onChange={(e) => { setName(e.target.value); setSaved(false) }} />
          </div>
          <div className="field">
            <label>Your role</label>
            <input value={org.role} disabled />
          </div>
          <div className="field">
            <label>Signed in as</label>
            <input value={session.user.email} disabled />
          </div>
          {canEdit && (
            <button className="btn btn-primary" style={{ width: 'auto' }} disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </form>
      </div>
    </>
  )
}
