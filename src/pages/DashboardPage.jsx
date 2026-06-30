import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'

const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]))
const FUNNEL = ['fresh', 'contacted', 'qualified', 'under_contract', 'closed']

function tierOf(l) {
  return l.score_rationale?.tier
    ?? (l.score == null ? 'unscored' : l.score >= 70 ? 'hot' : l.score >= 40 ? 'warm' : 'cold')
}
function weekKey(iso) {
  const d = new Date(iso); const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}
const fmtWeek = (k) => new Date(k).toLocaleDateString([], { month: 'short', day: 'numeric' })

export default function DashboardPage({ org, session }) {
  const [leads, setLeads] = useState(null)
  const [activeEnroll, setActiveEnroll] = useState(0)
  const canSeeAll = ['owner', 'admin'].includes(org.role)
  const [scope, setScope] = useState(canSeeAll ? 'org' : 'mine')

  const load = useCallback(async () => {
    const { data } = await supabase.from('leads')
      .select('id, stage, score, score_rationale, source, assigned_agent, created_at')
      .limit(2000)
    setLeads(data ?? [])
    const { count } = await supabase.from('campaign_enrollments')
      .select('id', { count: 'exact', head: true }).eq('status', 'active')
    setActiveEnroll(count ?? 0)
  }, [])

  useEffect(() => { load() }, [load])

  // ---- Bulk scoring of imported/unscored leads ----
  const [unscored, setUnscored] = useState(0)
  const [scoring, setScoring] = useState(false)
  const [scoreProgress, setScoreProgress] = useState(null)
  const canManage = ['owner', 'admin'].includes(org.role)

  const refreshUnscored = useCallback(async () => {
    const { count } = await supabase.from('leads')
      .select('id', { count: 'exact', head: true }).is('score', null)
    setUnscored(count ?? 0)
  }, [])
  useEffect(() => { refreshUnscored() }, [refreshUnscored])

  async function runBulkScore() {
    setScoring(true)
    setScoreProgress({ done: 0 })
    let total = unscored
    let done = 0
    try {
      // loop batches until none remain (cap iterations as a safety)
      for (let i = 0; i < 200; i++) {
        const { data, error } = await supabase.functions.invoke('bulk-score', {
          body: { org_id: org.id, batch: 15 },
        })
        if (error || data?.error) break
        done += data.scored
        setScoreProgress({ done, remaining: data.remaining })
        if (data.remaining === 0 || data.scored === 0) break
      }
    } finally {
      setScoring(false)
      await refreshUnscored()
      await load()
    }
  }

  const view = useMemo(() => {
    if (!leads) return null
    const scoped = scope === 'mine'
      ? leads.filter((l) => l.assigned_agent === session.user.id)
      : leads

    const byStage = Object.fromEntries(STAGES.map((s) => [s.key, 0]))
    const bySource = {}
    const sourceScore = {}
    const byTier = { hot: 0, warm: 0, cold: 0, unscored: 0 }
    const byWeek = {}

    for (const l of scoped) {
      byStage[l.stage] = (byStage[l.stage] ?? 0) + 1
      const src = l.source || 'unknown'
      bySource[src] = (bySource[src] ?? 0) + 1
      if (l.score != null) {
        sourceScore[src] = sourceScore[src] ?? { sum: 0, n: 0 }
        sourceScore[src].sum += l.score; sourceScore[src].n++
      }
      byTier[tierOf(l)]++
      const w = weekKey(l.created_at)
      byWeek[w] = (byWeek[w] ?? 0) + 1
    }

    const total = scoped.length
    const closed = byStage.closed ?? 0
    const lost = byStage.lost ?? 0
    const settled = closed + lost
    const convRate = settled > 0 ? Math.round((closed / settled) * 100) : null

    const sources = Object.entries(bySource)
      .map(([name, count]) => ({
        name, count,
        avg: sourceScore[name] ? Math.round(sourceScore[name].sum / sourceScore[name].n) : null,
      }))
      .sort((a, b) => b.count - a.count).slice(0, 6)

    const weeks = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 7)
      const k = weekKey(d.toISOString())
      weeks.push({ k, label: fmtWeek(k), count: byWeek[k] ?? 0 })
    }

    return { total, byStage, byTier, sources, weeks, convRate, hot: byTier.hot, closed }
  }, [leads, scope, session.user.id])

  if (view === null) return <div className="loading-line">Loading dashboard…</div>

  const maxWeek = Math.max(1, ...view.weeks.map((w) => w.count))
  const maxFunnel = Math.max(1, view.byStage.fresh ?? 0)
  const maxSource = Math.max(1, ...view.sources.map((s) => s.count))
  const tierColors = { hot: 'var(--hot)', warm: 'var(--warm-tier)', cold: 'var(--cold)', unscored: 'var(--line-strong)' }

  return (
    <>
      <div className="page-head">
        <h2>Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {canSeeAll && (
            <div style={{ display: 'flex', gap: 4, background: 'rgba(22,20,18,0.05)', borderRadius: 8, padding: 3 }}>
              <button className="btn btn-sm" onClick={() => setScope('org')}
                style={{ background: scope === 'org' ? 'var(--paper)' : 'transparent', border: 'none', color: 'var(--ink)' }}>Whole team</button>
              <button className="btn btn-sm" onClick={() => setScope('mine')}
                style={{ background: scope === 'mine' ? 'var(--paper)' : 'transparent', border: 'none', color: 'var(--ink)' }}>Just me</button>
            </div>
          )}
          <span className="meta">{view.total} lead{view.total === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="dash">
        {canManage && unscored > 0 && (
          <div className="score-banner">
            <div>
              <strong>{unscored}</strong> lead{unscored === 1 ? '' : 's'} haven't been scored yet
              {scoreProgress && scoring && <span className="score-prog"> · scored {scoreProgress.done}, {scoreProgress.remaining ?? '…'} to go</span>}
            </div>
            <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={runBulkScore} disabled={scoring}>
              {scoring ? 'Scoring…' : 'Score them now'}
            </button>
          </div>
        )}
        {/* headline stats */}
        <div className="stat-row">
          <div className="stat"><div className="stat-num">{view.total}</div><div className="stat-lbl">Total leads</div></div>
          <div className="stat"><div className="stat-num" style={{ color: 'var(--hot)' }}>{view.hot}</div><div className="stat-lbl">Hot leads</div></div>
          <div className="stat"><div className="stat-num">{view.closed}</div><div className="stat-lbl">Closed</div></div>
          <div className="stat"><div className="stat-num">{view.convRate == null ? '—' : view.convRate + '%'}</div><div className="stat-lbl">Close rate</div></div>
          <div className="stat"><div className="stat-num">{activeEnroll}</div><div className="stat-lbl">In drip campaigns</div></div>
        </div>

        <div className="dash-grid">
          {/* Funnel */}
          <div className="panel">
            <div className="panel-title">Pipeline funnel</div>
            <div className="funnel">
              {FUNNEL.map((k) => {
                const n = view.byStage[k] ?? 0
                const pct = Math.round((n / maxFunnel) * 100)
                return (
                  <div key={k} className="funnel-row">
                    <span className="funnel-label">{STAGE_LABEL[k]}</span>
                    <div className="funnel-bar-track">
                      <div className="funnel-bar" style={{ width: `${Math.max(pct, n > 0 ? 6 : 0)}%` }} />
                    </div>
                    <span className="funnel-num">{n}</span>
                  </div>
                )
              })}
            </div>
            {(view.byStage.lost ?? 0) > 0 && (
              <div className="panel-foot">{view.byStage.lost} lost</div>
            )}
          </div>

          {/* New leads per week */}
          <div className="panel">
            <div className="panel-title">New leads · last 8 weeks</div>
            <div className="spark">
              {view.weeks.map((w) => (
                <div key={w.k} className="spark-col" title={`${w.count} leads`}>
                  <div className="spark-bar" style={{ height: `${(w.count / maxWeek) * 100}%` }}>
                    {w.count > 0 && <span className="spark-val">{w.count}</span>}
                  </div>
                  <span className="spark-label">{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Score mix */}
          <div className="panel">
            <div className="panel-title">Score mix</div>
            <div className="tier-bar">
              {['hot', 'warm', 'cold', 'unscored'].map((t) => {
                const n = view.byTier[t]
                if (!n) return null
                const pct = (n / view.total) * 100
                return <div key={t} className="tier-seg" style={{ width: `${pct}%`, background: tierColors[t] }} title={`${t}: ${n}`} />
              })}
            </div>
            <div className="tier-legend">
              {['hot', 'warm', 'cold', 'unscored'].map((t) => (
                <span key={t} className="tier-key">
                  <i style={{ background: tierColors[t] }} /> {t} <b>{view.byTier[t]}</b>
                </span>
              ))}
            </div>
          </div>

          {/* Top sources */}
          <div className="panel">
            <div className="panel-title">Top lead sources</div>
            {view.sources.length === 0 ? (
              <div className="panel-empty">No leads yet.</div>
            ) : (
              <div className="src-list">
                {view.sources.map((s) => (
                  <div key={s.name} className="src-row">
                    <span className="src-name" title={s.name}>{s.name}</span>
                    <div className="src-bar-track">
                      <div className="src-bar" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                    </div>
                    <span className="src-count">{s.count}</span>
                    <span className="src-avg">{s.avg == null ? '' : `avg ${s.avg}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
