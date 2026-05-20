import { useState, useEffect } from 'react'
import Modal from './Modal'
import { encounterApi } from '../services/api'
import styles from './FeatureModal.module.css'

const SPECIALTIES = [
  'Cardiologist', 'Neurologist', 'Orthopedic Surgeon', 'Gastroenterologist',
  'Pulmonologist', 'Endocrinologist', 'Oncologist', 'Rheumatologist',
  'Dermatologist', 'Urologist', 'Ophthalmologist', 'ENT Specialist',
  'Psychiatrist', 'Nephrologist', 'Hematologist', 'Other Specialist'
]

export default function ReferralModal({ encounterId, onClose }) {
  const [form, setForm] = useState({ specialist_type: '', specialist_name: '', additional_notes: '' })
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    encounterApi.getReferral(encounterId).then(r => setData(r.data)).catch(() => {})
  }, [encounterId])

  const generate = async () => {
    if (!form.specialist_type) { setError('Please select a specialist type'); return }
    setLoading(true); setError('')
    try {
      const r = await encounterApi.generateReferral(encounterId, form)
      setData(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate referral letter')
    } finally { setLoading(false) }
  }

  const copyToClipboard = () => {
    if (data?.letter_text) {
      navigator.clipboard.writeText(data.letter_text)
      alert('Letter copied to clipboard!')
    }
  }

  return (
    <Modal title="Referral Letter Generator" onClose={onClose} wide>
      <div className={styles.featureBody}>
        <div className={styles.formSection}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Specialist Type *</label>
              <select
                className={styles.select}
                value={form.specialist_type}
                onChange={e => setForm(f => ({ ...f, specialist_type: e.target.value }))}
              >
                <option value="">Select specialist...</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Specialist Name (optional)</label>
              <input
                className={styles.input}
                value={form.specialist_name}
                onChange={e => setForm(f => ({ ...f, specialist_name: e.target.value }))}
                placeholder="Dr. Smith"
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Additional Notes</label>
            <textarea
              className={styles.textarea}
              value={form.additional_notes}
              onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))}
              placeholder="Any specific requests or additional clinical information..."
              rows={2}
            />
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
          <button className={styles.primaryBtn} onClick={generate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Referral Letter'}
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Medical AI is writing a formal referral letter...</p>
          </div>
        )}

        {data && (
          <div className={styles.resultContainer}>
            <div className={styles.resultActions} style={{ marginBottom: 16 }}>
              <button className={styles.secondaryBtn} onClick={generate} disabled={loading}>Regenerate</button>
              <button className={styles.primaryBtn} onClick={copyToClipboard}>Copy Letter</button>
            </div>
            <div className={styles.letterBox}>
              <pre className={styles.letterText}>{data.letter_text}</pre>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
