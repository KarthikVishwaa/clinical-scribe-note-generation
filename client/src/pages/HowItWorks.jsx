import { Link } from 'react-router-dom'
import s from './HowItWorks.module.css'

const PIPELINE = [
  {
    step: '01',
    color: '#0058BE',
    title: 'Microphone Input',
    sub: 'Browser → MediaRecorder API',
    body: 'The browser captures audio through the Web MediaRecorder API at 16 kHz mono — the optimal sample rate for speech recognition. Echo cancellation, noise suppression, and auto-gain are applied automatically so the model receives clean speech even in noisy clinic environments.',
    detail: ['Audio captured at 16 kHz mono', 'Noise suppression + echo cancellation on by default', 'Chunks streamed every 3 seconds — no waiting till end'],
  },
  {
    step: '02',
    color: '#6D28D9',
    title: 'WebSocket Streaming',
    sub: 'Client → FastAPI Server',
    body: 'Audio chunks are pushed in real time over a persistent WebSocket connection. This keeps the round-trip latency under 400 ms per chunk. The server accumulates all binary frames until the user clicks "Stop & Transcribe", then signals Whisper to process the complete audio buffer.',
    detail: ['Binary WebSocket frames — no base64 overhead', 'Server accumulates chunks into a single audio file', 'JWT token validated on connection handshake'],
  },
  {
    step: '03',
    color: '#0369A1',
    title: 'Whisper Transcription',
    sub: 'OpenAI Whisper API',
    body: 'The assembled audio is sent to OpenAI Whisper which supports 99 languages and handles medical terminology, drug names, and clinical abbreviations reliably. The model returns a timestamped transcript with high confidence for terms like "amoxicillin", "SpO₂", or "myocardial infarction".',
    detail: ['Supports 10 languages incl. Tamil, Hindi, Arabic', 'Medical vocabulary recognized without fine-tuning', 'Transcript streamed back to the browser instantly'],
  },
  {
    step: '04',
    color: '#047857',
    title: 'SOAP Note Generation',
    sub: 'GPT-4o-mini',
    body: 'The full transcript is passed to GPT-4o-mini with a structured medical prompt that enforces the SOAP format. The model identifies the Subjective complaint, Objective findings, clinical Assessment, and treatment Plan — returning each as a distinct field that populates the editor in real time.',
    detail: ['Structured JSON output — no free-text parsing needed', 'Chief complaint pre-fills the prompt for better accuracy', 'Editable in the note editor before saving'],
  },
  {
    step: '05',
    color: '#B91C1C',
    title: 'Entity Extraction',
    sub: 'Claude Haiku (Anthropic)',
    body: 'In parallel, Claude Haiku scans the transcript for clinical entities — diagnoses, medications, dosages, symptoms, procedures, and anatomical terms. Each entity is normalized and linked to ICD-10 and SNOMED CT codes, giving the doctor a structured summary panel alongside the SOAP note.',
    detail: ['Runs in parallel with SOAP generation', 'ICD-10 + SNOMED CT code linking', 'Entity panel updates live on the right panel'],
  },
  {
    step: '06',
    color: '#B45309',
    title: 'AI Feature Layer',
    sub: 'Prescriptions · Drug Checks · Referrals',
    body: 'Once the SOAP note exists, the full AI feature toolbar unlocks. Every tool — prescription generator, drug interaction checker, differential diagnosis, lab interpreter, and referral letter — takes the SOAP note and transcript as context, so outputs are patient-specific rather than generic.',
    detail: ['Prescription builds directly from the SOAP Plan section', 'Drug check calls the FDA openFDA API, no extra AI cost', 'Referral and lab tools use GPT-4o-mini with clinical prompts'],
  },
]

const STACK = [
  { name: 'React 18',       role: 'Frontend UI',              color: '#0369A1' },
  { name: 'Vite',           role: 'Build tool',               color: '#6D28D9' },
  { name: 'CSS Modules',    role: 'Scoped styling',           color: '#047857' },
  { name: 'FastAPI',        role: 'Backend API + WebSocket',  color: '#0058BE' },
  { name: 'SQLAlchemy',     role: 'ORM + SQLite',             color: '#B45309' },
  { name: 'OpenAI Whisper', role: 'Speech-to-text',           color: '#B91C1C' },
  { name: 'GPT-4o-mini',    role: 'SOAP + clinical AI',       color: '#0369A1' },
  { name: 'Claude Haiku',   role: 'Entity extraction',        color: '#6D28D9' },
  { name: 'JWT + bcrypt',   role: 'Auth + security',          color: '#047857' },
  { name: 'ReportLab',      role: 'PDF generation',           color: '#B45309' },
]

