import { useState } from 'react'
import Modal from './Modal'
import { aiApi } from '../services/api'
import styles from './FeatureModal.module.css'

const CONFIDENCE_COLOR = { high: '#059669', moderate: '#D97706', low: '#6B7280' }
const URGENCY_COLOR = { emergent: '#DC2626', urgent: '#EA580C', routine: '#059669' }

export default function DiffDiagnosisModal({ onClose, prefillSymptoms = '' }) {
  const [form, setForm] = useState({ symptoms: prefillSymptoms, history: '', vitals: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!form.symptoms.trim()) { setError('Please describe the symptoms'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await aiApi.differentialDiagnosis(form)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate differential diagnosis')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Differential Diagnosis Assistant" onClose={onClose} wide>
      <div className={styles.featureBody}>
        <div className={styles.formSection}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Presenting Symptoms *</label>
            <textarea
              className={styles.textarea}
              value={form.symptoms}
              onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
              placeholder="Describe the chief complaint and symptoms in detail..."
              rows={3}
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Patient History</label>
              <textarea
                className={styles.textarea}
                value={form.history}
                onChange={e => setForm(f => ({ ...f, history: e.target.value }))}
                placeholder="PMH, medications, allergies, family history..."
                rows={2}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vitals / Examination</label>
              <textarea
                className={styles.textarea}
                value={form.vitals}
                onChange={e => setForm(f => ({ ...f, vitals: e.target.value }))}
                placeholder="BP, HR, Temp, SpO2, examination findings..."
                rows={2}
              />
            </div>
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
          <button className={styles.primaryBtn} onClick={generate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Differential Diagnoses'}
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Medical AI is analyzing symptoms and generating differential diagnoses...</p>
          </div>
        )}

        {result && (
          <div className={styles.resultContainer}>
            {result.red_flags?.length > 0 && (
              <div className={styles.redFlagBox}>
                <strong>Red Flags — Urgent Review Required:</strong>
                <ul>{result.red_flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}

            {result.differentials?.length > 0 && (
              <div>
                <h4 className={styles.subTitle}>Differential Diagnoses (Ranked by Likelihood)</h4>
                {result.differentials.map((dx, i) => (
                  <div key={i} className={styles.dxCard}>
                    <div className={styles.dxHeader}>
                      <div className={styles.dxRank}>{dx.rank}</div>
                      <div className={styles.dxMain}>
                        <span className={styles.dxName}>{dx.diagnosis}</span>
                        {dx.icd_code && <span className={styles.icdCode}>{dx.icd_code}</span>}
                      </div>
                      <div className={styles.dxBadges}>
                        {dx.confidence && (
                          <span className={styles.confidenceBadge}
                            style={{ background: CONFIDENCE_COLOR[dx.confidence] + '20', color: CONFIDENCE_COLOR[dx.confidence] }}>
                            {dx.confidence} {dx.confidence_percent ? `(${dx.confidence_percent}%)` : ''}
                          </span>
                        )}
                        {dx.urgency && (
                          <span className={styles.urgencyBadge}
                            style={{ background: URGENCY_COLOR[dx.urgency] + '20', color: URGENCY_COLOR[dx.urgency] }}>
                            {dx.urgency}
                          </span>
                        )}
                      </div>
                    </div>
                    {dx.supporting_features?.length > 0 && (
                      <div className={styles.dxFeatures}>
                        <span className={styles.forLabel}>Supporting:</span>
                        {dx.supporting_features.map((f, j) => <span key={j} className={styles.forTag}>{f}</span>)}
                      </div>
                    )}
                    {dx.against_features?.length > 0 && (
                      <div className={styles.dxFeatures}>
                        <span className={styles.againstLabel}>Against:</span>
                        {dx.against_features.map((f, j) => <span key={j} className={styles.againstTag}>{f}</span>)}
                      </div>
                    )}
                    {dx.next_steps?.length > 0 && (
                      <div className={styles.nextSteps}>
                        <strong>Next steps:</strong> {dx.next_steps.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.recommended_workup?.length > 0 && (
              <div className={styles.workupBox}>
                <h4 className={styles.subTitle}>Recommended Workup</h4>
                <ul>{result.recommended_workup.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}

            {result.clinical_reasoning && (
              <div className={styles.reasoningBox}>
                <h4 className={styles.subTitle}>Clinical Reasoning</h4>
                <p>{result.clinical_reasoning}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
