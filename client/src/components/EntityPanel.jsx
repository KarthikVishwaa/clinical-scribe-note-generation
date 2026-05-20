import styles from './EntityPanel.module.css'

const TYPE_META = {
  medication:  { label: 'Medication',  color: '#7C3AED', bg: '#F5F3FF' },
  symptom:     { label: 'Symptom',     color: '#D97706', bg: '#FFFBEB' },
  diagnosis:   { label: 'Diagnosis',   color: '#DC2626', bg: '#FEF2F2' },
  procedure:   { label: 'Procedure',   color: '#0284C7', bg: '#F0F9FF' },
  anatomy:     { label: 'Anatomy',     color: '#059669', bg: '#ECFDF5' },
  lab_value:   { label: 'Lab Value',   color: '#9333EA', bg: '#FAF5FF' },
  vital_sign:  { label: 'Vital Sign',  color: '#0369A1', bg: '#EFF6FF' },
}
const fallback = { label: 'Other', color: '#5C5F61', bg: '#F3F4F6' }

function EntityCard({ entity }) {
  const meta = TYPE_META[entity.entity_type] || fallback
  return (
    <div className={styles.entity}>
      <div className={styles.entityTop}>
        <span className={styles.entityText}>{entity.entity_text}</span>
        <span className={styles.badge} style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
      </div>
      {entity.normalized_term && entity.normalized_term !== entity.entity_text && (
        <span className={styles.normalized}>{entity.normalized_term}</span>
      )}
      {(entity.icd_code || entity.snomed_code) && (
        <div className={styles.codes}>
          {entity.icd_code    && <span className={styles.code}>ICD-10: {entity.icd_code}</span>}
          {entity.snomed_code && <span className={styles.code}>SNOMED: {entity.snomed_code}</span>}
        </div>
      )}
      {entity.context && <p className={styles.context}>{entity.context}</p>}
    </div>
  )
}

export default function EntityPanel({ entities = [] }) {
  const grouped = entities.reduce((acc, e) => {
    const t = e.entity_type || 'other'; if (!acc[t]) acc[t] = []; acc[t].push(e); return acc
  }, {})

  return (
    <>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon} style={{ background: '#FAF5FF', color: '#7C3AED' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <span className={styles.title}>Medical Entities</span>
        </div>
        {entities.length > 0 && (
          <span className={styles.badge}>{entities.length} found</span>
        )}
      </div>

      <div className={styles.body}>
        {entities.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyCircle}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>No entities yet</p>
            <p className={styles.emptyHint}>Medical AI will identify medications, diagnoses, procedures and more after transcription</p>
          </div>
        ) : (
          <div className={styles.groups}>
            {Object.entries(grouped).map(([type, items]) => {
              const meta = TYPE_META[type] || fallback
              return (
                <div key={type} className={styles.group}>
                  <div className={styles.groupLabel} style={{ color: meta.color }}>
                    <span className={styles.groupDot} style={{ background: meta.color }}/>
                    {meta.label}s <span className={styles.groupCount}>({items.length})</span>
                  </div>
                  {items.map((e, i) => <EntityCard key={e.id || i} entity={e} />)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
