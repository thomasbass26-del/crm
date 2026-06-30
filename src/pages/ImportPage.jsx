import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Load SheetJS from CDN on demand (keeps the app bundle small)
let xlsxPromise = null
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js'
      s.onload = () => resolve(window.XLSX)
      s.onerror = () => reject(new Error('Could not load spreadsheet parser'))
      document.head.appendChild(s)
    })
  }
  return xlsxPromise
}

const FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'ignore', label: '— Ignore —' },
]

// Guess which field a column header maps to
function guessField(header) {
  const h = header.toLowerCase()
  if (/(^|[^a-z])(name|full ?name|client|contact)([^a-z]|$)/.test(h)) return 'name'
  if (h.includes('email') || h.includes('e-mail')) return 'email'
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell') || h.includes('tel')) return 'phone'
  return 'ignore'
}

export default function ImportPage({ org, session }) {
  const [step, setStep] = useState('upload') // upload | map | done
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [source, setSource] = useState('import')
  const [attestEmail, setAttestEmail] = useState(false)
  const [attestSms, setAttestSms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const XLSX = await loadXLSX()
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const arr = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
      if (!arr.length) { setError('That file looks empty.'); return }
      const hdr = arr[0].map((h) => String(h).trim())
      const dataRows = arr.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''))
      setHeaders(hdr)
      setRows(dataRows)
      const guess = {}
      hdr.forEach((h, i) => { guess[i] = guessField(h) })
      setMapping(guess)
      setSource(file.name.replace(/\.(csv|xlsx|xls)$/i, '').slice(0, 40) || 'import')
      setStep('map')
    } catch (err) {
      setError(err.message ?? 'Could not read that file')
    }
  }

  const mappedCount = Object.values(mapping).filter((v) => v !== 'ignore').length
  const hasContact = Object.values(mapping).some((v) => v === 'email' || v === 'phone')

  function buildRows() {
    const colFor = (field) => Object.entries(mapping).find(([, v]) => v === field)?.[0]
    const ni = colFor('name'), ei = colFor('email'), pi = colFor('phone')
    return rows.map((r) => ({
      name: ni != null ? r[ni] : '',
      email: ei != null ? r[ei] : '',
      phone: pi != null ? r[pi] : '',
    }))
  }

  async function runImport() {
    setBusy(true); setError('')
    const payload = {
      org_id: org.id,
      source: source.trim() || 'import',
      rows: buildRows(),
      attest_email_consent: attestEmail,
      attest_sms_consent: attestSms,
    }
    const { data, error: err } = await supabase.functions.invoke('import-leads', { body: payload })
    setBusy(false)
    if (err || data?.error) { setError(data?.error || err.message); return }
    setResult(data)
    setStep('done')
  }

  function reset() {
    setStep('upload'); setHeaders([]); setRows([]); setMapping({})
    setAttestEmail(false); setAttestSms(false); setResult(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <div className="page-head"><h2>Import clients</h2></div>
      <div className="list-wrap">
        {error && <div className="form-error">{error}</div>}

        {step === 'upload' && (
          <div className="settings-card">
            <p style={{ color: 'var(--ink-soft)', marginBottom: 16 }}>
              Upload a CSV or Excel file of past clients. You'll map the columns and review before anything is saved.
            </p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
              onChange={onFile}
              style={{ display: 'block', marginBottom: 8 }} />
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Imported contacts start with email and text messaging turned off, so they won't receive any campaigns until you choose to include them.
            </p>
          </div>
        )}

        {step === 'map' && (
          <>
            <div className="settings-card">
              <span className="lbl" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', display: 'block', marginBottom: 14 }}>
                Map your columns · {rows.length} rows found
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {headers.map((h, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{h || `Column ${i + 1}`}</span>
                      <span style={{ color: 'var(--ink-soft)', fontSize: 12, marginLeft: 8 }}>
                        e.g. {String(rows[0]?.[i] ?? '').slice(0, 24) || '—'}
                      </span>
                    </div>
                    <select value={mapping[i] ?? 'ignore'}
                      onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                      style={{ padding: '8px 10px', border: '1px solid var(--line-strong)', borderRadius: 8, background: 'var(--paper)' }}>
                      {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="field" style={{ marginTop: 18 }}>
                <label htmlFor="imp-source">Source label (shows on each lead)</label>
                <input id="imp-source" value={source} onChange={(e) => setSource(e.target.value)} />
              </div>
            </div>

            <div className="settings-card" style={{ borderColor: '#e4c4ba' }}>
              <span className="lbl" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--danger)', display: 'block', marginBottom: 12 }}>
                Consent — read before checking
              </span>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                By default these contacts can't be emailed or texted by campaigns. Only attest below if you have a prior relationship or existing consent to contact them. This is recorded with your name and the date.
              </p>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10, fontSize: 13 }}>
                <input type="checkbox" checked={attestEmail} onChange={(e) => setAttestEmail(e.target.checked)} style={{ marginTop: 3 }} />
                I have prior consent or an existing business relationship to email these contacts.
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                <input type="checkbox" checked={attestSms} onChange={(e) => setAttestSms(e.target.checked)} style={{ marginTop: 3 }} />
                I have express written consent to send text messages to these contacts.
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={reset}>Back</button>
              <button className="btn btn-primary" style={{ width: 'auto' }}
                disabled={busy || !hasContact}
                onClick={runImport}>
                {busy ? 'Importing…' : `Import ${rows.length} contacts`}
              </button>
            </div>
            {!hasContact && (
              <p style={{ fontSize: 12.5, color: 'var(--danger)' }}>Map at least one Email or Phone column to continue.</p>
            )}
          </>
        )}

        {step === 'done' && result && (
          <div className="settings-card">
            <div className="form-info" style={{ marginBottom: 14 }}>Import complete.</div>
            <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 0 }}>
              <div className="stat"><div className="stat-num">{result.inserted}</div><div className="stat-lbl">Imported</div></div>
              <div className="stat"><div className="stat-num">{result.skipped_duplicates}</div><div className="stat-lbl">Duplicates skipped</div></div>
              <div className="stat"><div className="stat-num">{result.skipped_invalid}</div><div className="stat-lbl">Invalid skipped</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={reset}>Import another file</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
