import styles from './FeatureToolbar.module.css'

const FEATURES = [
  { id: 'prescription', label: 'Prescription',  color: '#059669' },
  { id: 'drugs',        label: 'Drug Check',     color: '#D97706' },
  { id: 'diagnosis',    label: 'Diff. Diagnosis',color: '#7C3AED' },
  { id: 'labs',         label: 'Lab Interpreter',color: '#0284C7' },
  { id: 'referral',     label: 'Referral Letter',color: '#DC2626' },
  { id: 'reminders',    label: 'Follow-up',      color: '#F59E0B' },
  { id: 'pdf',          label: 'Export PDF',     color: '#374151' },
]

export default function FeatureToolbar({ onFeature, hasSoap }) {
  return (
    <div className={styles.toolbar}>
      <span className={styles.toolbarLabel}>Medical AI Tools</span>
      <div className={styles.tools}>
        {FEATURES.map(f => (
          <button
            key={f.id}
            className={styles.toolBtn}
            style={{ '--accent': f.color }}
            onClick={() => onFeature(f.id)}
            title={f.label}
          >
            <span className={styles.toolLabel}>{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
