import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import s from './Landing.module.css'

/* ── Typewriter SOAP card ──────────────────────────────────────────────────── */
const SOAP_LINES = [
  { letter: 'S', label: 'Subjective', color: '#6D28D9',
    text: '45 y/o male, 3-day productive cough, fever 38.5°C, pleuritic chest pain right side. No prior cardiac history.' },
  { letter: 'O', label: 'Objective',  color: '#0369A1',
    text: 'Temp 38.5°C · HR 94 · RR 20 · SpO₂ 96% RA. Decreased breath sounds RLL. Dullness to percussion.' },
  { letter: 'A', label: 'Assessment', color: '#B91C1C',
    text: 'Community-acquired pneumonia (J18.9). RLL consolidation, bacterial etiology most likely.' },
  { letter: 'P', label: 'Plan',       color: '#047857',
    text: 'Amoxicillin-clavulanate 875mg PO BID × 7d. CXR today. Follow-up in 5 days or if worsening.' },
]

function LiveSOAPCard() {
  const [visibleLine, setVisibleLine] = useState(0)
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (visibleLine >= SOAP_LINES.length) return
    const text = SOAP_LINES[visibleLine].text
    if (chars < text.length) {
      const t = setTimeout(() => setChars(c => c + 1), 18)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => { setVisibleLine(v => v + 1); setChars(0) }, 600)
    return () => clearTimeout(t)
  }, [visibleLine, chars])

  return (
    <div className={s.card}>
      <div className={s.cardTop}>
        <div className={s.cardTopLeft}>
          <div className={s.cardIcon}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={s.cardTopTitle}>SOAP Note</span>
        </div>
        <span className={s.cardLive}><span className={s.cardLiveDot} />Live</span>
      </div>

      {SOAP_LINES.map((line, i) => (
        <div
          key={line.letter}
          className={`${s.soapLine} ${i <= visibleLine ? s.soapLineOn : ''}`}
          style={{ borderLeftColor: line.color }}
        >
          <div className={s.soapBadge} style={{ background: line.color + '18', color: line.color }}>
            {line.letter}
          </div>
          <div className={s.soapBody}>
            <span className={s.soapLabel} style={{ color: line.color }}>{line.label}</span>
            <p className={s.soapText}>
              {i < visibleLine
                ? line.text
                : i === visibleLine
                  ? line.text.slice(0, chars) + (chars < line.text.length ? '▌' : '')
                  : ''}
            </p>
          </div>
        </div>
      ))}

      <div className={s.cardFoot}>GPT-4o · Claude · Whisper</div>
    </div>
  )
}

/* ── Waveform badge ────────────────────────────────────────────────────────── */
function Waveform() {
  return (
    <div className={s.wave}>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className={s.waveBar}
          style={{ animationDelay: `${(i * 0.11) % 1.3}s`, animationDuration: `${0.7 + (i % 3) * 0.2}s` }} />
      ))}
    </div>
  )
}

