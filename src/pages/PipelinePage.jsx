import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, STAGES } from '../lib/supabase'
import { useMembers, shortName } from '../lib/useMembers'
import AddLeadModal from '../components/AddLeadModal'

function tierOf(lead) {
  return lead.score_rationale?.tier
    ?? (lead.score == null ? null : lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold')
}

export default function PipelinePage({ org, session, onOpenLead }) {
  const [leads, setLeads] = useState(null)
    const [dragOver, setDragOver] = useState(null)
  const [filter, setFilter] = useState('all') // all | mine
  const [addStage, setAddStage] = useState(null) // stage key when adding, else null
  const dragId = useRef(null)
  const members = useMembers(org.id)
  const emailById = Object.fromEntries(members.map((m) => [m.user_id, m.email]))

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('leads').select('*')
      .order('created_at', { ascending: false }).limit(500)
    setLeads(data ?? [])
  }, [])

  useEffect(() => {
    load()
    const channel = supabase.channel('leads-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, load)
      .subscribe()
    const poll = setInterval(load, 25000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [load])

  async function moveLead(id, stage) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)))
    const { error } = await supabase.from('leads').update({ stage }).eq('id', id)
    if (error) load()
  }

  if (leads === null) return <div className="loading-line">Loading pipeline…</div>

  const visible = filter === 'mine'
    ? leads.filter((l) => l.assigned_agent === session.user.id)
    : leads

  return (
    <>
      <div className="page-head">
        <h2>Pipeline</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(22,20,18,0.05)', borderRadius: 8, padding: 3 }}>
            <button className="btn btn-sm" onClick={() => setFilter('all')}
              style={{ background: filter === 'all' ? 'var(--paper)' : 'transparent', border: 'none', color: 'var(--ink)' }}>All</button>
            <button className="btn btn-sm" onClick={() => setFilter('mine')}
              style={{ background: filter === 'mine' ? 'var(--paper)' : 'transparent', border: 'none', color: 'var(--ink)' }}>My leads</button>
          </div>
          <span className="meta">{visible.length} lead{visible.length === 1 ? '' : 's'} · live</span>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => setAddStage('fresh')}>+ Add lead</button>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="empty-board">
          {filter === 'mine'
            ? 'No leads assigned to you yet. Open a lead and set its owner to claim it.'
            : <>No leads yet. Your community pages feed this board automatically — or send a test through the <code>lead-capture</code> endpoint and watch it appear here.</>}
        </div>
      )}

      <div className="board">
        {STAGES.map((s) => {
          const inCol = visible.filter((l) => l.stage === s.key)
          return (
            <div key={s.key}
              className={`col ${dragOver === s.key ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(s.key) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { setDragOver(null); if (dragId.current) moveLead(dragId.current, s.key); dragId.current = null }}>
              <div className="col-head">
                <span className="name">{s.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="count">{inCol.length}</span>
                  <button className="col-add" title={`Add to ${s.label}`} onClick={() => setAddStage(s.key)}>+</button>
                </span>
              </div>
              <div className="col-body">
                {inCol.map((l) => {
                  const tier = tierOf(l)
                  return (
                    <div key={l.id} className="card" draggable
                      onDragStart={() => { dragId.current = l.id }}
                      onClick={() => onOpenLead(l.id)}>
                      <div className="name">{l.name}</div>
                      <div className="src">{l.source ?? '—'}</div>
                      <div className="card-foot">
                        <div className="consent-dots">
                          <span className={`cdot ${l.consent_email ? 'on' : ''}`}>EM</span>
                          <span className={`cdot ${l.consent_sms ? 'on' : ''}`}>SMS</span>
                        </div>
                        {l.score != null
                          ? <span className={`score-pill ${tier}`}>{l.score}</span>
                          : <span className="score-pill none">…</span>}
                      </div>
                      {l.assigned_agent && (
                        <div className="assignee-chip" title={emailById[l.assigned_agent] ?? 'Assigned'}>
                          {shortName(emailById[l.assigned_agent])}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {addStage && (
        <AddLeadModal org={org} session={session} defaultStage={addStage}
          onClose={() => setAddStage(null)}
          onAdded={(id) => { setAddStage(null); load(); onOpenLead(id) }} />
      )}
    </>
  )
}
