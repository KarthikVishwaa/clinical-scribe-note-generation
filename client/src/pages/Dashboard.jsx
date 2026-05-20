import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { encounterApi, remindersApi } from '../services/api'
import styles from './Dashboard.module.css'

const STATUS_META = {
  recording:  { label: 'Recording',  color: 'var(--color-error)',   bg: 'var(--color-error-light)'   },
  processing: { label: 'Processing', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  completed:  { label: 'Completed',  color: 'var(--color-success)', bg: 'var(--color-success-light)' },
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [encounters, setEncounters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [reminders, setReminders] = useState([])
  const [form, setForm] = useState({
    patient_name: location.state?.patientName || '',
    patient_id: '',
    chief_complaint: '',
    patient_db_id: location.state?.patientId || null
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    encounterApi.list().then((r) => setEncounters(r.data)).finally(() => setLoading(false))
    remindersApi.listAll().then((r) => setReminders((r.data || []).filter(rem => !rem.is_done).slice(0, 5))).catch(() => {})
  }, [])

  // Auto-open modal if coming from patient page
  useEffect(() => {
    if (location.state?.patientName) setShowModal(true)
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const r = await encounterApi.create(form)
      navigate(`/encounter/${r.data.id}`)
    } catch (err) {
      const msg = err?.response?.data?.detail
      if (err?.response?.status === 403 && msg) {
        alert(`🚫 ${msg}`)
      } else {
        alert('Failed to create encounter. Please try again.')
      }
      setCreating(false)
    }
  }

  const DEMO_LIMIT = 2

  const stats = {
    total: encounters.length,
    completed: encounters.filter((e) => e.status === 'completed').length,
    today: encounters.filter((e) => new Date(e.created_at).toDateString() === new Date().toDateString()).length,
  }

  const limitReached = stats.total >= DEMO_LIMIT

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Good day, {user?.full_name || user?.email}. Ready to document?</p>
        </div>
        <button
          className={styles.newBtn}
          onClick={() => limitReached ? alert(`Demo limit: you've used both of your 2 free encounters. Register a new account to continue exploring.`) : setShowModal(true)}
          style={limitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {limitReached ? `Limit Reached (${stats.total}/${DEMO_LIMIT})` : 'New Encounter'}
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: 'Total Encounters', value: stats.total, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" /><polyline points="14 2 14 8 20 8" /></svg>
          )},
          { label: 'Completed Notes', value: stats.completed, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )},
          { label: 'Today', value: stats.today, icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          )},
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending reminders */}
      {reminders.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Pending Follow-ups ({reminders.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reminders.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: r.priority === 'urgent' ? '#FEF2F2' : '#fff',
                border: `1.5px solid ${r.priority === 'urgent' ? '#fecaca' : 'var(--color-border)'}`,
                borderRadius: 10,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: r.priority === 'urgent' ? '#DC2626' : r.priority === 'low' ? '#059669' : '#D97706'
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{r.reminder_text}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {r.patient_name && r.patient_name}
                    {r.due_date && ` — ${r.due_date}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encounters list */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Encounters</h2>
        {loading ? (
          <div className={styles.loading}>
            <span className={styles.spinner} /> Loading encounters...
          </div>
        ) : encounters.length === 0 ? (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>No encounters yet</h3>
            <p>Click "New Encounter" to start your first AI-powered clinical note.</p>
            <button className={styles.newBtn} onClick={() => setShowModal(true)}>Start First Encounter</button>
          </div>
        ) : (
          <div className={styles.encounterList}>
            {encounters.map((enc) => {
              const meta = STATUS_META[enc.status] || STATUS_META.completed
              return (
                <div key={enc.id} className={styles.encounterCard} onClick={() => navigate(`/encounter/${enc.id}`)}>
                  <div className={styles.encounterMain}>
                    <div className={styles.encounterPatient}>
                      {enc.patient_name || 'Anonymous Patient'}
                    </div>
                    {enc.chief_complaint && (
                      <div className={styles.encounterCC}>{enc.chief_complaint}</div>
                    )}
                    <div className={styles.encounterDate}>{fmtDate(enc.created_at)}</div>
                  </div>
                  <div className={styles.encounterRight}>
                    {enc.patient_id && <span className={styles.patientId}>ID: {enc.patient_id}</span>}
                    <span className={styles.statusBadge} style={{ color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Encounter Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Encounter</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Patient Name <span className={styles.optional}>(optional)</span></label>
                <input className={styles.input} placeholder="e.g. John Doe" value={form.patient_name}
                  onChange={(e) => setForm((f) => ({ ...f, patient_name: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Patient ID <span className={styles.optional}>(optional)</span></label>
                <input className={styles.input} placeholder="e.g. MRN-00123" value={form.patient_id}
                  onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Chief Complaint <span className={styles.optional}>(optional)</span></label>
                <input className={styles.input} placeholder="e.g. Chest pain for 2 days" value={form.chief_complaint}
                  onChange={(e) => setForm((f) => ({ ...f, chief_complaint: e.target.value }))} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.createBtn} disabled={creating}>
                  {creating ? <><span className={styles.spinnerSm} /> Starting...</> : 'Start Encounter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
