import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { patientApi } from '../services/api'
import styles from './Patients.module.css'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function PatientForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', mrn: '', date_of_birth: '',
    gender: '', phone: '', email: '', address: '',
    allergies: '', current_medications: '', medical_history: '',
    blood_type: '', emergency_contact: '', insurance_info: '', notes: '',
    ...initial
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className={styles.formGrid}>
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Basic Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>First Name *</label>
            <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
          </div>
          <div className={styles.formGroup}>
            <label>Last Name</label>
            <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" />
          </div>
          <div className={styles.formGroup}>
            <label>MRN</label>
            <input value={form.mrn} onChange={e => set('mrn', e.target.value)} placeholder="Auto or manual" />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label>Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Blood Type</label>
            <select value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
              <option value="">Unknown</option>
              {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="patient@email.com" />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Medical Information</h3>
        <div className={styles.formGroup}>
          <label>Allergies</label>
          <textarea value={form.allergies} onChange={e => set('allergies', e.target.value)}
            placeholder="Penicillin - rash, Sulfa drugs - anaphylaxis..." rows={2} />
        </div>
        <div className={styles.formGroup}>
          <label>Current Medications</label>
          <textarea value={form.current_medications} onChange={e => set('current_medications', e.target.value)}
            placeholder="Metformin 500mg BD, Atorvastatin 20mg OD..." rows={2} />
        </div>
        <div className={styles.formGroup}>
          <label>Medical History</label>
          <textarea value={form.medical_history} onChange={e => set('medical_history', e.target.value)}
            placeholder="Type 2 DM (2018), HTN, Appendectomy (2015)..." rows={3} />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Emergency Contact</label>
            <input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)}
              placeholder="Jane Doe - 9876543210 (wife)" />
          </div>
          <div className={styles.formGroup}>
            <label>Insurance Info</label>
            <input value={form.insurance_info} onChange={e => set('insurance_info', e.target.value)}
              placeholder="Policy No, Provider..." />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Additional notes..." rows={2} />
        </div>
      </div>

      <div className={styles.formActions}>
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button className={styles.saveBtn} onClick={() => onSave(form)} disabled={loading || !form.first_name.trim()}>
          {loading ? 'Saving...' : 'Save Patient'}
        </button>
      </div>
    </div>
  )
}

function PatientCard({ patient, onSelect, onEdit, onDelete }) {
  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className={styles.patientCard} onClick={() => onSelect(patient)}>
      <div className={styles.patientAvatar}>
        {(patient.first_name[0] || '?').toUpperCase()}
      </div>
      <div className={styles.patientInfo}>
        <h3 className={styles.patientName}>{patient.first_name} {patient.last_name}</h3>
        <div className={styles.patientMeta}>
          {patient.mrn && <span className={styles.mrn}>MRN: {patient.mrn}</span>}
          {age && <span>{age} yrs</span>}
          {patient.gender && <span>{patient.gender}</span>}
          {patient.blood_type && <span className={styles.bloodType}>{patient.blood_type}</span>}
        </div>
        {patient.phone && <p className={styles.patientPhone}>{patient.phone}</p>}
        {patient.allergies && (
          <p className={styles.allergyLine}><strong>Allergies:</strong> {patient.allergies.substring(0, 60)}{patient.allergies.length > 60 ? '...' : ''}</p>
        )}
      </div>
      <div className={styles.patientActions} onClick={e => e.stopPropagation()}>
        <button className={styles.actionBtn} onClick={() => onEdit(patient)} title="Edit">Edit</button>
        <button className={styles.actionBtn} onClick={() => onDelete(patient)} title="Delete" style={{ color: '#DC2626' }}>Delete</button>
      </div>
    </div>
  )
}

