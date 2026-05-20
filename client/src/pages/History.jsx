import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { encounterApi } from '../services/api'
import styles from './History.module.css'

const STATUS_META = {
  recording:  { label: 'Recording',  color: 'var(--color-error)',   bg: 'var(--color-error-light)'   },
  processing: { label: 'Processing', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
  completed:  { label: 'Completed',  color: 'var(--color-success)', bg: 'var(--color-success-light)' },
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function History() {
  const navigate = useNavigate()
  const [encounters, setEncounters] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    encounterApi.list().then((r) => {
      setEncounters(r.data)
      setFiltered(r.data)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = encounters
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.patient_name?.toLowerCase().includes(q) ||
          e.patient_id?.toLowerCase().includes(q) ||
          e.chief_complaint?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter)
    }
    setFiltered(result)
  }, [search, statusFilter, encounters])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Encounter History</h1>
          <p className={styles.pageSubtitle}>{encounters.length} encounters on record</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search patient name, ID, or complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          {['all', 'completed', 'processing', 'recording'].map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : STATUS_META[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}><span className={styles.spinner} /> Loading history...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>{search || statusFilter !== 'all' ? 'No encounters match your search.' : 'No encounters recorded yet.'}</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Patient</span>
            <span>Chief Complaint</span>
            <span>Date</span>
            <span>Status</span>
            <span></span>
          </div>
          {filtered.map((enc) => {
            const meta = STATUS_META[enc.status] || STATUS_META.completed
            return (
              <div key={enc.id} className={styles.tableRow} onClick={() => navigate(`/encounter/${enc.id}`)}>
                <div>
                  <div className={styles.patientName}>{enc.patient_name || 'Anonymous'}</div>
                  {enc.patient_id && <div className={styles.patientId}>{enc.patient_id}</div>}
                </div>
                <div className={styles.cc}>{enc.chief_complaint || <span className={styles.na}>—</span>}</div>
                <div className={styles.date}>{fmtDate(enc.created_at)}</div>
                <div>
                  <span className={styles.statusBadge} style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                </div>
                <div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
