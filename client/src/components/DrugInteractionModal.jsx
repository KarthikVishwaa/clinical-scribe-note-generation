import { useState } from 'react'
import Modal from './Modal'
import { aiApi } from '../services/api'
import styles from './FeatureModal.module.css'

const SEVERITY_COLOR = {
  contraindicated: '#DC2626',
  major: '#EA580C',
  moderate: '#D97706',
  minor: '#059669',
}

const RISK_COLOR = {
  none: '#059669',
  low: '#16A34A',
  moderate: '#D97706',
  high: '#EA580C',
  contraindicated: '#DC2626',
  unknown: '#6B7280',
}

export default function DrugInteractionModal({ onClose }) {
  const [drugs, setDrugs] = useState(['', ''])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const addDrug = () => setDrugs(d => [...d, ''])
  const updateDrug = (i, v) => setDrugs(d => d.map((x, idx) => idx === i ? v : x))
  const removeDrug = (i) => setDrugs(d => d.filter((_, idx) => idx !== i))

  const check = async () => {
    const filtered = drugs.filter(d => d.trim())
    if (filtered.length < 2) { setError('Enter at least 2 drug names'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await aiApi.checkDrugInteractions(filtered)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to check interactions')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Drug Interaction Checker" onClose={onClose} wide>
      <div className={styles.featureBody}>
        <div className={styles.drugInputSection}>
          <p className={styles.sectionDesc}>Enter the medications to check for interactions:</p>
          {drugs.map((drug, i) => (
            <div key={i} className={styles.drugRow}>
              <input
                className={styles.input}
                value={drug}
                onChange={e => updateDrug(i, e.target.value)}
                placeholder={`Drug ${i + 1} (e.g. Metformin 500mg)`}
                onKeyDown={e => e.key === 'Enter' && check()}
              />
              {drugs.length > 2 && (
                <button className={styles.removeBtn} onClick={() => removeDrug(i)}>x</button>
              )}
            </div>
          ))}
          <div className={styles.drugActions}>
            <button className={styles.addDrugBtn} onClick={addDrug}>+ Add Drug</button>
            <button className={styles.primaryBtn} onClick={check} disabled={loading}>
              {loading ? 'Checking...' : 'Check Interactions'}
            </button>
          </div>
        </div>

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Medical AI is checking drug interactions...</p>
          </div>
        )}
        {error && <div className={styles.errorBox}>{error}</div>}

        {result && (
          <div className={styles.resultContainer}>
            <div className={styles.riskBadge} style={{ background: RISK_COLOR[result.overall_risk] + '20', borderColor: RISK_COLOR[result.overall_risk] }}>
              <span className={styles.riskDot} style={{ background: RISK_COLOR[result.overall_risk] }} />
              <span className={styles.riskLabel}>
                Overall Risk: <strong>{(result.overall_risk || 'unknown').toUpperCase()}</strong>
              </span>
            </div>

            {result.summary && <p className={styles.summary}>{result.summary}</p>}

            {result.interactions?.length > 0 ? (
              <div className={styles.interactionList}>
                <h4 className={styles.subTitle}>Interactions Found</h4>
                {result.interactions.map((interaction, i) => (
                  <div key={i} className={styles.interactionCard}
                    style={{ borderLeftColor: SEVERITY_COLOR[interaction.severity] || '#6B7280' }}>
                    <div className={styles.interactionHeader}>
                      <span className={styles.drugPair}>{interaction.drug1} — {interaction.drug2}</span>
                      <span className={styles.severityTag}
                        style={{ background: SEVERITY_COLOR[interaction.severity] + '20', color: SEVERITY_COLOR[interaction.severity] }}>
                        {interaction.severity?.toUpperCase()}
                      </span>
                    </div>
                    {interaction.mechanism && <p className={styles.mechanism}><strong>Mechanism:</strong> {interaction.mechanism}</p>}
                    {interaction.description && <p className={styles.description}>{interaction.description}</p>}
                    {interaction.management && (
                      <div className={styles.management}>
                        <strong>Management:</strong> {interaction.management}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noInteractions}>
                No significant interactions found between these medications.
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className={styles.recommendations}>
                <h4 className={styles.subTitle}>Recommendations</h4>
                <ul>
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
