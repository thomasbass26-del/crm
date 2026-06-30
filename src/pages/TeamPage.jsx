import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', agent: 'Agent' }

export default function TeamPage({ org, session }) {
  const [members, setMembers] = useState(null)
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('agent')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // {type, text}

  const isOwner = org.role === 'owner'
  const canManage = ['owner', 'admin'].includes(org.role)

  const load = useCallback(async () => {
    const { data: mem } = await supabase
      .from('org_members')
      .select('user_id, role, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: true })

    // Pull emails via a lightweight view-free approach: members carry user_id;
    // we read emails from the invites table where available, and fall back to
    // showing the current user's own email. (Full email display for all members
    // comes from the get-members function below.)
    const { data: rows } = await supabase.functions.invoke('team-members', {
      body: { org_id: org.id },
    }).then((r) => r.data ? { data: r.data.members } : { data: null })
      .catch(() => ({ data: null }))

    if (rows) {
      setMembers(rows)
    } else {
      // Fallback: show roles without emails if the function isn't deployed yet
      setMembers((mem ?? []).map((m) => ({
        user_id: m.user_id, role: m.role, created_at: m.created_at,
        email: m.user_id === session.user.id ? session.user.email : '(member)',
      })))
    }

    const { data: inv } = await supabase
      .from('invites')
      .select('id, email, role, status, created_at')
      .eq('org_id', org.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setInvites(inv ?? [])
  }, [org.id, session.user.id, session.user.email])

  useEffect(() => { load() }, [load])

  async function invite(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('team-invite', {
      body: { org_id: org.id, email: email.trim().toLowerCase(), role },
    })
    setBusy(false)
    if (error || data?.error) {
      setMsg({ type: 'error', text: data?.error || error.message })
      return
    }
    setMsg({
      type: 'info',
      text: data.mode === 'added_existing_user'
        ? 'They already had an account and were added to your team.'
        : `Invite sent to ${email}.`,
    })
    setEmail('')
    load()
  }

  async function changeRole(userId, newRole) {
    const { error } = await supabase.from('org_members')
      .update({ role: newRole }).eq('org_id', org.id).eq('user_id', userId)
    if (error) setMsg({ type: 'error', text: error.message })
    load()
  }

  async function removeMember(userId) {
    if (!confirm('Remove this member from the workspace?')) return
    const { error } = await supabase.from('org_members')
      .delete().eq('org_id', org.id).eq('user_id', userId)
    if (error) setMsg({ type: 'error', text: error.message })
    load()
  }

  async function cancelInvite(id) {
    await supabase.from('invites').update({ status: 'revoked' }).eq('id', id)
    load()
  }

  if (members === null) return <div className="loading-line">Loading team…</div>

  return (
    <>
      <div className="page-head">
        <h2>Team</h2>
        <span className="meta">{members.length} member{members.length === 1 ? '' : 's'}</span>
      </div>

      <div className="list-wrap">
        {msg && <div className={msg.type === 'error' ? 'form-error' : 'form-info'}>{msg.text}</div>}

        {canManage && (
          <form className="settings-card" onSubmit={invite}>
            <span className="drawer-section" style={{ display: 'block' }}>
              <span className="lbl" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                Invite a teammate
              </span>
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label htmlFor="inv-email">Email</label>
                <input id="inv-email" type="email" value={email} required
                  placeholder="agent@example.com"
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="inv-role">Role</label>
                <select id="inv-role" value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
                  <option value="agent">Agent</option>
                  {isOwner && <option value="admin">Admin</option>}
                </select>
              </div>
              <button className="btn btn-primary" style={{ width: 'auto' }} disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}

        {members.map((m) => {
          const isSelf = m.user_id === session.user.id
          return (
            <div key={m.user_id} className="row-card">
              <div>
                <div className="title">{m.email}{isSelf && <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}> · you</span>}</div>
                <div className="sub">Joined {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isOwner && !isSelf ? (
                  <select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value)}
                    style={{ padding: '6px 8px', border: '1px solid var(--line-strong)', borderRadius: 7, background: 'var(--paper)', fontSize: 12.5 }}>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                  </select>
                ) : (
                  <span className="status-tag">{ROLE_LABELS[m.role]}</span>
                )}
                {canManage && !isSelf && m.role !== 'owner' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeMember(m.user_id)}>Remove</button>
                )}
              </div>
            </div>
          )
        })}

        {invites.length > 0 && (
          <>
            <div className="page-head" style={{ padding: '18px 0 6px' }}>
              <h2 style={{ fontSize: 18 }}>Pending invites</h2>
            </div>
            {invites.map((i) => (
              <div key={i.id} className="row-card">
                <div>
                  <div className="title">{i.email}</div>
                  <div className="sub">Invited as {ROLE_LABELS[i.role]} · {new Date(i.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="status-tag">Pending</span>
                  {canManage && <button className="btn btn-ghost btn-sm" onClick={() => cancelInvite(i.id)}>Cancel</button>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
