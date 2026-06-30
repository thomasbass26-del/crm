import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FIELDS = [
  { k: 'display_name', label: 'Name', ph: 'Jordan Rivera' },
  { k: 'title', label: 'Title', ph: 'REALTOR®' },
  { k: 'brokerage', label: 'Brokerage', ph: 'Coldwell Banker Sea Coast Advantage' },
  { k: 'phone', label: 'Phone', ph: '(843) 555-0142' },
  { k: 'email', label: 'Email', ph: 'jordan@example.com' },
  { k: 'website', label: 'Website', ph: 'jordanrivera.com' },
  { k: 'license_no', label: 'License #', ph: 'SC-123456' },
]

export default function BrandProfilePage({ org, session }) {
  const [p, setP] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [msg, setMsg] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingHead, setUploadingHead] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('brand_profiles')
        .select('*').eq('org_id', org.id).eq('user_id', session.user.id).maybeSingle()
      setP(data ?? {
        org_id: org.id, user_id: session.user.id,
        display_name: '', title: 'REALTOR®', brokerage: '', phone: '',
        email: session.user.email, website: '', license_no: '', bio: '',
        brand_color: '#14302b', logo_path: null, headshot_path: null,
      })
    }
    load()
  }, [org.id, session.user.id, session.user.email])

  function set(k, v) { setP((x) => ({ ...x, [k]: v })); setMsg(null); setSaved(false) }

  function publicUrl(path) {
    if (!path) return null
    return supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
  }

  async function uploadAsset(kind, file, setUploading) {
    setUploading(true); setMsg(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${org.id}/${session.user.id}/${kind}-${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
      if (error) throw error
      set(kind === 'logo' ? 'logo_path' : 'headshot_path', path)
    } catch (err) {
      setMsg({ type: 'error', text: err.message ?? 'Upload failed' })
    } finally { setUploading(false) }
  }

  async function save() {
    setBusy(true); setMsg(null)
    const row = { ...p, org_id: org.id, user_id: session.user.id, email: p.email || session.user.email }
    delete row.id; delete row.updated_at
    const { error } = await supabase.from('brand_profiles')
      .upsert(row, { onConflict: 'org_id,user_id' })
    setBusy(false)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  if (p === null) return <div className="loading-line">Loading brand profile…</div>

  const logoUrl = publicUrl(p.logo_path)
  const headUrl = publicUrl(p.headshot_path)

  return (
    <>
      <div className="page-head"><h2>Brand profile</h2><span className="meta">Used on your market reports</span></div>
      <div className="list-wrap" style={{ maxWidth: 640 }}>
        {msg && <div className={msg.type === 'error' ? 'form-error' : 'form-info'}>{msg.text}</div>}

        <div className="settings-card">
          <div className="brand-uploads">
            <div className="brand-up">
              <span className="lbl">Logo</span>
              <div className="brand-preview">
                {logoUrl ? <img src={logoUrl} alt="logo" style={{ maxHeight: 54, maxWidth: 140, borderRadius: 6 }} />
                  : <div className="brand-ph">No logo</div>}
              </div>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && uploadAsset('logo', e.target.files[0], setUploadingLogo)} />
              </label>
            </div>
            <div className="brand-up">
              <span className="lbl">Headshot</span>
              <div className="brand-preview">
                {headUrl ? <img src={headUrl} alt="headshot" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div className="brand-ph" style={{ borderRadius: '50%', width: 54, height: 54 }}>Photo</div>}
              </div>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                {uploadingHead ? 'Uploading…' : 'Upload headshot'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && uploadAsset('headshot', e.target.files[0], setUploadingHead)} />
              </label>
            </div>
          </div>

          {FIELDS.map((f) => (
            <div className="field" key={f.k}>
              <label>{f.label}</label>
              <input value={p[f.k] ?? ''} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} />
            </div>
          ))}

          <div className="field">
            <label>Short bio / tagline</label>
            <textarea rows={2} value={p.bio ?? ''} placeholder="Coastal luxury specialist serving the Grand Strand."
              onChange={(e) => set('bio', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)', fontFamily: 'var(--font-body)', resize: 'vertical' }} />
          </div>

          <div className="field">
            <label>Brand color (drives report accents)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={p.brand_color ?? '#14302b'} onChange={(e) => set('brand_color', e.target.value)}
                style={{ width: 48, height: 38, padding: 2, border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }} />
              <input value={p.brand_color ?? '#14302b'} onChange={(e) => set('brand_color', e.target.value)} style={{ width: 120 }} />
            </div>
          </div>

          <button className={`btn ${saved ? 'btn-saved' : 'btn-primary'}`} style={{ width: 'auto' }}
            onClick={save} disabled={busy || saved}>
            {busy ? 'Saving…' : saved ? 'Saved \u2713' : 'Save brand profile'}
          </button>
        </div>
      </div>
    </>
  )
}
