import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { encounterApi } from '../services/api'
import { createEncounterSocket } from '../services/websocket'
import AudioRecorder from '../components/AudioRecorder'
import TranscriptPanel from '../components/TranscriptPanel'
import SOAPNoteEditor from '../components/SOAPNoteEditor'
import EntityPanel from '../components/EntityPanel'
import FeatureToolbar from '../components/FeatureToolbar'
import PrescriptionModal from '../components/PrescriptionModal'
import DrugInteractionModal from '../components/DrugInteractionModal'
import DiffDiagnosisModal from '../components/DiffDiagnosisModal'
import LabInterpreterModal from '../components/LabInterpreterModal'
import ReferralModal from '../components/ReferralModal'
import ReminderModal from '../components/ReminderModal'
import styles from './Encounter.module.css'

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'ta', label: '🇮🇳 Tamil' },
  { code: 'hi', label: '🇮🇳 Hindi' },
  { code: 'ar', label: '🇸🇦 Arabic' },
  { code: 'es', label: '🇪🇸 Spanish' },
  { code: 'fr', label: '🇫🇷 French' },
  { code: 'de', label: '🇩🇪 German' },
  { code: 'zh', label: '🇨🇳 Chinese' },
  { code: 'ja', label: '🇯🇵 Japanese' },
  { code: 'pt', label: '🇧🇷 Portuguese' },
]

/* ── Voice Commands ────────────────────────────────────────────────────────── */
function useVoiceCommands({ onStart, onStop, onTranscribe, onPrescription, onDrugCheck, enabled }) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US'
    rec.onresult = (event) => {
      const t = event.results[event.results.length - 1][0].transcript.toLowerCase().trim()
      if (t.includes('start recording') || t.includes('begin recording')) onStart?.()
      else if (t.includes('stop recording') || t.includes('end recording')) onStop?.()
      else if (t.includes('transcribe') || t.includes('generate note')) onTranscribe?.()
      else if (t.includes('prescription')) onPrescription?.()
      else if (t.includes('drug interaction')) onDrugCheck?.()
    }
    rec.onend = () => { if (listening) rec.start() }
    recognitionRef.current = rec
    return () => { rec.onend = null; rec.stop() }
  }, [enabled])

  const startListening = () => { try { recognitionRef.current?.start(); setListening(true) } catch {} }
  const stopListening  = () => { recognitionRef.current?.onend && (recognitionRef.current.onend = null); recognitionRef.current?.stop(); setListening(false) }
  return { listening, startListening, stopListening }
}

