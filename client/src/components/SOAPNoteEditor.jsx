import { useState, useEffect } from 'react'
import styles from './SOAPNoteEditor.module.css'

const SECTIONS = [
  { key: 'subjective', letter: 'S', label: 'Subjective', desc: 'Chief complaint · History · Symptoms', color: '#7C3AED', lightBg: '#F5F3FF' },
  { key: 'objective',  letter: 'O', label: 'Objective',  desc: 'Vitals · Exam findings · Lab results', color: '#0284C7', lightBg: '#F0F9FF' },
  { key: 'assessment', letter: 'A', label: 'Assessment', desc: 'Diagnosis · ICD-10 codes',              color: '#DC2626', lightBg: '#FEF2F2' },
  { key: 'plan',       letter: 'P', label: 'Plan',       desc: 'Medications · Referrals · Follow-up',  color: '#059669', lightBg: '#ECFDF5' },
]

export default function SOAPNoteEditor({ soapNote, onSave, isSaving }) {
  const [draft, setDraft] = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState('subjective')

  useEffect(() => {
    if (soapNote) {
      setDraft({
        subjective: soapNote.subjective || '',
        objective:  soapNote.objective  || '',
        assessment: soapNote.assessment || '',
        plan:       soapNote.plan       || '',
      })
      setDirty(false)
    }
  }, [soapNote])

  const handleChange = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setDirty(true) }
  const handleSave = () => { onSave?.(draft); setDirty(false) }

  const isEmpty = !soapNote && !Object.values(draft).some(Boolean)
  const active = SECTIONS.find(s => s.key === activeTab)

  return (
    <>
      {/* Panel header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon} style={{ background: '#F0FDF4', color: '#059669' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <span className={styles.title}>SOAP Note</span>
        </div>
        {dirty && (
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? <><span className={styles.saveSpin}/> Saving...</>
              : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save Note</>
            }
          </button>
        )}
      </div>

      {/* Tab bar — S O A P */}
      <div className={styles.tabs}>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            className={`${styles.tab} ${activeTab === s.key ? styles.tabActive : ''}`}
            style={activeTab === s.key ? { borderBottomColor: s.color, color: s.color } : {}}
            onClick={() => setActiveTab(s.key)}
          >
            <span className={styles.tabBadge} style={{ background: activeTab === s.key ? s.color : '#E5E7EB', color: activeTab === s.key ? '#fff' : '#6B7280' }}>
              {s.letter}
            </span>
            <span className={styles.tabLabel}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Section body */}
      <div className={styles.body} style={{ background: isEmpty ? '#fff' : active?.lightBg + '55' }}>
        {isEmpty ? (
          <div className={styles.empty}>
            <div className={styles.emptyCircle}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>No SOAP note yet</p>
            <p className={styles.emptyHint}>Record and transcribe the consultation — Medical AI will generate the full SOAP note automatically</p>
          </div>
        ) : (
          <div className={styles.sectionBody}>
            <div className={styles.sectionMeta}>
              <span className={styles.sectionBadge} style={{ background: active.color }}>{active.letter}</span>
              <div>
                <span className={styles.sectionLabel}>{active.label}</span>
                <span className={styles.sectionDesc}>{active.desc}</span>
              </div>
            </div>
            <textarea
              className={styles.textarea}
              value={draft[activeTab]}
              onChange={e => handleChange(activeTab, e.target.value)}
              placeholder={`Enter ${active.label.toLowerCase()} findings here...`}
            />
          </div>
        )}
      </div>
    </>
  )
}
