import { useState, useEffect, useRef, useCallback } from 'react'
import Modal from './Modal'
import { encounterApi } from '../services/api'
import styles from './FeatureModal.module.css'
import rxStyles from './PrescriptionModal.module.css'

// ── Medicine spell-check via OpenFDA (free, no key needed) ────────────────────
async function checkMedicineName(name) {
  if (!name || name.trim().length < 2) return 'unknown'
  try {
    const q = encodeURIComponent(name.trim().toLowerCase())
    const url =
      `https://api.fda.gov/drug/label.json?search=` +
      `(openfda.brand_name:"${q}"+openfda.generic_name:"${q}")&limit=1`
    const r = await fetch(url)
    if (r.status === 200) {
      const j = await r.json()
      return j.results?.length > 0 ? 'valid' : 'warning'
    }
    return 'warning'
  } catch {
    return 'unknown'
  }
}

const BLANK_MED = {
  name: '', generic_name: '', dosage: '', form: 'tablet',
  route: 'oral', frequency: '', duration: '', instructions: '', quantity: ''
}

export default function PrescriptionModal({ encounterId, onClose }) {
  const [loading, setLoading]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [data,    setData]      = useState(null)
  const [error,   setError]     = useState('')
  const [saveMsg, setSaveMsg]   = useState('')

  // Local editable copy of medications
  const [meds, setMeds] = useState([])

  // Add-new-medicine form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMed,      setNewMed]      = useState(BLANK_MED)
  const [nameCheck,   setNameCheck]   = useState('idle') // idle|checking|valid|warning|unknown

  // Spell-check for existing row being edited
  const [rowChecks, setRowChecks] = useState({}) // {index: 'valid'|'warning'|'checking'|'unknown'}

  const checkTimerRef = useRef(null)

  // ── Load existing prescription ────────────────────────────────────────────
  useEffect(() => {
    encounterApi.getPrescription(encounterId)
      .then(r => { setData(r.data); loadMeds(r.data) })
      .catch(() => {})
  }, [encounterId])

  const loadMeds = (d) => {
    try {
      const parsed = d?.medications_json ? JSON.parse(d.medications_json) : []
      setMeds(parsed)
    } catch { setMeds([]) }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    setLoading(true); setError('')
    try {
      const r = await encounterApi.generatePrescription(encounterId)
      setData(r.data)
      loadMeds(r.data)
      setSaveMsg('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate prescription')
    } finally { setLoading(false) }
  }

  // ── Save edits to backend ─────────────────────────────────────────────────
  const saveEdits = async () => {
    setSaving(true); setSaveMsg(''); setError('')
    try {
      await encounterApi.updatePrescription(encounterId, { medications: meds })
      setSaveMsg('Changes saved.')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save changes')
    } finally { setSaving(false) }
  }

  // ── Download PDF (saves first so PDF reflects edits) ─────────────────────
  const downloadPdf = async () => {
    await saveEdits()
    const url   = encounterApi.prescriptionPdfUrl(encounterId)
    const token = localStorage.getItem('token')
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `prescription_${encounterId}.pdf`
        a.click()
      })
      .catch(() => setError('PDF download failed'))
  }

  // ── Delete a medication row ───────────────────────────────────────────────
  const deleteMed = (idx) => {
    setMeds(prev => prev.filter((_, i) => i !== idx))
    setSaveMsg('')
  }

  // ── Spell-check: new med name field ──────────────────────────────────────
  const handleNewMedName = (val) => {
    setNewMed(f => ({ ...f, name: val }))
    setNameCheck('idle')
    clearTimeout(checkTimerRef.current)
    if (val.trim().length >= 2) {
      setNameCheck('checking')
      checkTimerRef.current = setTimeout(async () => {
        const result = await checkMedicineName(val)
        setNameCheck(result)
      }, 700)
    }
  }

  // ── Spell-check: existing row name ───────────────────────────────────────
  const handleRowNameChange = (idx, val) => {
    setMeds(prev => prev.map((m, i) => i === idx ? { ...m, name: val } : m))
    setRowChecks(prev => ({ ...prev, [idx]: 'idle' }))
    clearTimeout(checkTimerRef.current)
    if (val.trim().length >= 2) {
      setRowChecks(prev => ({ ...prev, [idx]: 'checking' }))
      checkTimerRef.current = setTimeout(async () => {
        const result = await checkMedicineName(val)
        setRowChecks(prev => ({ ...prev, [idx]: result }))
      }, 700)
    }
  }

  // ── Add new medication ────────────────────────────────────────────────────
  const addMedicine = () => {
    if (!newMed.name.trim()) return
    setMeds(prev => [...prev, { ...newMed }])
    setNewMed(BLANK_MED)
    setNameCheck('idle')
    setShowAddForm(false)
    setSaveMsg('')
  }

  // ── Name-check badge ─────────────────────────────────────────────────────
  const NameBadge = ({ status }) => {
    if (!status || status === 'idle') return null
    if (status === 'checking') return <span className={rxStyles.badgeChecking}>Checking...</span>
    if (status === 'valid')    return <span className={rxStyles.badgeValid}>Verified in FDA database</span>
    if (status === 'warning')  return <span className={rxStyles.badgeWarning}>Not found — check spelling</span>
    return null
  }

  return (
    <Modal title="Prescription Generator" onClose={onClose} wide>
      <div className={styles.featureBody}>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!data && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconBox}>Rx</div>
            <p className={styles.emptyTitle}>Generate Prescription</p>
            <p className={styles.emptyHint}>
              Medical AI will extract medications from the SOAP plan and structure them into a professional prescription.
            </p>
            <button className={styles.primaryBtn} onClick={generate}>Generate Prescription</button>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Medical AI is generating prescription from SOAP note...</p>
          </div>
        )}

        {error   && <div className={styles.errorBox}>{error}</div>}
        {saveMsg && <div className={rxStyles.saveMsg}>{saveMsg}</div>}

        {/* ── Prescription view ────────────────────────────────────────── */}
        {data && (
          <div className={styles.resultContainer}>

            {/* Header row */}
            <div className={styles.resultHeader}>
              <div>
                <p className={styles.resultLabel}>Patient</p>
                <p className={styles.resultValue}>{data.patient_name || 'Unknown'}</p>
              </div>
              {data.diagnosis && (
                <div>
                  <p className={styles.resultLabel}>Diagnosis</p>
                  <p className={styles.resultValue}>{data.diagnosis}</p>
                </div>
              )}
              <div className={styles.resultActions}>
                <button className={styles.secondaryBtn} onClick={generate} disabled={loading}>
                  Regenerate
                </button>
                <button className={styles.secondaryBtn} onClick={saveEdits} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className={styles.primaryBtn} onClick={downloadPdf}>
                  Download PDF
                </button>
              </div>
            </div>

            {/* Medications table */}
            {meds.length > 0 ? (
              <table className={styles.rxTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {meds.map((med, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        {/* Inline editable name with spell-check */}
                        <div className={rxStyles.nameCell}>
                          <input
                            className={`${rxStyles.inlineInput} ${
                              rowChecks[i] === 'warning' ? rxStyles.inputWarn :
                              rowChecks[i] === 'valid'   ? rxStyles.inputValid : ''
                            }`}
                            value={med.name}
                            onChange={e => handleRowNameChange(i, e.target.value)}
                            placeholder="Medicine name"
                          />
                          <NameBadge status={rowChecks[i]} />
                          {med.generic_name && (
                            <span className={styles.generic}>{med.generic_name}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input className={rxStyles.inlineInput} value={med.dosage || ''}
                          onChange={e => setMeds(p => p.map((m,j) => j===i ? {...m, dosage: e.target.value} : m))}
                          placeholder="e.g. 500mg" />
                      </td>
                      <td>
                        <input className={rxStyles.inlineInput} value={med.frequency || ''}
                          onChange={e => setMeds(p => p.map((m,j) => j===i ? {...m, frequency: e.target.value} : m))}
                          placeholder="e.g. twice daily" />
                      </td>
                      <td>
                        <input className={rxStyles.inlineInput} value={med.duration || ''}
                          onChange={e => setMeds(p => p.map((m,j) => j===i ? {...m, duration: e.target.value} : m))}
                          placeholder="e.g. 7 days" />
                      </td>
                      <td className={styles.instructions}>
                        <input className={rxStyles.inlineInput} value={med.instructions || ''}
                          onChange={e => setMeds(p => p.map((m,j) => j===i ? {...m, instructions: e.target.value} : m))}
                          placeholder="Instructions" />
                      </td>
                      {/* Delete button */}
                      <td>
                        <button className={rxStyles.deleteBtn} onClick={() => deleteMed(i)} title="Remove medication">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.noMeds}>No medications yet. Add one below.</p>
            )}

            {/* ── Add new medicine form ──────────────────────────────── */}
            {showAddForm ? (
              <div className={rxStyles.addForm}>
                <p className={rxStyles.addFormTitle}>Add Medicine</p>

                <div className={rxStyles.addGrid}>
                  <div className={rxStyles.addField}>
                    <label>Medicine Name *</label>
                    <input
                      className={`${rxStyles.addInput} ${
                        nameCheck === 'warning' ? rxStyles.inputWarn :
                        nameCheck === 'valid'   ? rxStyles.inputValid : ''
                      }`}
                      value={newMed.name}
                      onChange={e => handleNewMedName(e.target.value)}
                      placeholder="e.g. Amoxicillin"
                    />
                    <NameBadge status={nameCheck} />
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Generic Name</label>
                    <input className={rxStyles.addInput} value={newMed.generic_name}
                      onChange={e => setNewMed(f => ({ ...f, generic_name: e.target.value }))}
                      placeholder="e.g. amoxicillin" />
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Dosage</label>
                    <input className={rxStyles.addInput} value={newMed.dosage}
                      onChange={e => setNewMed(f => ({ ...f, dosage: e.target.value }))}
                      placeholder="e.g. 500mg" />
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Form</label>
                    <select className={rxStyles.addInput} value={newMed.form}
                      onChange={e => setNewMed(f => ({ ...f, form: e.target.value }))}>
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="syrup">Syrup</option>
                      <option value="injection">Injection</option>
                      <option value="cream">Cream</option>
                      <option value="inhaler">Inhaler</option>
                      <option value="drops">Drops</option>
                      <option value="patch">Patch</option>
                    </select>
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Route</label>
                    <select className={rxStyles.addInput} value={newMed.route}
                      onChange={e => setNewMed(f => ({ ...f, route: e.target.value }))}>
                      <option value="oral">Oral</option>
                      <option value="topical">Topical</option>
                      <option value="IV">IV</option>
                      <option value="IM">IM</option>
                      <option value="subcutaneous">Subcutaneous</option>
                      <option value="inhaled">Inhaled</option>
                    </select>
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Frequency</label>
                    <input className={rxStyles.addInput} value={newMed.frequency}
                      onChange={e => setNewMed(f => ({ ...f, frequency: e.target.value }))}
                      placeholder="e.g. twice daily" />
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Duration</label>
                    <input className={rxStyles.addInput} value={newMed.duration}
                      onChange={e => setNewMed(f => ({ ...f, duration: e.target.value }))}
                      placeholder="e.g. 7 days" />
                  </div>

                  <div className={rxStyles.addField}>
                    <label>Quantity</label>
                    <input className={rxStyles.addInput} value={newMed.quantity}
                      onChange={e => setNewMed(f => ({ ...f, quantity: e.target.value }))}
                      placeholder="e.g. 14 tablets" />
                  </div>
                </div>

                <div className={rxStyles.addField} style={{ gridColumn: '1 / -1' }}>
                  <label>Instructions</label>
                  <input className={rxStyles.addInput} value={newMed.instructions}
                    onChange={e => setNewMed(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="e.g. Take with food, avoid alcohol" />
                </div>

                {nameCheck === 'warning' && (
                  <div className={rxStyles.spellWarn}>
                    Medicine name not found in FDA database — please double-check the spelling before adding.
                  </div>
                )}

                <div className={rxStyles.addFormActions}>
                  <button className={styles.secondaryBtn} onClick={() => { setShowAddForm(false); setNewMed(BLANK_MED); setNameCheck('idle') }}>
                    Cancel
                  </button>
                  <button className={styles.primaryBtn} onClick={addMedicine} disabled={!newMed.name.trim()}>
                    Add to Prescription
                  </button>
                </div>
              </div>
            ) : (
              <button className={rxStyles.addMedBtn} onClick={() => setShowAddForm(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Medicine
              </button>
            )}

            {data.notes && (
              <div className={styles.notesBox}>
                <strong>Special Instructions:</strong> {data.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