export default function HowItWorks() {
  return (
    <div className={s.root}>

      {/* Nav */}
      <nav className={s.nav}>
        <Link to="/" className={s.brand}>
          <span className={s.brandName}>ClinicalScribe</span>
          <span className={s.brandTag}>AI</span>
        </Link>
        <div className={s.navLinks}>
          <Link to="/#features" className={s.navLink}>Features</Link>
          <Link to="/login"     className={s.navLink}>Sign in</Link>
          <Link to="/register"  className={s.navCta}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={s.hero}>
        <span className={s.eyebrow}>Deep dive</span>
        <h1 className={s.heroTitle}>How ClinicalScribe AI works</h1>
        <p className={s.heroSub}>
          From the moment a doctor speaks to a finalized, structured SOAP note — here is every step the system takes, the models it uses, and the decisions behind each choice.
        </p>
        <div className={s.heroMeta}>
          <span className={s.metaItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Under 60 seconds end-to-end
          </span>
          <span className={s.metaDot} />
          <span className={s.metaItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Real-time WebSocket pipeline
          </span>
          <span className={s.metaDot} />
          <span className={s.metaItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Secured at every layer
          </span>
        </div>
      </section>

      {/* Pipeline */}
      <section className={s.pipelineSection}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <span className={s.sectionEyebrow}>The pipeline</span>
            <h2 className={s.sectionTitle}>Six stages, one seamless flow</h2>
            <p className={s.sectionSub}>Each stage is independently robust — a failure at any step returns a clear error rather than silently corrupting the note.</p>
          </div>

          <div className={s.pipeline}>
            {PIPELINE.map((item, i) => (
              <div key={item.step} className={s.pipelineItem}>
                <div className={s.pipelineLeft}>
                  <div className={s.stepBubble} style={{ background: item.color }}>
                    {item.step}
                  </div>
                  {i < PIPELINE.length - 1 && <div className={s.connector} />}
                </div>
                <div className={s.pipelineCard}>
                  <div className={s.cardHeader}>
                    <div>
                      <h3 className={s.cardTitle}>{item.title}</h3>
                      <span className={s.cardSub} style={{ color: item.color }}>{item.sub}</span>
                    </div>
                    <span className={s.cardBadge} style={{ background: item.color + '14', color: item.color }}>
                      Stage {item.step}
                    </span>
                  </div>
                  <p className={s.cardBody}>{item.body}</p>
                  <ul className={s.cardDetails}>
                    {item.detail.map(d => (
                      <li key={d}>
                        <span className={s.detailDot} style={{ background: item.color }} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture diagram (text-based) */}
      <section className={s.archSection}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <span className={s.sectionEyebrow}>Architecture</span>
            <h2 className={s.sectionTitle}>System design at a glance</h2>
          </div>
          <div className={s.archDiagram}>
            <div className={s.archBox} style={{ '--ac': '#0058BE' }}>
              <div className={s.archBoxLabel}>Browser</div>
              <div className={s.archBoxItems}>
                <span>React 18 + Vite</span>
                <span>MediaRecorder API</span>
                <span>WebSocket Client</span>
              </div>
            </div>
            <div className={s.archArrow}>
              <svg width="40" height="16" viewBox="0 0 40 16"><path d="M0 8h36M30 2l6 6-6 6" stroke="#94a3b8" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>HTTPS + WSS</span>
            </div>
            <div className={s.archBox} style={{ '--ac': '#6D28D9' }}>
              <div className={s.archBoxLabel}>FastAPI Server</div>
              <div className={s.archBoxItems}>
                <span>REST endpoints</span>
                <span>WebSocket handler</span>
                <span>JWT auth</span>
                <span>Rate limiter</span>
              </div>
            </div>
            <div className={s.archArrow}>
              <svg width="40" height="16" viewBox="0 0 40 16"><path d="M0 8h36M30 2l6 6-6 6" stroke="#94a3b8" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>API calls</span>
            </div>
            <div className={s.archBox} style={{ '--ac': '#047857' }}>
              <div className={s.archBoxLabel}>AI Models</div>
              <div className={s.archBoxItems}>
                <span>Whisper (ASR)</span>
                <span>GPT-4o-mini</span>
                <span>Claude Haiku</span>
                <span>FDA OpenFDA</span>
              </div>
            </div>
          </div>
          <div className={s.archDb}>
            <div className={s.archDbBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              SQLite (Railway persistent volume)
            </div>
            <span className={s.archDbNote}>Users · Encounters · Transcripts · SOAP Notes · Entities · Prescriptions · Reminders · API Usage</span>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className={s.secSection}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <span className={s.sectionEyebrow}>Security</span>
            <h2 className={s.sectionTitle}>How user data is protected</h2>
            <p className={s.sectionSub}>Clinical data is sensitive. Every layer has an explicit defence.</p>
          </div>
          <div className={s.secGrid}>
            {[
              {
                title: 'JWT Authentication',
                desc: 'Every API request carries a signed JSON Web Token with 8-hour expiry. The server rejects any request with a missing or tampered token.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
              },
              {
                title: 'Password Hashing',
                desc: 'Passwords are hashed with bcrypt before storage. Even if the database is compromised, no plaintext passwords are exposed.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
              },
              {
                title: 'Rate Limiting',
                desc: 'Auth endpoints allow 5 requests/minute per IP to block brute force. AI endpoints allow 10 calls/hour per user to prevent cost abuse.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
              },
              {
                title: 'Budget Caps',
                desc: 'Every user has a $1/day and $5/month AI spending cap. Exceeding it returns HTTP 429 — your OpenAI bill cannot spiral from one account.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
              },
              {
                title: 'Input Limits',
                desc: 'AI text inputs are capped at 2,000–3,000 characters. This blocks prompt injection attacks that try to exfiltrate data or override system prompts.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
              },
              {
                title: 'Security Headers',
                desc: 'X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy are set on every HTTP response to prevent clickjacking and MIME sniffing.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
              },
              {
                title: 'CORS Allowlist',
                desc: 'The backend only accepts requests from the configured frontend URL. All other origins receive a CORS rejection before any code runs.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
              },
              {
                title: 'Account Cap',
                desc: 'Registration is capped at 200 accounts for this demo. Bots cannot create unlimited accounts to exhaust the AI budget.',
                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
              },
            ].map(item => (
              <div key={item.title} className={s.secCard}>
                <div className={s.secIcon}>{item.icon}</div>
                <h3 className={s.secTitle}>{item.title}</h3>
                <p className={s.secDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className={s.stackSection}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <span className={s.sectionEyebrow}>Tech stack</span>
            <h2 className={s.sectionTitle}>Built with</h2>
          </div>
          <div className={s.stackGrid}>
            {STACK.map(t => (
              <div key={t.name} className={s.stackCard}>
                <span className={s.stackDot} style={{ background: t.color }} />
                <div>
                  <p className={s.stackName}>{t.name}</p>
                  <p className={s.stackRole}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer */}
      <section className={s.devSection}>
        <div className={s.wrap}>
          <div className={s.devCard}>
            <div className={s.devAvatar}>KR</div>
            <div className={s.devContent}>
              <span className={s.devEyebrow}>About the developer</span>
              <div className={s.devNameRow}>
                <h2 className={s.devName}>Karthik R</h2>
                <span className={s.devPronoun}>He/Him</span>
              </div>
              <p className={s.devTitle}>
                MERN Stack Developer &nbsp;·&nbsp; React.js &nbsp;·&nbsp; Node.js &nbsp;·&nbsp; Express &nbsp;·&nbsp; MongoDB &nbsp;·&nbsp; Frontend &amp; Backend Developer
              </p>
              <p className={s.devBio}>
                I built ClinicalScribe AI as a solo project — the WebSocket audio pipeline, real-time SOAP generation, REST API, security layer, and every screen in the UI. The full stack, designed and shipped by one person.
              </p>
              <p className={s.devBio}>
                I am actively looking for a <strong>Full Stack MERN Developer</strong> role. I work across React, Node.js, Express, and MongoDB and care about clean architecture, performance, and code that teams can actually maintain. If you need someone who can own a feature end-to-end, I would love to talk.
              </p>
              <div className={s.devLinks}>
                <a
                  href="https://www.linkedin.com/in/karthivisva/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.devLinkPrimary}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                  Connect on LinkedIn
                </a>
                <a
                  href="https://github.com/KarthikVishwaa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.devLinkGhost}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                  </svg>
                  View source on GitHub
                </a>
              </div>
              <p className={s.devHiring}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Open to full-time MERN stack roles — full-time or contract
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <Link to="/" className={s.footerBrand}>ClinicalScribe AI</Link>
          <div className={s.footerLinks}>
            <Link to="/" className={s.footerLink}>Home</Link>
            <Link to="/how-it-works" className={s.footerLink}>How it works</Link>
            <Link to="/register" className={s.footerLink}>Get started</Link>
          </div>
          <div className={s.footerSocials}>
            <a href="https://www.linkedin.com/in/karthivisva/" target="_blank" rel="noopener noreferrer" className={s.footerSocial}>LinkedIn</a>
            <a href="https://github.com/KarthikVishwaa" target="_blank" rel="noopener noreferrer" className={s.footerSocial}>GitHub</a>
          </div>
        </div>
        <div className={s.footerSub}>
          Developed by <a href="https://www.linkedin.com/in/karthivisva/" target="_blank" rel="noopener noreferrer">Karthik R</a>
        </div>
      </footer>

    </div>
  )
}