/* ── Data ──────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { num:'01', color:'#6D28D9', icon:'◎', title:'Real-Time Transcription',  desc:'Medical AI converts live speech into timestamped clinical transcripts with full medical vocabulary recognition.' },
  { num:'02', color:'#0369A1', icon:'⬡', title:'Automated SOAP Notes',     desc:'Every encounter becomes a structured Subjective, Objective, Assessment, and Plan note — instantly.' },
  { num:'03', color:'#B91C1C', icon:'◈', title:'Entity Extraction',         desc:'Diagnoses, drugs, dosages, and procedures extracted and linked to ICD-10 and SNOMED CT codes.' },
  { num:'04', color:'#047857', icon:'▣', title:'Prescription Generator',    desc:'AI structures medications from the SOAP plan into a formatted, downloadable prescription with spell-check.' },
  { num:'05', color:'#B45309', icon:'◐', title:'Drug Interaction Check',    desc:'Cross-references all prescribed medications against the FDA database for safety signals in real time.' },
  { num:'06', color:'#6D28D9', icon:'◫', title:'Differential Diagnosis',    desc:'Ranked differentials with ICD-10 codes, confidence scores, red flags, and recommended workup.' },
  { num:'07', color:'#0369A1', icon:'◧', title:'Lab Interpretation',        desc:'Paste raw lab results and receive instant clinical interpretation with critical value flagging.' },
  { num:'08', color:'#B91C1C', icon:'◩', title:'Referral Letters',          desc:'Professional specialist referral letters generated from the encounter context in seconds.' },
  { num:'09', color:'#047857', icon:'◬', title:'Multi-language Support',    desc:'Tamil, Hindi, Arabic, Spanish, French and 5 more languages — transcribed with medical context.' },
]

const STEPS = [
  { n:'01', title:'Start Encounter',   desc:'Select a patient, enter the chief complaint, and open the AI recording session.' },
  { n:'02', title:'Speak Naturally',   desc:'Doctor and patient converse normally. Whisper AI transcribes every word in real time.' },
  { n:'03', title:'AI Generates',      desc:'GPT-4 structures the SOAP note and Claude extracts all clinical entities automatically.' },
  { n:'04', title:'Review & Finalize', desc:'Edit if needed, generate prescriptions and referrals, then save to the secure record.' },
]

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className={s.root}>

      {/* Nav */}
      <nav className={s.nav}>
        <div className={s.brand}>
          <div className={s.brandMark}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={s.brandName}>ClinicalScribe</span>
          <span className={s.brandTag}>AI</span>
        </div>
        <div className={s.navLinks}>
          <a href="#features"          className={s.navLink}>Features</a>
          <Link to="/how-it-works"   className={s.navLink}>How it works</Link>
          <Link to="/login"   className={s.navLink}>Sign in</Link>
          <Link to="/register" className={s.navCta}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroLeft}>
            <div className={s.heroPill}>
              <Waveform />
              <span>AI Clinical Documentation</span>
            </div>
            <h1 className={s.heroTitle}>
              Clinical notes,<br />
              <em className={s.heroEm}>written while</em><br />
              you speak.
            </h1>
            <p className={s.heroSub}>
              Record physician-patient encounters and receive accurate SOAP notes with structured medical entity extraction — in under 60 seconds.
            </p>
            <div className={s.heroCtas}>
              <Link to="/register" className={s.ctaPrimary}>
                Start Free Trial
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
              <Link to="/login" className={s.ctaGhost}>Sign In</Link>
            </div>
            <div className={s.stats}>
              {[
                { v:'2+ hrs', l:'saved daily per doctor' },
                { v:'60 sec', l:'note generation time' },
                { v:'10 lang', l:'incl. Tamil & Hindi' },
              ].map(st => (
                <div key={st.v} className={s.stat}>
                  <span className={s.statV}>{st.v}</span>
                  <span className={s.statL}>{st.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={s.heroRight}>
            <div className={s.cardWrap}>
              <LiveSOAPCard />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={s.featSection} id="features">
        <div className={s.secWrap}>
          <div className={s.secHead}>
            <span className={s.eyebrow}>Capabilities</span>
            <h2 className={s.secTitle}>Everything clinical documentation needs</h2>
            <p className={s.secSub}>Built on the latest AI models, purpose-designed for the clinical workflow.</p>
          </div>
          <div className={s.featGrid}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={s.featCard} style={{ '--c': f.color, animationDelay: `${i * 0.06}s` }}>
                <span className={s.featCardNum}>{f.num}</span>
                <div className={s.featIconBox} style={{ background: f.color + '14', color: f.color }}>
                  <span className={s.featIconChar}>{f.icon}</span>
                </div>
                <h3 className={s.featTitle}>{f.title}</h3>
                <p className={s.featDesc}>{f.desc}</p>
                <div className={s.featBar} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={s.stepsSection} id="how">
        <div className={s.secWrap}>
          <div className={s.secHead}>
            <span className={s.eyebrow}>Workflow</span>
            <h2 className={s.secTitle}>Four steps to a finalized note</h2>
            <p className={s.secSub}>No training required. Open the app, record, and receive your note.</p>
          </div>
          <div className={s.stepsGrid}>
            {STEPS.map((st, i) => (
              <div key={st.n} className={s.stepCard}>
                <div className={s.stepBubble}>{st.n}</div>
                {i < STEPS.length - 1 && <div className={s.stepLine} aria-hidden />}
                <h3 className={s.stepTitle}>{st.title}</h3>
                <p className={s.stepDesc}>{st.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link to="/how-it-works" className={s.ctaGhost} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              See the full technical breakdown
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={s.ctaSection}>
        <div className={s.ctaInner}>
          <span className={s.ctaEyebrow}>Get started today</span>
          <h2 className={s.ctaTitle}>Stop writing notes.<br/>Start saving lives.</h2>
          <p className={s.ctaSub}>Join clinicians saving 2+ hours per day with AI-powered documentation.</p>
          <Link to="/register" className={s.ctaWhiteBtn}>
            Start Free Trial
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <div className={s.footerBrandBlock}>
            <div className={s.footerLogo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={s.footerBrand}>ClinicalScribe AI</span>
          </div>
          <p className={s.footerTagline}>
            AI-powered clinical documentation — built for doctors, not administrators.
          </p>
        </div>

        <div className={s.footerDivider} />

        <div className={s.footerBottom}>
          <div className={s.footerCredit}>
            <span>Developed by</span>
            <a
              href="https://www.linkedin.com/in/karthivisva/"
              target="_blank"
              rel="noopener noreferrer"
              className={s.footerDevName}
            >
              Karthik R
            </a>
            <span className={s.footerSep}>·</span>
            <Link to="/how-it-works" className={s.footerDevName} style={{ fontWeight: 500, fontSize: '0.78rem' }}>
              How it works →
            </Link>
          </div>
          <div className={s.footerLinks}>
            <a
              href="https://www.linkedin.com/in/karthivisva/"
              target="_blank"
              rel="noopener noreferrer"
              className={s.footerIconLink}
              aria-label="LinkedIn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
              LinkedIn
            </a>
            <a
              href="https://github.com/KarthikVishwaa"
              target="_blank"
              rel="noopener noreferrer"
              className={s.footerIconLink}
              aria-label="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
