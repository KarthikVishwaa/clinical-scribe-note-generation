import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './AudioRecorder.module.css'

const CHUNK_INTERVAL_MS  = 3000
const MAX_RECORD_SECONDS = 90   // 1.5 minutes

function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

function extFromMime(mime) {
  if (mime.includes('ogg')) return '.ogg'
  if (mime.includes('mp4')) return '.mp4'
  return '.webm'
}

export default function AudioRecorder({ onAudioChunk, onTranscribeRequest, onStop, disabled, dark, compact }) {
  const [recState,       setRecState]       = useState('idle')
  const [elapsed,        setElapsed]        = useState(0)
  const [bars,           setBars]           = useState(Array(20).fill(3))
  const [showLimitPopup, setShowLimitPopup] = useState(false)

  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const timerRef         = useRef(null)
  const analyserRef      = useRef(null)
  const animRef          = useRef(null)
  const mimeTypeRef      = useRef('')
  const autoStoppedRef   = useRef(false)

  const animateBars = useCallback(() => {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const count = 20
    const step  = Math.floor(data.length / count)
    const newBars = Array.from({ length: count }, (_, i) => {
      const v = data[i * step] / 255
      return 4 + v * 52
    })
    setBars(newBars)
    animRef.current = requestAnimationFrame(animateBars)
  }, [])

  const stopRecording = useCallback((triggeredByLimit = false) => {
    setRecState('processing')
    cancelAnimationFrame(animRef.current)
    clearInterval(timerRef.current)
    setBars(Array(20).fill(4))
    setElapsed(0)

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.addEventListener('stop', () => {
        setTimeout(() => {
          const ext = extFromMime(mimeTypeRef.current)
          onTranscribeRequest?.(ext)
        }, 150)
      }, { once: true })
      recorder.stop()
    } else {
      onTranscribeRequest?.()
    }

    streamRef.current?.getTracks().forEach(t => t.stop())
    onStop?.()
    setTimeout(() => setRecState('idle'), 800)

    if (triggeredByLimit) {
      setShowLimitPopup(true)
    }
  }, [onTranscribeRequest, onStop])

  // Auto-stop at 1.5 minutes
  useEffect(() => {
    if (elapsed >= MAX_RECORD_SECONDS && recState === 'recording' && !autoStoppedRef.current) {
      autoStoppedRef.current = true
      stopRecording(true)
    }
  }, [elapsed, recState, stopRecording])

  const startRecording = async () => {
    autoStoppedRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      streamRef.current = stream

      const ctx      = new AudioContext()
      const src      = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      src.connect(analyser)
      analyserRef.current = analyser
      animateBars()

      const mime    = getSupportedMimeType()
      mimeTypeRef.current = mime
      const recOpts = mime ? { mimeType: mime } : {}

      const recorder = new MediaRecorder(stream, recOpts)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) onAudioChunk?.(e.data)
      }

      recorder.start(CHUNK_INTERVAL_MS)
      setRecState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current)
    clearInterval(timerRef.current)
  }, [])

  const fmt        = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const remaining  = MAX_RECORD_SECONDS - elapsed
  const pct        = Math.min(100, (elapsed / MAX_RECORD_SECONDS) * 100)
  const isWarning  = remaining <= 20 && remaining > 0
  const isRecording  = recState === 'recording'
  const isProcessing = recState === 'processing'

  return (
    <>
      <div className={`${styles.recorder} ${dark ? styles.dark : ''}`}>

        {/* Left: mic + status */}
        <div className={styles.statusArea}>
          <div className={`${styles.micRing} ${isRecording ? styles.micRingActive : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.statusText}>
            {isProcessing ? (
              <><span className={styles.processingDot}/> Processing...</>
            ) : isRecording ? (
              <><span className={styles.recDot}/> Recording</>
            ) : (
              <span className={styles.readyText}>Ready to record</span>
            )}
          </div>
        </div>

        {/* Center: waveform + progress bar */}
        <div className={styles.waveformWrap}>
          <div className={styles.waveform}>
            {bars.map((h, i) => (
              <div key={i} className={`${styles.bar} ${isRecording ? styles.barActive : ''}`}
                style={{ height: `${h}px`, transition: isRecording ? 'height 0.08s ease' : 'height 0.4s ease' }} />
            ))}
          </div>
          {isRecording && (
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${isWarning ? styles.progressWarn : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        {/* Right: timer + buttons */}
        <div className={styles.controls}>
          {isRecording && (
            <div className={`${styles.timer} ${isWarning ? styles.timerWarn : ''}`}>
              {fmt(elapsed)}
              <span className={styles.timerLimit}>/ {fmt(MAX_RECORD_SECONDS)}</span>
            </div>
          )}
          {!isRecording && !isProcessing ? (
            <button className={styles.recordBtn} onClick={startRecording} disabled={disabled}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>
              Start Recording
            </button>
          ) : isRecording ? (
            <button className={styles.stopBtn} onClick={() => stopRecording(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop &amp; Transcribe
            </button>
          ) : (
            <div className={styles.processingBtn}>
              <span className={styles.spinnerWhite}/>
              Transcribing...
            </div>
          )}
        </div>
      </div>

      {/* Limit reached popup */}
      {showLimitPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowLimitPopup(false)}>
          <div className={styles.popupCard} onClick={e => e.stopPropagation()}>
            <div className={styles.popupIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 className={styles.popupTitle}>Recording limit reached</h3>
            <p className={styles.popupBody}>
              To manage API costs, each recording is limited to <strong>1 minute 30 seconds</strong>.
              Your audio has been sent for transcription automatically.
            </p>
            <p className={styles.popupBody}>
              Need longer recordings? Feel free to reach out — I'm happy to discuss extended access.
            </p>
            <div className={styles.popupActions}>
              <a
                href="https://www.linkedin.com/in/karthivisva/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.popupDmBtn}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
                DM on LinkedIn
              </a>
              <button className={styles.popupCloseBtn} onClick={() => setShowLimitPopup(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
