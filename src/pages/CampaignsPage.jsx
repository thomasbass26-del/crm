import { useCallback, useEffect, useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'
import CampaignEditor from '../components/CampaignEditor'

const STATUS_ORDER = { active: 0, draft: 1, paused: 2, archived: 3 }

export default function CampaignsPage({ org }) {
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null) // campaign id, or 'new', or null

  const load = useCallback(async () => {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name, channel, status, created_at, campaign_steps(id)')
      .order('created_at', { ascending: false })
    const ids = (campaigns ?? []).map((c) => c.id)
    const counts = {}
    if (ids.length) {
      const { data: enr } = await supabase
        .from('campaign_enrollments').select('campaign_id, status').in('campaign_id', ids)
      for (const e of enr ?? []) {
        counts[e.campaign_id] = counts[e.campaign_id] ?? { active: 0, completed: 0 }
        if (e.status === 'active') counts[e.campaign_id].active++
        if (e.status === 'completed') counts[e.campaign_id].completed++
      }
    }
    const mapped = (campaigns ?? []).map((c) => ({ ...c, counts: counts[c.id] ?? { active: 0, completed: 0 } }))
    mapped.sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || (new Date(b.created_at) - new Date(a.created_at)))
    setRows(mapped)
  }, [])

  useEffect(() => { load() }, [load])

  if (editing) {
    return (
      <CampaignEditor org={org} campaignId={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }} />
    )
  }

  if (rows === null) return <div className="loading-line">Loading campaigns…</div>

  return (
    <>
      <div className="page-head">
        <h2>Campaigns</h2>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setEditing('new')}>
          New campaign
        </button>
      </div>
      <div className="list-wrap">
        {rows.length === 0 && (
          <div className="empty-board">
            No campaigns yet. Create one and the drip engine will enroll matching leads automatically — every send checks consent first.
          </div>
        )}
        {rows.map((c) => (
          <div key={c.id} className="row-card" style={{ cursor: 'pointer' }} onClick={() => setEditing(c.id)}>
            <div>
              <div className="title">{c.name}</div>
              <div className="sub">
                {c.campaign_steps?.length ?? 0} step{(c.campaign_steps?.length ?? 0) === 1 ? '' : 's'} · {c.channel} ·{' '}
                {c.counts.active} active, {c.counts.completed} completed
              </div>
            </div>
            <span className={`status-tag ${c.status === 'active' ? 'active' : ''}`}>{c.status}</span>
          </div>
        ))}
      </div>
    </>
  )
}
