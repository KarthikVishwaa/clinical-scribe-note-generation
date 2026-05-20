import { useState, useEffect } from 'react'
import Modal from './Modal'
import { encounterApi, remindersApi } from '../services/api'
import styles from './FeatureModal.module.css'

const PRIORITY_COLOR = { urgent: '#DC2626', normal: '#0284C7', low: '#059669' }
const PRIORITY_DOT_COLOR = { urgent: '#DC2626', normal: '#D97706', low: '#059669' }

export default function ReminderModal({ encounterId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [reminders, setReminders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    encounterApi.getReminders(encounterId).then(r => setReminders(r.data || [])).catch(() => {})
  }, [encounterId])

  const generate = async () => {
    setLoading(true); setError('')
    try {
      const r = await encounterApi.generateReminders(encounterId)
      setReminders(r.data || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate reminders. Make sure SOAP note is generated first.')
    } finally { setLoading(false) }
  }

  const toggleDone = async (reminder) => {
    try {
      const r = await remindersApi.update(reminder.id, { is_done: !reminder.is_done })
      setReminders(prev => prev.map(rem => rem.id === reminder.id ? r.data : rem))
    } catch {}
  }

  const pending = reminders.filter(r => !r.is_done)
  const done = reminders.filter(r => r.is_done)

  return (
    <Modal title="Follow-up Reminders" onClose={onClose}>
      <div className={styles.featureBody}>
        <div className={styles.formActions}>
          <p className={styles.sectionDesc}>Medical AI extracts follow-up tasks from the SOAP plan and creates dated reminders.</p>
          <button className={styles.primaryBtn} onClick={generate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate from SOAP Plan'}
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Extracting follow-up items from SOAP plan...</p>
          </div>
        )}
        {error && <div className={styles.errorBox}>{error}</div>}

        {reminders.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconBox}>--</div>
            <p className={styles.emptyTitle}>No reminders yet</p>
            <p className={styles.emptyHint}>Generate reminders from the SOAP plan above.</p>
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <h4 className={styles.subTitle}>Pending ({pending.length})</h4>
            {pending.map(r => (
              <div key={r.id} className={styles.reminderCard}>
                <button className={styles.checkBtn} onClick={() => toggleDone(r)}>
                  <span className={styles.checkCircle} />
                </button>
                <div className={styles.reminderContent}>
                  <p className={styles.reminderText}>{r.reminder_text}</p>
                  <div className={styles.reminderMeta}>
                    {r.due_date && <span className={styles.dueDate}>{r.due_date}</span>}
                    <span className={styles.priorityTag} style={{ color: PRIORITY_COLOR[r.priority] }}>
                      <span className={styles.priorityDot} style={{ background: PRIORITY_DOT_COLOR[r.priority] }} />
                      {r.priority}
                    </span>
                    {r.patient_name && <span className={styles.patientTag}>{r.patient_name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div>
            <h4 className={styles.subTitle} style={{ opacity: 0.6 }}>Completed ({done.length})</h4>
            {done.map(r => (
              <div key={r.id} className={`${styles.reminderCard} ${styles.reminderDone}`}>
                <button className={styles.checkBtn} style={{ color: '#059669' }} onClick={() => toggleDone(r)}>
                  <span className={styles.checkDone}>&#10003;</span>
                </button>
                <div className={styles.reminderContent}>
                  <p className={styles.reminderText} style={{ textDecoration: 'line-through', opacity: 0.6 }}>{r.reminder_text}</p>
                  {r.due_date && <span className={styles.dueDate} style={{ opacity: 0.5 }}>{r.due_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
