import { useEffect, useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'

const fmt = (iso) => new Date(iso).toLocaleString([], {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})
const fmtSize = (b) => b == null ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`

export default function LeadDrawer({ lead, org, members = [], onClose, onChanged }) {
  const [activities, setActivities] = useState(null)
  const [docs, setDocs] = useState([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('timeline') // timeline | email | docs
  const r = lead.score_rationale

  // email composer
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sending, setSending] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)

  // docs
  const [uploading, setUploading] = useState(false)
  const [docErr, setDocErr] = useState('')

  async function loadActivities() {
    const { data } = await supabase.from('lead_activities')
      .select('*').eq('lead_id', lead.id)
      .order('created_at', { ascending: false }).limit(50)
    setActivities(data ?? [])
  }
  async function loadDocs() {
    const { data } = await supabase.from('lead_documents')
      .select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
    setDocs(data ?? [])
  }
  useEffect(() => { loadActivities(); loadDocs() }, [lead.id])

  async function addNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    await supabase.from('lead_activities').insert({
      org_id: lead.org_id, lead_id: lead.id, type: 'note',
      body: note.trim(), internal: true, actor: auth?.user?.id ?? null,
    })
    setSaving(false); setNote(''); loadActivities()
  }

  async function changeStage(stage) {
    await supabase.from('leads').update({ stage }).eq('id', lead.id); onChanged()
  }
  async function changeAssignee(userId) {
    await supabase.from('leads').update({ assigned_agent: userId || null }).eq('id', lead.id); onChanged()
  }

  async function sendEmail(e) {
    e.preventDefault()
    setSending(true); setEmailMsg(null)
    const { data, error } = await supabase.functions.invoke('send-lead-email', {
      body: { lead_id: lead.id, subject, body: emailBody },
    })
    setSending(false)
    if (error || data?.error) { setEmailMsg({ type: 'error', text: data?.error || error.message }); return }
    setEmailMsg({ type: 'info', text: 'Email sent.' })
    setSubject(''); setEmailBody(''); loadActivities()
  }

  async function uploadDoc(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setDocErr('')
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${lead.org_id}/${lead.id}/${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await supabase.storage.from('lead-docs').upload(path, file)
      if (upErr) throw upErr
      const { data: auth } = await supabase.auth.getUser()
      const { error: metaErr } = await supabase.from('lead_documents').insert({
        org_id: lead.org_id, lead_id: lead.id, file_name: file.name,
        storage_path: path, mime_type: file.type, size_bytes: file.size,
        uploaded_by: auth?.user?.id ?? null,
      })
      if (metaErr) throw metaErr
      loadDocs()
    } catch (err) {
      setDocErr(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function openDoc(d) {
    const { data, error } = await supabase.storage.from('lead-docs').createSignedUrl(d.storage_path, 120)
    if (!error && data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteDoc(d) {
    if (!confirm(`Delete ${d.file_name}?`)) return
    await supabase.storage.from('lead-docs').remove([d.storage_path])
    await supabase.from('lead_documents').delete().eq('id', d.id)
    loadDocs()
  }

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Lead: ${lead.name}`}>
        <div className="drawer-head">
          <h3>{lead.name}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="contact">
          {[lead.email, lead.phone].filter(Boolean).join(' · ') || 'No contact details'}
        </div>

        <div className="score-block">
          {lead.score != null ? (
            <>
              <div className="score-row">
                <span className="score-num">{lead.score}</span>
                {r?.tier && <span className={`score-tier ${r.tier}`}>{r.tier}</span>}
              </div>
              {Array.isArray(r?.rationale) && r.rationale.length > 0 && (
                <ul className="score-rationale">{r.rationale.map((line, i) => <li key={i}>{line}</li>)}</ul>
              )}
              {r?.recommended_next_action && (
                <div className="score-next"><span className="lbl">Next action</span>{r.recommended_next_action}</div>
              )}
            </>
          ) : <div className="score-empty">Scoring runs automatically when a lead arrives — none yet for this lead.</div>}
        </div>

        <div className="drawer-section">
          <span className="lbl">Owner</span>
          <select value={lead.assigned_agent ?? ''} onChange={(e) => changeAssignee(e.target.value)}
            style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
          </select>
        </div>

        <div className="drawer-section">
          <span className="lbl">Stage</span>
          <select value={lead.stage} onChange={(e) => changeStage(e.target.value)}
            style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="drawer-section">
          <span className="lbl">Consent</span>
          <div className="consent-dots">
            <span className={`cdot ${lead.consent_email ? 'on' : ''}`}>Email {lead.consent_email ? 'opted in' : 'no consent'}</span>
            <span className={`cdot ${lead.consent_sms ? 'on' : ''}`}>SMS {lead.consent_sms ? 'opted in' : 'no consent'}</span>
          </div>
        </div>

        {/* Tabbed lower section */}
        <div className="drawer-tabs">
          <button className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>Timeline</button>
          <button className={tab === 'email' ? 'on' : ''} onClick={() => setTab('email')}>Email</button>
          <button className={tab === 'docs' ? 'on' : ''} onClick={() => setTab('docs')}>Documents{docs.length ? ` (${docs.length})` : ''}</button>
        </div>

        {tab === 'timeline' && (
          <div className="drawer-section">
            {activities === null ? <div className="loading-line" style={{ padding: '8px 0' }}>Loading…</div>
              : activities.length === 0 ? <div className="t-item"><div className="t-body">No activity yet.</div></div>
              : (
                <div className="timeline">
                  {activities.map((a) => (
                    <div key={a.id} className={`t-item ${a.internal ? 'internal' : ''}`}>
                      <div className="t-meta"><span>{a.type}</span><span>{fmt(a.created_at)}</span></div>
                      <div className="t-body">{a.body}</div>
                    </div>
                  ))}
                </div>
              )}
            <form className="note-row" onSubmit={addNote}>
              <input value={note} placeholder="Add a note…" onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-ghost btn-sm" disabled={saving || !note.trim()}>{saving ? 'Saving…' : 'Add'}</button>
            </form>
          </div>
        )}

        {tab === 'email' && (
          <div className="drawer-section">
            {!lead.email ? (
              <div className="t-item"><div className="t-body">This lead has no email address.</div></div>
            ) : !lead.consent_email ? (
              <div className="form-error">This lead hasn't consented to email, so you can't send campaigns or messages. Their consent shows above.</div>
            ) : (
              <form onSubmit={sendEmail}>
                {emailMsg && <div className={emailMsg.type === 'error' ? 'form-error' : 'form-info'}>{emailMsg.text}</div>}
                <div className="field">
                  <label>To</label>
                  <input value={lead.email} disabled />
                </div>
                <div className="field">
                  <label>Subject</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)', fontFamily: 'var(--font-body)', resize: 'vertical' }} />
                </div>
                <button className="btn btn-primary" disabled={sending || !subject.trim() || !emailBody.trim()}>
                  {sending ? 'Sending…' : 'Send email'}
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'docs' && (
          <div className="drawer-section">
            {docErr && <div className="form-error">{docErr}</div>}
            <label className="btn btn-ghost btn-sm" style={{ width: 'auto', cursor: 'pointer', marginBottom: 12, display: 'inline-flex' }}>
              {uploading ? 'Uploading…' : '+ Upload document'}
              <input type="file" onChange={uploadDoc} disabled={uploading} style={{ display: 'none' }} />
            </label>
            {docs.length === 0 ? (
              <div className="t-item"><div className="t-body">No documents yet. Upload contracts, disclosures, or anything tied to this client.</div></div>
            ) : (
              <div className="doc-list">
                {docs.map((d) => (
                  <div key={d.id} className="doc-row">
                    <button className="doc-name" onClick={() => openDoc(d)} title="Open">{d.file_name}</button>
                    <span className="doc-size">{fmtSize(d.size_bytes)}</span>
                    <button className="doc-del" onClick={() => deleteDoc(d)} aria-label="Delete">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
