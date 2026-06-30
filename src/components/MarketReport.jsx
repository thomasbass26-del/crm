import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export default function MarketReport({ lead }) {
  const [area, setArea] = useState(lead.community_name || '')
  const [stats, setStats] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [loadingEst, setLoadingEst] = useState(false)
  const [note, setNote] = useState('')
  const [listingUrl, setListingUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [saved, setSaved] = useState([])

  const loadSaved = useCallback(async () => {
    const { data } = await supabase.from('market_reports')
      .select('id, area_label, generated_at, status, report_html')
      .eq('sent_to_lead', lead.id)
      .order('generated_at', { ascending: false })
    setSaved(data ?? [])
  }, [lead.id])

  useEffect(() => { loadSaved() }, [loadSaved])

  function openSaved(r) {
    if (!r.report_html) return
    const w = window.open('', '_blank')
    if (w) { w.document.write(r.report_html); w.document.close() }
  }
  const fmtR = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  async function estimate() {
    if (!area.trim()) { setMsg({ type: 'error', text: 'Enter a neighborhood or area first.' }); return }
    setLoadingEst(true); setMsg(null); setStats(null)
    const { data, error } = await supabase.functions.invoke('market-estimate', {
      body: { org_id: lead.org_id, area_label: area.trim() },
    })
    setLoadingEst(false)
    if (error || data?.error) { setMsg({ type: 'error', text: data?.error || error.message }); return }
    const s = data.stats
    setStats(s)
    setConfidence(s.confidence ?? 'low')
    setReviewed((s.confidence ?? 'low') === 'high') // low/medium force a review
  }

  function setField(k, v) { setStats((s) => ({ ...s, [k]: v })) }

  async function send() {
    setSending(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('market-report-send', {
      body: { lead_id: lead.id, area_label: area.trim(), stats, agent_note: note, listing_url: listingUrl.trim() || null, send: true },
    })
    setSending(false)
    if (error || data?.error) { setMsg({ type: 'error', text: data?.error || error.message }); return }
    setMsg({ type: 'info', text: 'Market report sent and logged to the timeline.' })
    setStats(null); setNote(''); loadSaved()
  }

  async function saveDraft() {
    setSending(true); setMsg(null)
    const { data, error: err } = await supabase.functions.invoke('market-report-send', {
      body: { lead_id: lead.id, area_label: area.trim(), stats, agent_note: note, listing_url: listingUrl.trim() || null, send: false },
    })
    setSending(false)
    if (err || data?.error) { setMsg({ type: 'error', text: data?.error || err.message }); return }
    setMsg({ type: 'info', text: 'Report saved to this profile.' })
    loadSaved()
  }

  const isEstimate = !stats || (stats.source ?? 'ai_estimate') !== 'mls'
  const needsReview = confidence === 'low' || confidence === 'medium'

  return (
    <div className="panel">
      <div className="panel-title">Market report</div>

      {saved.length > 0 && (
        <div className="saved-reports">
          <div className="saved-label">Saved reports</div>
          {saved.map((r) => (
            <div key={r.id} className="saved-row">
              <button className="saved-open" onClick={() => openSaved(r)} title="View report">
                {r.area_label}
              </button>
              <span className="saved-meta">{fmtR(r.generated_at)}{r.status === 'sent' ? ' · sent' : ' · draft'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="field">
        <label>Neighborhood / area</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={area} onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Carolina Forest, Myrtle Beach SC" style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={estimate} disabled={loadingEst}>
            {loadingEst ? 'Estimating…' : stats ? 'Re-estimate' : 'Get estimate'}
          </button>
        </div>
      </div>

      {msg && <div className={msg.type === 'error' ? 'form-error' : 'form-info'}>{msg.text}</div>}

      {stats && (
        <>
          {isEstimate && (
            <div className="est-flag" data-conf={confidence}>
              {confidence === 'high' ? 'Estimate · review optional'
                : `Preliminary estimate · ${confidence} confidence · review the numbers before sending`}
              {stats.notes && <div className="est-caveat">{stats.notes}</div>}
            </div>
          )}

          <div className="mr-fields">
            <div className="field"><label>Median price ($)</label>
              <input type="number" value={stats.median_price ?? ''} onChange={(e) => setField('median_price', e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="field"><label>Days on market</label>
              <input type="number" value={stats.dom ?? ''} onChange={(e) => setField('dom', e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="field"><label>Active listings</label>
              <input type="number" value={stats.active_listings ?? ''} onChange={(e) => setField('active_listings', e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="field"><label>Price trend</label>
              <input value={stats.price_trend ?? ''} onChange={(e) => setField('price_trend', e.target.value)} /></div>
          </div>
          <div className="field"><label>Inventory note</label>
            <input value={stats.inventory_note ?? ''} onChange={(e) => setField('inventory_note', e.target.value)} /></div>

          <div className="field"><label>Listings link (your website — optional)</label>
            <input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)}
              placeholder="https://yoursite.com/carolina-forest" /></div>

          <div className="field"><label>Personal note to the lead (optional)</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={`Hi ${lead.name?.split(' ')[0] ?? ''}, thought you'd want an update on ${area || 'your area'}…`}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)', fontFamily: 'var(--font-body)', resize: 'vertical' }} /></div>

          {isEstimate && needsReview && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, margin: '4px 0 12px' }}>
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} style={{ marginTop: 3 }} />
              I've reviewed these estimated figures and they're reasonable to send.
            </label>
          )}

          {!lead.consent_email && (
            <div className="form-error">This lead hasn't consented to email, so the report can't be sent. You can still generate it.</div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ width: 'auto' }}
              onClick={saveDraft}
              disabled={sending || (needsReview && !reviewed)}>
              {sending ? 'Saving…' : 'Save to profile'}
            </button>
            <button className="btn btn-primary" style={{ width: 'auto' }}
              onClick={send}
              disabled={sending || !lead.email || !lead.consent_email || (needsReview && !reviewed)}>
              {sending ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
