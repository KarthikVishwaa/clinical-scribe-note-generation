import { useState } from 'react'
import Modal from './Modal'
import { aiApi } from '../services/api'
import styles from './FeatureModal.module.css'

const STATUS_COLOR = {
  normal: '#059669',
  low: '#0284C7',
  high: '#DC2626',
  critical_low: '#7C3AED',
  critical_high: '#7C3AED',
}

const STATUS_LABEL = {
  normal: 'Normal',
  low: 'Low',
  high: 'High',
  critical_low: 'Critical Low',
  critical_high: 'Critical High',
}

export default function LabInterpreterModal({ onClose }) {
  const [form, setForm] = useState({ lab_text: '', patient_context: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const interpret = async () => {
    if (!form.lab_text.trim()) { setError('Please enter lab results'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await aiApi.labInterpretation(form)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to interpret lab results')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Lab Result Interpretation" onClose={onClose} wide>
      <div className={styles.featureBody}>
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Paste Lab Results *</label>
            <textarea
              className={styles.textarea}
              value={form.lab_text}
              onChange={e => setForm(f => ({ ...f, lab_text: e.target.value }))}
              placeholder={`Paste lab results here. Example:\nHemoglobin: 9.2 g/dL (ref: 12-16)\nWBC: 14.5 x 10^3/uL (ref: 4.5-11.0)\nPlatelets: 95 x 10^3/uL (ref: 150-400)\nSodium: 128 mEq/L (ref: 136-145)`}
              rows={6}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Patient Context (optional)</label>
            <textarea
              className={styles.textarea}
              value={form.patient_context}
              onChange={e => setForm(f => ({ ...f, patient_context: e.target.value }))}
              placeholder="Patient age, known conditions, current medications..."
              rows={2}
            />
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
          <button className={styles.primaryBtn} onClick={interpret} disabled={loading}>
            {loading ? 'Interpreting...' : 'Interpret Lab Results'}
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Medical AI is interpreting your lab results...</p>
          </div>
        )}

        {result && (
          <div className={styles.resultContainer}>
            {result.requires_urgent_attention && (
              <div className={styles.urgentBox}>
                <strong>URGENT ATTENTION REQUIRED</strong>
                <p>{result.urgent_reason}</p>
              </div>
            )}

            {result.overall_impression && (
              <div className={styles.impressionBox}>
                <h4 className={styles.subTitle}>Overall Impression</h4>
                <p>{result.overall_impression}</p>
              </div>
            )}

            {result.results?.length > 0 && (
              <div>
                <h4 className={styles.subTitle}>Individual Results</h4>
                <table className={styles.labTable}>
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Value</th>
                      <th>Reference</th>
                      <th>Status</th>
                      <th>Interpretation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={i} className={r.status !== 'normal' ? styles.abnormalRow : ''}>
                        <td><strong>{r.test_name}</strong></td>
                        <td style={{ fontWeight: 700, color: STATUS_COLOR[r.status] }}>{r.value}</td>
                        <td className={styles.refRange}>{r.reference_range}</td>
                        <td>
                          <span className={styles.statusTag}
                            style={{ background: STATUS_COLOR[r.status] + '20', color: STATUS_COLOR[r.status] }}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>
                        <td className={styles.labInterp}>{r.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.abnormal_highlights?.length > 0 && (
              <div className={styles.highlightsBox}>
                <h4 className={styles.subTitle}>Key Abnormal Findings</h4>
                <ul>{result.abnormal_highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
            )}

            {result.clinical_correlation && (
              <div className={styles.correlationBox}>
                <h4 className={styles.subTitle}>Clinical Correlation</h4>
                <p>{result.clinical_correlation}</p>
              </div>
            )}

            {result.recommended_actions?.length > 0 && (
              <div className={styles.actionsBox}>
                <h4 className={styles.subTitle}>Recommended Actions</h4>
                <ul>{result.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
