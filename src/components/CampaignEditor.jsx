import { useEffect, useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'

const DELAY_PRESETS = [
  { h: 0, label: 'Immediately' },
  { h: 1, label: '1 hour later' },
  { h: 24, label: '1 day later' },
  { h: 72, label: '3 days later' },
  { h: 168, label: '1 week later' },
]
const blankStep = (order) => ({
  _key: Math.random().toString(36).slice(2),
  step_order: order, delay_hours: order === 1 ? 0 : 72,
  channel: 'email', subject: '', body_template: '',
})

export default function CampaignEditor({ org, campaignId, onClose, onSaved }) {
  const [loading, setLoading] = useState(!!campaignId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState('draft')
  const [stages, setStages] = useState([])      // audience: lead stages
  const [sources, setSources] = useState('')    // audience: comma list
  const [steps, setSteps] = useState([blankStep(1)])

  useEffect(() => {
    if (!campaignId) return
    async function load() {
      const { data: c } = await supabase.from('campaigns').select('*').eq('id', campaignId).single()
      const { data: st } = await supabase.from('campaign_steps').select('*')
        .eq('campaign_id', campaignId).order('step_order', { ascending: true })
      if (c) {
        setName(c.name); setStatus(c.status)
        const f = c.audience_filter ?? {}
        setStages(Array.isArray(f.stages) ? f.stages : [])
        setSources(Array.isArray(f.sources) ? f.sources.join(', ') : '')
      }
      setSteps((st ?? []).length
        ? st.map((s) => ({ ...s, _key: s.id }))
        : [blankStep(1)])
      setLoading(false)
    }
    load()
  }, [campaignId])

  function updateStep(key, patch) {
    setSteps((ss) => ss.map((s) => (s._key === key ? { ...s, ...patch } : s)))
  }
  function addStep() {
    setSteps((ss) => [...ss, blankStep(ss.length + 1)])
  }
  function removeStep(key) {
    setSteps((ss) => ss.filter((s) => s._key !== key).map((s, i) => ({ ...s, step_order: i + 1 })))
  }

  function validate() {
    if (!name.trim()) return 'Give the campaign a name.'
    if (!steps.length) return 'Add at least one step.'
    for (const [i, s] of steps.entries()) {
      if (!s.body_template.trim()) return `Step ${i + 1} needs a message body.`
      if (s.channel === 'email' && !s.subject.trim()) return `Step ${i + 1} (email) needs a subject.`
    }
    return ''
  }

  async function save(newStatus) {
    const v = validate()
    if (v) { setError(v); return }
    setSaving(true); setError('')

    const audience_filter = {}
    if (stages.length) audience_filter.stages = stages
    const srcList = sources.split(',').map((s) => s.trim()).filter(Boolean)
    if (srcList.length) audience_filter.sources = srcList

    const channels = new Set(steps.map((s) => s.channel))
    const channel = channels.size === 1 ? [...channels][0] : 'email'

    try {
      let cid = campaignId
      if (cid) {
        const { error: e1 } = await supabase.from('campaigns')
          .update({ name: name.trim(), status: newStatus ?? status, channel, audience_filter })
          .eq('id', cid)
        if (e1) throw e1
        await supabase.from('campaign_steps').delete().eq('campaign_id', cid)
      } else {
        const { data: c, error: e2 } = await supabase.from('campaigns')
          .insert({ org_id: org.id, name: name.trim(), status: newStatus ?? status, channel, audience_filter })
          .select('id').single()
        if (e2) throw e2
        cid = c.id
      }
      const rows = steps.map((s, i) => ({
        org_id: org.id, campaign_id: cid, step_order: i + 1,
        delay_hours: Number(s.delay_hours) || 0, channel: s.channel,
        subject: s.channel === 'email' ? s.subject.trim() : null,
        body_template: s.body_template.trim(),
      }))
      const { error: e3 } = await supabase.from('campaign_steps').insert(rows)
      if (e3) throw e3
      onSaved()
    } catch (err) {
      setError(err.message ?? 'Could not save')
      setSaving(false)
    }
  }

  if (loading) return <div className="loading-line">Loading campaign…</div>

  return (
    <>
      <div className="page-head">
        <h2>{campaignId ? 'Edit campaign' : 'New campaign'}</h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
      </div>

      <div className="list-wrap" style={{ maxWidth: 720 }}>
        {error && <div className="form-error">{error}</div>}

        <div className="settings-card">
          <div className="field">
            <label htmlFor="cname">Campaign name</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New lead welcome" />
          </div>

          <div className="field" style={{ marginBottom: 6 }}>
            <label>Who gets enrolled</label>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8 }}>
              Leave both blank to enroll every lead. Combine to narrow.
            </div>
          </div>
          <div className="field">
            <label style={{ fontWeight: 500 }}>Stages</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STAGES.map((s) => {
                const on = stages.includes(s.key)
                return (
                  <button key={s.key} type="button"
                    onClick={() => setStages((st) => on ? st.filter((x) => x !== s.key) : [...st, s.key])}
                    className="chip-toggle" data-on={on}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="field">
            <label htmlFor="csrc">Sources (comma-separated)</label>
            <input id="csrc" value={sources} onChange={(e) => setSources(e.target.value)}
              placeholder="e.g. community-page, import" />
          </div>
        </div>

        <div className="seq">
          {steps.map((s, i) => (
            <div key={s._key} className="seq-step">
              <div className="seq-rail">
                <div className="seq-dot">{i + 1}</div>
                {i < steps.length - 1 && <div className="seq-line" />}
              </div>
              <div className="seq-body settings-card">
                <div className="seq-head">
                  <select value={s.delay_hours}
                    onChange={(e) => updateStep(s._key, { delay_hours: Number(e.target.value) })}
                    className="seq-select">
                    {DELAY_PRESETS.map((d) => <option key={d.h} value={d.h}>{i === 0 ? (d.h === 0 ? 'When enrolled' : d.label) : d.label}</option>)}
                    {!DELAY_PRESETS.some((d) => d.h === s.delay_hours) && (
                      <option value={s.delay_hours}>{s.delay_hours}h later</option>
                    )}
                  </select>
                  <select value={s.channel}
                    onChange={(e) => updateStep(s._key, { channel: e.target.value })}
                    className="seq-select">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                  {steps.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeStep(s._key)}>Remove</button>
                  )}
                </div>
                {s.channel === 'sms' && (
                  <div className="seq-note">SMS sends only after A2P 10DLC approval — until then these steps queue safely.</div>
                )}
                {s.channel === 'email' && (
                  <div className="field">
                    <label>Subject</label>
                    <input value={s.subject} onChange={(e) => updateStep(s._key, { subject: e.target.value })}
                      placeholder="Welcome, {{first_name}}!" />
                  </div>
                )}
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Message</label>
                  <textarea rows={s.channel === 'sms' ? 3 : 5} value={s.body_template}
                    onChange={(e) => updateStep(s._key, { body_template: e.target.value })}
                    placeholder={"Hi {{first_name}},\n\n..."} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost" style={{ width: 'auto' }} onClick={addStep}>+ Add step</button>
        </div>

        <div className="seq-tokens">
          Personalize with <code>{'{{first_name}}'}</code> or <code>{'{{name}}'}</code>.
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button className="btn btn-ghost" onClick={() => save('draft')} disabled={saving}>
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => save('active')} disabled={saving}>
            {saving ? 'Saving…' : 'Save & activate'}
          </button>
          {campaignId && status === 'active' && (
            <button className="btn btn-ghost" onClick={() => save('paused')} disabled={saving}>Pause</button>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Active campaigns enroll matching leads within ~5 minutes. Consent is checked at send time, so contacts without email/SMS consent are skipped automatically.
        </p>
      </div>
    </>
  )
}
