import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoUrl from '../assets/triskope-logo.jpg'
import DashboardPage from '../pages/DashboardPage'
import PipelinePage from '../pages/PipelinePage'
import LeadProfilePage from '../pages/LeadProfilePage'
import CampaignsPage from '../pages/CampaignsPage'
import ImportPage from '../pages/ImportPage'
import TeamPage from '../pages/TeamPage'
import SettingsPage from '../pages/SettingsPage'
import BrandProfilePage from '../pages/BrandProfilePage'

export default function Shell({ session, org }) {
  const [tab, setTab] = useState('dashboard')
  const [openLeadId, setOpenLeadId] = useState(null)
  const canManage = ['owner', 'admin'].includes(org.role)

  const tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'campaigns', label: 'Campaigns' },
    ...(canManage ? [{ key: 'import', label: 'Import' }] : []),
    ...(canManage ? [{ key: 'team', label: 'Team' }] : []),
    { key: 'brand', label: 'Brand' },
    { key: 'settings', label: 'Settings' },
  ]

  function go(key) { setOpenLeadId(null); setTab(key) }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="trilens" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
          <img src={logoUrl} alt="Triskope — see everything together" className="sidebar-logo" />
        </div>
        <div className="org-chip" title={org.name}>{org.name}</div>

        {tabs.map((t) => (
          <button key={t.key}
            className={`nav-item ${tab === t.key && !openLeadId ? 'active' : ''}`}
            onClick={() => go(t.key)}>
            <span className="dot" /> {t.label}
          </button>
        ))}

        <div className="sidebar-foot">
          <div className="who" title={session.user.email}>{session.user.email}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        {openLeadId ? (
          <LeadProfilePage org={org} leadId={openLeadId} onBack={() => setOpenLeadId(null)} />
        ) : (
          <>
            {tab === 'dashboard' && <DashboardPage org={org} session={session} />}
            {tab === 'pipeline' && <PipelinePage org={org} session={session} onOpenLead={setOpenLeadId} />}
            {tab === 'campaigns' && <CampaignsPage org={org} />}
            {tab === 'import' && <ImportPage org={org} session={session} />}
            {tab === 'team' && <TeamPage org={org} session={session} />}
            {tab === 'brand' && <BrandProfilePage org={org} session={session} />}
            {tab === 'settings' && <SettingsPage org={org} session={session} />}
          </>
        )}
      </main>
    </div>
  )
}
