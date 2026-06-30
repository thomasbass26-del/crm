import { useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'
import { useMembers } from '../lib/useMembers'

export default function AddLeadModal({ org, session, defaultStage = 'fresh', onClose, onAdded }) {
  const canManage = ['owner', 'admin'].includes(org.role)
  const members = useMembers(org.id)
  const [f, setF] = useState({
    name: '', email: '', phone: '', stage: defaultStage, source: 'manual',
    assigned_agent: canManage ? '' : session.user.id,
    consent_email: false, consent_sms: false, note: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setErr('') }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function submit() {
    if (!f.name.trim() && !f.email.trim() && !f.phone.trim()) { setErr('Enter at least a name, email, or phone.'); return }
    if (f.email && !emailRe.test(f.email.trim())) { setErr('That email doesn\u2019t look right.'); return }
    setBusy(true); setErr('')

    const now = new Date().toISOString()
    const consentRecord = (f.consent_email || f.consent_sms) ? {
      method: 'manual_entry', captured_by: session.user.id, captured_at: now,
      email_consent: f.consent_email, sms_consent: f.consent_sms,
    } : null

    const row = {
      org_id: org.id,
      name: f.name.trim() || f.email.trim() || f.phone.trim(),
      email: f.email.trim().toLowerCase() || null,
      phone: f.phone.replace(/[^\d+]/g, '') || null,
      stage: f.stage,
      source: f.source.trim() || 'manual',
      assigned_agent: f.assigned_agent || null,
      consent_email: f.consent_email,
      consent_sms: f.consent_sms && !!f.phone,
      consent_captured_at: consentRecord ? now : null,
      consent_record: consentRecord,
    }

    const { data: lead, error } = await supabase.from('leads').insert(row).select('id').single()
    if (error) { setBusy(false); setErr(error.message); return }

    if (f.note.trim()) {
      await supabase.from('lead_activities').insert({
        org_id: org.id, lead_id: lead.id, type: 'note',
        body: f.note.trim(), internal: true, actor: session.user.id,
      })
    }
    setBusy(false)
    onAdded(lead.id)
  }

  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Add lead">
        <div className="modal-head">
          <h3>Add a lead</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {err && <div className="form-error">{err}</div>}

        <div className="mr-fields">
          <div className="field"><label>Name</label>
            <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Jordan Rivera" autoFocus /></div>
          <div className="field"><label>Phone</label>
            <input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(843) 555-0142" /></div>
        </div>
        <div className="field"><label>Email</label>
          <input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="jordan@example.com" /></div>

        <div className="mr-fields">
          <div className="field"><label>Stage</label>
            <select value={f.stage} onChange={(e) => set('stage', e.target.value)}
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select></div>
          <div className="field"><label>Source</label>
            <input value={f.source} onChange={(e) => set('source', e.target.value)} placeholder="open house, referral…" /></div>
        </div>

        {canManage && (
          <div className="field"><label>Assign to</label>
            <select value={f.assigned_agent} onChange={(e) => set('assigned_agent', e.target.value)}
              style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
            </select></div>
        )}

        <div className="field"><label>First note / context (optional)</label>
          <textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)}
            placeholder="Met at the Waterway Palms open house; looking in the $700-900k range."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)', fontFamily: 'var(--font-body)', resize: 'vertical' }} /></div>

        <div className="consent-box">
          <span className="lbl" style={{ display: 'block', marginBottom: 8 }}>Consent</span>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
            Only check these if this person has actually agreed to be contacted. Leave off and they can still be worked manually — they just won't receive campaigns.
          </p>
          <label className="consent-check">
            <input type="checkbox" checked={f.consent_email} onChange={(e) => set('consent_email', e.target.checked)} />
            They consented to email
          </label>
          <label className="consent-check">
            <input type="checkbox" checked={f.consent_sms} onChange={(e) => set('consent_sms', e.target.checked)} />
            They gave express written consent to text
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={submit} disabled={busy}>
            {busy ? 'Adding…' : 'Add lead'}
          </button>
        </div>
      </div>
    </>
  )
}
