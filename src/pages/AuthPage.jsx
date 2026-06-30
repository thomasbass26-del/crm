import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Trilens from '../components/Trilens'

export default function AuthPage() {
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.session) {
          // signed in immediately (email confirmation disabled)
        } else {
          setInfo('Check your email to confirm your account, then sign in.')
          setMode('signin')
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-brand">
        <div className="trilens">
          <Trilens light size={42} />
          <span className="trilens-name">triskope</span>
        </div>
        <div className="auth-tagline">
          Three lenses. <em>One vision.</em>
        </div>
        <div className="auth-foot">Strategy · Build · Growth</div>
      </div>

      <div className="auth-form-side">
        <form className="auth-card" onSubmit={submit}>
          <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="sub">
            {mode === 'signin'
              ? 'Sign in to your pipeline.'
              : 'Start managing leads in minutes.'}
          </p>

          {error && <div className="form-error">{error}</div>}
          {info && <div className="form-info">{info}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} required autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} required minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <p className="auth-switch">
            {mode === 'signin' ? (
              <>New to Triskope? <button type="button" onClick={() => { setMode('signup'); setError('') }}>Create an account</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={() => { setMode('signin'); setError('') }}>Sign in</button></>
            )}
          </p>
        </form>
      </div>
    </div>
  )
}
