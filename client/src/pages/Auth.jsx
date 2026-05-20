import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../services/api'
import s from './Auth.module.css'

/* ── Floating illustration panel ───────────────────────────────────────────── */
function IllustrationPanel({ isRegister }) {
  return (
    <aside className={s.panel}>
      <div className={s.panelInner}>

        {/* Brand */}
        <div className={s.panelBrand}>
          <div className={s.panelBrandIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          ClinicalScribe AI
        </div>

        {/* Floating cards */}
        <div className={s.cardStack}>

          {/* SOAP note card */}
          <div className={`${s.floatCard} ${s.card1}`}>
            <div className={s.cardHeader}>
              <span className={s.cardDot} style={{ background: '#FF5F57' }} />
              <span className={s.cardDot} style={{ background: '#FFBD2E' }} />
              <span className={s.cardDot} style={{ background: '#28CA41' }} />
              <span className={s.cardLabel}>SOAP Note</span>
              <span className={s.cardLive}><span className={s.liveDot} />Live</span>
            </div>
            {[
              { l: 'S', t: 'Subjective',  c: '#7C3AED', v: '45 y/o, fever 38.5°C, cough 3 days' },
              { l: 'O', t: 'Objective',   c: '#0369A1', v: 'SpO₂ 96%, HR 94, RR 20' },
              { l: 'A', t: 'Assessment',  c: '#DC2626', v: 'Community-acquired pneumonia' },
              { l: 'P', t: 'Plan',        c: '#059669', v: 'Amoxicillin 875mg BID × 7d' },
            ].map((row, i) => (
              <div key={row.l} className={s.soapRow} style={{ animationDelay: `${i * 0.4}s` }}>
                <span className={s.soapBadge} style={{ background: row.c + '18', color: row.c }}>{row.l}</span>
                <div>
                  <span className={s.soapLbl} style={{ color: row.c }}>{row.t}</span>
                  <p className={s.soapVal}>{row.v}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats pill — floats top right */}
          <div className={`${s.floatCard} ${s.card2}`}>
            <div className={s.statRow}>
              <div className={s.statIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <p className={s.statNum}>60 sec</p>
                <p className={s.statTxt}>Note generation</p>
              </div>
            </div>
          </div>

          {/* Languages pill — floats bottom left */}
          <div className={`${s.floatCard} ${s.card3}`}>
            <div className={s.statRow}>
              <div className={s.statIcon} style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div>
                <p className={s.statNum}>10 Lang</p>
                <p className={s.statTxt}>Tamil, Hindi & more</p>
              </div>
            </div>
          </div>

          {/* Waveform card — floats right */}
          <div className={`${s.floatCard} ${s.card4}`}>
            <p className={s.waveLabel}>
              <span className={s.recDot} />
              Recording…
            </p>
            <div className={s.waveRow}>
              {Array.from({ length: 28 }, (_, i) => (
                <span
                  key={i}
                  className={s.waveBar}
                  style={{
                    animationDelay:    `${(i * 0.09) % 1.4}s`,
                    animationDuration: `${0.6 + (i % 4) * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Bottom copy */}
        <div className={s.panelFoot}>
          <p className={s.panelHeadline}>
            {isRegister ? 'Join thousands of clinicians' : 'Welcome back, Doctor'}
          </p>
          <p className={s.panelSub}>
            AI-powered SOAP notes, prescriptions & more — in under 60 seconds.
          </p>
        </div>

      </div>
    </aside>
  )
}

/* ── Auth page ──────────────────────────────────────────────────────────────── */
export default function Auth({ mode = 'login', onAuth }) {
  const navigate   = useNavigate()
  const isRegister = mode === 'register'

  const [form, setForm]       = useState({ email: '', password: '', full_name: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const payload = isRegister
        ? { email: form.email, password: form.password, full_name: form.full_name }
        : { email: form.email, password: form.password }
      const res = isRegister ? await authApi.register(payload) : await authApi.login(payload)
      const { access_token, user } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      onAuth?.(user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <IllustrationPanel isRegister={isRegister} />

      <main className={s.formPanel}>
        <div className={s.formCard}>

          {/* Mobile brand */}
          <div className={s.mobileBrand}>
            <div className={s.mobileBrandIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            ClinicalScribe AI
          </div>

          <h1 className={s.formTitle}>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className={s.formSub}>
            {isRegister
              ? 'Start documenting clinical encounters with AI.'
              : 'Sign in to your account to continue.'}
          </p>

          <form onSubmit={handleSubmit} className={s.form}>
            {isRegister && (
              <div className={s.field}>
                <label className={s.label}>Full Name</label>
                <input name="full_name" type="text" className={s.input}
                  placeholder="Dr. Jane Smith" value={form.full_name} onChange={handleChange} />
              </div>
            )}
            <div className={s.field}>
              <label className={s.label}>Email Address</label>
              <input name="email" type="email" className={s.input}
                placeholder="you@clinic.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className={s.field}>
              <label className={s.label}>Password</label>
              <input name="password" type="password" className={s.input}
                placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
                value={form.password} onChange={handleChange}
                required minLength={isRegister ? 8 : 1} />
            </div>

            {error && <p className={s.error}>{error}</p>}

            <button type="submit" className={s.submitBtn} disabled={loading}>
              {loading && <span className={s.spinner} />}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className={s.switchText}>
            {isRegister
              ? <> Already have an account?{' '}<Link to="/login"    className={s.switchLink}>Sign in</Link></>
              : <> New to ClinicalScribe?{' '} <Link to="/register" className={s.switchLink}>Create account</Link></>
            }
          </p>
        </div>
      </main>
    </div>
  )
}
