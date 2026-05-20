import styles from './TranscriptPanel.module.css'

export default function TranscriptPanel({ transcripts = [], statusMessage, isProcessing }) {
  const full = transcripts.map(t => t.text || t).join(' ')
  const wordCount = full.split(' ').filter(Boolean).length

  return (
    <>
      {/* Panel header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon} style={{ background: '#EFF6FF', color: '#0058BE' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className={styles.title}>Transcript</span>
        </div>
        {wordCount > 0 && (
          <span className={styles.badge}>{wordCount} words</span>
        )}
      </div>

      {/* Scrollable body */}
      <div className={styles.body}>
        {isProcessing && (
          <div className={styles.statusBar}>
            <span className={styles.spinner} />
            <span>{statusMessage || 'Processing audio...'}</span>
          </div>
        )}

        {full ? (
          <p className={styles.text}>{full}</p>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyCircle}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className={styles.emptyTitle}>No transcript yet</p>
            <p className={styles.emptyHint}>Press <strong>Start Recording</strong> above to begin capturing the consultation</p>
          </div>
        )}
      </div>
    </>
  )
}