export default function Patients() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list') // list | create | edit | detail
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [encounters, setEncounters] = useState([])

  const load = async (q = '') => {
    try {
      const r = await patientApi.list(q)
      setPatients(r.data)
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async (form) => {
    setLoading(true)
    try {
      await patientApi.create(form)
      await load(search)
      setView('list')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create patient')
    } finally { setLoading(false) }
  }

  const handleUpdate = async (form) => {
    setLoading(true)
    try {
      await patientApi.update(selected.id, form)
      await load(search)
      setView('list')
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to update patient')
    } finally { setLoading(false) }
  }

  const handleDelete = async (patient) => {
    if (!confirm(`Delete patient ${patient.first_name} ${patient.last_name || ''}? This cannot be undone.`)) return
    try {
      await patientApi.delete(patient.id)
      await load(search)
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to delete patient')
    }
  }

  const handleSelect = async (patient) => {
    setSelected(patient)
    setView('detail')
    try {
      const r = await patientApi.getEncounters(patient.id)
      setEncounters(r.data || [])
    } catch { setEncounters([]) }
  }

  const startNewEncounter = () => {
    // Navigate to dashboard where they can create an encounter with this patient pre-filled
    navigate('/dashboard', { state: { patientId: selected.id, patientName: `${selected.first_name} ${selected.last_name || ''}` } })
  }

  if (view === 'create') {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => setView('list')}>← Back</button>
          <h1 className={styles.pageTitle}>New Patient</h1>
        </div>
        <div className={styles.formContainer}>
          <PatientForm onSave={handleCreate} onCancel={() => setView('list')} loading={loading} />
        </div>
      </div>
    )
  }

  if (view === 'edit' && selected) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => setView('list')}>← Back</button>
          <h1 className={styles.pageTitle}>Edit Patient — {selected.first_name} {selected.last_name}</h1>
        </div>
        <div className={styles.formContainer}>
          <PatientForm initial={selected} onSave={handleUpdate} onCancel={() => setView('list')} loading={loading} />
        </div>
      </div>
    )
  }

  if (view === 'detail' && selected) {
    const age = selected.date_of_birth
      ? Math.floor((Date.now() - new Date(selected.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
      : null

    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => { setView('list'); setSelected(null) }}>← Back</button>
          <h1 className={styles.pageTitle}>{selected.first_name} {selected.last_name}</h1>
          <div className={styles.headerActions}>
            <button className={styles.editBtn} onClick={() => setView('edit')}>Edit Patient</button>
            <button className={styles.newEncounterBtn} onClick={startNewEncounter}>+ New Encounter</button>
          </div>
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.detailCard}>
            <div className={styles.patientDetailHeader}>
              <div className={styles.bigAvatar}>{(selected.first_name[0] || '?').toUpperCase()}</div>
              <div>
                <h2>{selected.first_name} {selected.last_name}</h2>
                <div className={styles.detailMeta}>
                  {selected.mrn && <span className={styles.mrn}>MRN: {selected.mrn}</span>}
                  {age && <span>{age} years old</span>}
                  {selected.gender && <span className={styles.capitalize}>{selected.gender}</span>}
                  {selected.blood_type && <span className={styles.bloodType}>{selected.blood_type}</span>}
                </div>
                {selected.date_of_birth && <p className={styles.dob}>DOB: {selected.date_of_birth}</p>}
              </div>
            </div>

            <div className={styles.detailSections}>
              {[
                { label: 'Phone', value: selected.phone },
                { label: 'Email', value: selected.email },
                { label: 'Address', value: selected.address },
                { label: 'Emergency Contact', value: selected.emergency_contact },
                { label: 'Insurance', value: selected.insurance_info },
              ].filter(f => f.value).map(f => (
                <div key={f.label} className={styles.detailField}>
                  <span className={styles.detailLabel}>{f.label}</span>
                  <span className={styles.detailValue}>{f.value}</span>
                </div>
              ))}
            </div>

            {selected.allergies && (
              <div className={styles.allergyBox}>
                <strong>Allergies</strong>
                <p>{selected.allergies}</p>
              </div>
            )}
            {selected.current_medications && (
              <div className={styles.medsBox}>
                <strong>Current Medications</strong>
                <p>{selected.current_medications}</p>
              </div>
            )}
            {selected.medical_history && (
              <div className={styles.historyBox}>
                <strong>Medical History</strong>
                <p>{selected.medical_history}</p>
              </div>
            )}
            {selected.notes && (
              <div className={styles.notesBox}>
                <strong>Notes</strong>
                <p>{selected.notes}</p>
              </div>
            )}
          </div>

          <div className={styles.encounterHistoryCard}>
            <h3 className={styles.encounterHistoryTitle}>Encounter History ({encounters.length})</h3>
            {encounters.length === 0 ? (
              <div className={styles.noEncounters}>
                <p>No encounters yet.</p>
                <button className={styles.newEncounterBtn} onClick={startNewEncounter}>Start First Encounter</button>
              </div>
            ) : (
              encounters.map(enc => (
                <div key={enc.id} className={styles.encounterRow}
                  onClick={() => navigate(`/encounter/${enc.id}`)}>
                  <div className={styles.encounterInfo}>
                    <p className={styles.encounterComplaint}>{enc.chief_complaint || 'No chief complaint'}</p>
                    <p className={styles.encounterDate}>{new Date(enc.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${styles['status_' + enc.status]}`}>{enc.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Patient Management</h1>
          <p className={styles.pageSubtitle}>{patients.length} patients registered</p>
        </div>
        <button className={styles.newPatientBtn} onClick={() => setView('create')}>
          + New Patient
        </button>
      </div>

      <div className={styles.searchBar}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, MRN, or phone..."
        />
      </div>

      {patients.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBox}>Patients</div>
          <h2>No patients yet</h2>
          <p>Add your first patient to start managing records and encounter history.</p>
          <button className={styles.newPatientBtn} onClick={() => setView('create')}>+ Add First Patient</button>
        </div>
      ) : (
        <div className={styles.patientList}>
          {patients.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              onSelect={handleSelect}
              onEdit={(pt) => { setSelected(pt); setView('edit') }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
