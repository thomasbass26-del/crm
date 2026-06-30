import { useCallback, useEffect, useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'
import { useMembers } from '../lib/useMembers'
import MarketReport from '../components/MarketReport'

const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—'
const fmtSize = (b) => b == null ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`

export default function LeadProfilePage({ org, leadId, onBack }) {
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [docs, setDocs] = useState([])
  const [tab, setTab] = useState('timeline')
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const members = useMembers(org.id)

  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sending, setSending] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [docErr, setDocErr] = useState('')

  const loadLead = useCallback(async () => {
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).single()
    setLead(data ?? null)
  }, [leadId])
  const loadActivities = useCallback(async () => {
    const { data } = await supabase.from('lead_activities').select('*')
      .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(80)
    setActivities(data ?? [])
  }, [leadId])
  const loadDocs = useCallback(async () => {
    const { data } = await supabase.from('lead_documents').select('*')
      .eq('lead_id', leadId).order('created_at', { ascending: false })
    setDocs(data ?? [])
  }, [leadId])

  useEffect(() => { loadLead(); loadActivities(); loadDocs() }, [loadLead, loadActivities, loadDocs])

  if (lead === null) return <div className="loading-line">Loading profile…</div>

  const r = lead.score_rationale
  const tier = r?.tier ?? (lead.score == null ? null : lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold')
  const ownerEmail = members.find((m) => m.user_id === lead.assigned_agent)?.email

  async function update(patch) {
    await supabase.from('leads').update(patch).eq('id', lead.id)
    loadLead()
  }
  async function addNote(e) {
    e.preventDefault()
    if (!note.trim()) return
    setSavingNote(true)
    const { data: auth } = await supabase.auth.getUser()
    await supabase.from('lead_activities').insert({
      org_id: lead.org_id, lead_id: lead.id, type: 'note', body: note.trim(),
      internal: true, actor: auth?.user?.id ?? null,
    })
    setSavingNote(false); setNote(''); loadActivities()
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
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setDocErr('')
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${lead.org_id}/${lead.id}/${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await supabase.storage.from('lead-docs').upload(path, file)
      if (upErr) throw upErr
      const { data: auth } = await supabase.auth.getUser()
      const { error: mErr } = await supabase.from('lead_documents').insert({
        org_id: lead.org_id, lead_id: lead.id, file_name: file.name, storage_path: path,
        mime_type: file.type, size_bytes: file.size, uploaded_by: auth?.user?.id ?? null,
      })
      if (mErr) throw mErr
      loadDocs()
    } catch (err) { setDocErr(err.message ?? 'Upload failed') }
    finally { setUploading(false); e.target.value = '' }
  }
  async function openDoc(d) {
    const { data } = await supabase.storage.from('lead-docs').createSignedUrl(d.storage_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }
  async function deleteDoc(d) {
    if (!confirm(`Delete ${d.file_name}?`)) return
    await supabase.storage.from('lead-docs').remove([d.storage_path])
    await supabase.from('lead_documents').delete().eq('id', d.id)
    loadDocs()
  }

  return (
    <>
      <div className="page-head" style={{ alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Pipeline</button>
        <span className="meta">{lead.source || '—'}</span>
      </div>

      <div className="profile">
        {/* header */}
        <div className="profile-head">
          <div>
            <h1 className="profile-name">{lead.name}</h1>
            <div className="profile-contact">
              {lead.email && <a href={`mailto:${lead.email}`}>{lead.email}</a>}
              {lead.email && lead.phone && <span className="dot-sep">·</span>}
              {lead.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>}
              {!lead.email && !lead.phone && <span style={{ color: 'var(--ink-soft)' }}>No contact details</span>}
            </div>
          </div>
          {lead.score != null && (
            <div className={`profile-score ${tier}`}>
              <span className="ps-num">{lead.score}</span>
              <span className="ps-tier">{tier}</span>
            </div>
          )}
        </div>

        <div className="profile-grid">
          {/* LEFT: activity / email / docs */}
          <div className="profile-main">
            <div className="drawer-tabs">
              <button className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>Timeline</button>
              <button className={tab === 'email' ? 'on' : ''} onClick={() => setTab('email')}>Email</button>
              <button className={tab === 'docs' ? 'on' : ''} onClick={() => setTab('docs')}>Documents{docs.length ? ` (${docs.length})` : ''}</button>
              <button className={tab === 'market' ? 'on' : ''} onClick={() => setTab('market')}>Market</button>
            </div>

            {tab === 'timeline' && (
              <div className="panel">
                <form className="note-row" onSubmit={addNote} style={{ marginTop: 0, marginBottom: 14 }}>
                  <input value={note} placeholder="Add a note…" onChange={(e) => setNote(e.target.value)} />
                  <button className="btn btn-ghost btn-sm" disabled={savingNote || !note.trim()}>{savingNote ? 'Saving…' : 'Add'}</button>
                </form>
                {activities.length === 0 ? <div className="panel-empty">No activity yet.</div> : (
                  <div className="timeline">
                    {activities.map((a) => (
                      <div key={a.id} className={`t-item ${a.internal ? 'internal' : ''}`}>
                        <div className="t-meta"><span>{a.type}</span><span>{fmtDateTime(a.created_at)}</span></div>
                        <div className="t-body">{a.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'email' && (
              <div className="panel">
                {!lead.email ? <div className="panel-empty">This lead has no email address.</div>
                : !lead.consent_email ? <div className="form-error">This lead hasn't consented to email, so messages and campaigns can't be sent.</div>
                : (
                  <form onSubmit={sendEmail}>
                    {emailMsg && <div className={emailMsg.type === 'error' ? 'form-error' : 'form-info'}>{emailMsg.text}</div>}
                    <div className="field"><label>To</label><input value={lead.email} disabled /></div>
                    <div className="field"><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
                    <div className="field"><label>Message</label>
                      <textarea rows={7} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} required
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)', fontFamily: 'var(--font-body)', resize: 'vertical' }} />
                    </div>
                    <button className="btn btn-primary" style={{ width: 'auto' }} disabled={sending || !subject.trim() || !emailBody.trim()}>
                      {sending ? 'Sending…' : 'Send email'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {tab === 'docs' && (
              <div className="panel">
                {docErr && <div className="form-error">{docErr}</div>}
                <label className="btn btn-ghost btn-sm" style={{ width: 'auto', cursor: 'pointer', marginBottom: 12, display: 'inline-flex' }}>
                  {uploading ? 'Uploading…' : '+ Upload document'}
                  <input type="file" onChange={uploadDoc} disabled={uploading} style={{ display: 'none' }} />
                </label>
                {docs.length === 0 ? <div className="panel-empty">No documents yet. Upload contracts, disclosures, or anything tied to this client.</div> : (
                  <div className="doc-list">
                    {docs.map((d) => (
                      <div key={d.id} className="doc-row">
                        <button className="doc-name" onClick={() => openDoc(d)}>{d.file_name}</button>
                        <span className="doc-size">{fmtSize(d.size_bytes)}</span>
                        <button className="doc-del" onClick={() => deleteDoc(d)} aria-label="Delete">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'market' && <MarketReport lead={lead} />}
          </div>

          {/* RIGHT: details rail */}
          <div className="profile-rail">
            <div className="panel">
              <div className="panel-title">Details</div>
              <div className="kv"><span>Stage</span>
                <select value={lead.stage} onChange={(e) => update({ stage: e.target.value })} className="kv-select">
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="kv"><span>Owner</span>
                <select value={lead.assigned_agent ?? ''} onChange={(e) => update({ assigned_agent: e.target.value || null })} className="kv-select">
                  <option value="">Unassigned</option>
                  {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
                </select>
              </div>
              <div className="kv"><span>Source</span><b>{lead.source || '—'}</b></div>
              <div className="kv"><span>Created</span><b>{fmtDate(lead.created_at)}</b></div>
            </div>

            {lead.score != null && (
              <div className="panel">
                <div className="panel-title">AI score · {lead.score} ({tier})</div>
                {Array.isArray(r?.rationale) && <ul className="score-rationale" style={{ color: 'var(--ink-soft)', paddingLeft: 16 }}>{r.rationale.map((l, i) => <li key={i}>{l}</li>)}</ul>}
                {r?.recommended_next_action && <div style={{ marginTop: 10, fontSize: 13 }}><span className="lbl" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 3 }}>Next action</span>{r.recommended_next_action}</div>}
              </div>
            )}

            <div className="panel">
              <div className="panel-title">Consent</div>
              <div className="kv"><span>Email</span>
                <span className={`cdot ${lead.consent_email ? 'on' : ''}`}>{lead.consent_email ? 'Opted in' : 'No consent'}</span>
              </div>
              <div className="kv"><span>SMS</span>
                <span className={`cdot ${lead.consent_sms ? 'on' : ''}`}>{lead.consent_sms ? 'Opted in' : 'No consent'}</span>
              </div>
              {lead.consent_captured_at && <div className="kv"><span>Captured</span><b>{fmtDate(lead.consent_captured_at)}</b></div>}
              {lead.consent_record?.method && <div className="kv"><span>Method</span><b style={{ fontSize: 11 }}>{lead.consent_record.method}</b></div>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