/* ── Patient Name Modal ────────────────────────────────────────────────────── */
function PatientNameModal({ onSave }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) onSave(name.trim())
  }

  return (
    <div className={styles.nameOverlay}>
      <div className={styles.nameCard}>
        <div className={styles.nameCardIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h2 className={styles.nameCardTitle}>Patient Name</h2>
        <p className={styles.nameCardSub}>Enter the patient's name to begin this encounter</p>
        <form onSubmit={handleSubmit} className={styles.nameForm}>
          <input
            ref={inputRef}
            className={styles.nameInput}
            placeholder="e.g. Karthik Raja"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <button type="submit" className={styles.nameSubmit} disabled={!name.trim()}>
            Start Encounter
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function Encounter() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [encounter,     setEncounter]     = useState(null)
  const [transcripts,   setTranscripts]   = useState([])
  const [soapNote,      setSoapNote]      = useState(null)
  const [entities,      setEntities]      = useState([])
  const [statusMsg,     setStatusMsg]     = useState('')
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [isSaving,      setIsSaving]      = useState(false)
  const [wsConnected,   setWsConnected]   = useState(false)
  const [language,      setLanguage]      = useState('en')
  const [activeModal,   setActiveModal]   = useState(null)
  const [voiceEnabled,  setVoiceEnabled]  = useState(false)

  // Patient name editing
  const [showNameModal, setShowNameModal] = useState(false)
  const [editingName,   setEditingName]   = useState(false)
  const [editNameVal,   setEditNameVal]   = useState('')

  const audioRecorderRef = useRef(null)
  const wsRef   = useRef(null)
  const token   = localStorage.getItem('token')

  useEffect(() => {
    encounterApi.get(id).then((r) => {
      const enc = r.data
      setEncounter(enc)
      setTranscripts(enc.transcripts || [])
      setSoapNote(enc.soap_notes?.[0] || null)
      setEntities(enc.medical_entities || [])
      if (enc.language) setLanguage(enc.language)
      // Show name modal if no patient name yet
      if (!enc.patient_name) setShowNameModal(true)
      setEditNameVal(enc.patient_name || '')
    }).catch(() => navigate('/dashboard'))
  }, [id])

  useEffect(() => {
    if (!token) return
    const ws = createEncounterSocket(id, token, {
      onConnected:  () => setWsConnected(true),
      onClose:      () => setWsConnected(false),
      onTranscript: (msg) => { setTranscripts(prev => [...prev, { text: msg.text, id: msg.transcript_id }]); setIsProcessing(true) },
      onSoapNote:   (msg) => setSoapNote({ subjective: msg.subjective, objective: msg.objective, assessment: msg.assessment, plan: msg.plan }),
      onEntities:   (msg) => setEntities(msg.entities || []),
      onStatus:     (msg) => setStatusMsg(msg),
      onComplete:   () => { setIsProcessing(false); setStatusMsg('') },
      onError:      (msg) => { setIsProcessing(false); setStatusMsg(''); alert(msg.message || 'An error occurred') },
    })
    wsRef.current = ws
    return () => ws.close()
  }, [id, token])

  const handleAudioChunk = useCallback((chunk) => wsRef.current?.sendAudio(chunk), [])

  const handleTranscribeRequest = useCallback((fileExt = '.webm') => {
    setIsProcessing(true)
    setStatusMsg('Sending audio for transcription...')
    wsRef.current?.transcribe(language, fileExt)
  }, [language])

  const handleSaveSOAP = async (data) => {
    setIsSaving(true)
    try { const r = await encounterApi.updateSoap(id, data); setSoapNote(r.data) }
    finally { setIsSaving(false) }
  }

  const handleLanguageChange = async (lang) => {
    setLanguage(lang)
    try { await encounterApi.update(id, { language: lang }) } catch {}
  }

  // Save patient name from modal
  const handleSavePatientName = async (name) => {
    try {
      await encounterApi.update(id, { patient_name: name })
      setEncounter(prev => ({ ...prev, patient_name: name }))
      setEditNameVal(name)
    } catch {}
    setShowNameModal(false)
  }

  // Save inline name edit
  const handleSaveNameEdit = async () => {
    if (!editNameVal.trim()) return
    try {
      await encounterApi.update(id, { patient_name: editNameVal.trim() })
      setEncounter(prev => ({ ...prev, patient_name: editNameVal.trim() }))
    } catch {}
    setEditingName(false)
  }

  const handleFeature = (featureId) => {
    if (featureId === 'pdf') {
      const url = encounterApi.exportPdf(id)
      const token = localStorage.getItem('token')
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { if (!r.ok) throw new Error('PDF generation failed. Make sure SOAP note exists.'); return r.blob() })
        .then(blob => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `soap_note_${id}.pdf`; a.click() })
        .catch(e => alert(e.message))
      return
    }
    setActiveModal(featureId)
  }

  const { startListening: startVC, stopListening: stopVC } = useVoiceCommands({
    enabled: voiceEnabled,
    onTranscribe: handleTranscribeRequest,
    onPrescription: () => setActiveModal('prescription'),
    onDrugCheck: () => setActiveModal('drugs'),
  })

  const toggleVoiceCommands = () => {
    if (voiceEnabled) { stopVC(); setVoiceEnabled(false) }
    else { setVoiceEnabled(true); startVC() }
  }

  const symptomsForDx = soapNote?.subjective || transcripts.map(t => t.text).join(' ').substring(0, 500)

  if (!encounter) {
    return <div className={styles.loading}><span className={styles.spinner} />Loading encounter...</div>
  }

  return (
    <div className={styles.page}>

      {/* ── Patient name modal (first visit) ── */}
      {showNameModal && <PatientNameModal onSave={handleSavePatientName} />}

      {/* ── Top header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/dashboard')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>

          <div className={styles.patientInfo}>
            {/* Name row with inline edit */}
            <div className={styles.nameRow}>
              {editingName ? (
                <>
                  <input
                    className={styles.nameEditInput}
                    value={editNameVal}
                    onChange={e => setEditNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNameEdit(); if (e.key === 'Escape') setEditingName(false) }}
                    autoFocus
                  />
                  <button className={styles.nameConfirmBtn} onClick={handleSaveNameEdit} title="Save">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button className={styles.nameCancelBtn} onClick={() => setEditingName(false)} title="Cancel">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <h1 className={styles.pageTitle}>{encounter.patient_name || 'Anonymous Patient'}</h1>
                  <button className={styles.nameEditBtn} onClick={() => { setEditNameVal(encounter.patient_name || ''); setEditingName(true) }} title="Edit name">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Meta row */}
            <div className={styles.meta}>
              {encounter.patient_id && (
                <span className={styles.idBadge}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>
                  ID: {encounter.patient_id}
                </span>
              )}
              {encounter.chief_complaint && <><span>{encounter.chief_complaint}</span><span className={styles.metaDot}/></>}
              <span className={wsConnected ? styles.wsOn : styles.wsOff}>
                {wsConnected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Voice commands toggle */}
        <button
          onClick={toggleVoiceCommands}
          className={voiceEnabled ? styles.voiceBtnOn : styles.voiceBtn}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
          </svg>
          {voiceEnabled ? 'Voice ON' : 'Voice Commands'}
        </button>
      </div>

      {/* ── Compact recorder strip ── */}
      <div className={styles.recorderStrip}>
        <AudioRecorder
          ref={audioRecorderRef}
          onAudioChunk={handleAudioChunk}
          onTranscribeRequest={handleTranscribeRequest}
          disabled={!wsConnected}
          dark
          compact
        />
        <div className={styles.stripRight}>
          <span className={styles.langLabel}>Lang:</span>
          <select
            className={styles.langSelect}
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Three output panels ── */}
      <div className={styles.grid}>
        <div className={styles.colLeft}>
          <TranscriptPanel transcripts={transcripts} statusMessage={statusMsg} isProcessing={isProcessing} />
        </div>
        <div className={styles.colCenter}>
          <SOAPNoteEditor soapNote={soapNote} onSave={handleSaveSOAP} isSaving={isSaving} />
        </div>
        <div className={styles.colRight}>
          <EntityPanel entities={entities} />
        </div>
      </div>

      {/* ── AI Feature Toolbar ── */}
      <FeatureToolbar onFeature={handleFeature} hasSoap={Boolean(soapNote)} />

      {/* ── Modals ── */}
      {activeModal === 'prescription' && <PrescriptionModal encounterId={id} onClose={() => setActiveModal(null)} />}
      {activeModal === 'drugs'        && <DrugInteractionModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'diagnosis'    && <DiffDiagnosisModal onClose={() => setActiveModal(null)} prefillSymptoms={symptomsForDx} />}
      {activeModal === 'labs'         && <LabInterpreterModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'referral'     && <ReferralModal encounterId={id} onClose={() => setActiveModal(null)} />}
      {activeModal === 'reminders'    && <ReminderModal encounterId={id} onClose={() => setActiveModal(null)} />}

    </div>
  )
}
