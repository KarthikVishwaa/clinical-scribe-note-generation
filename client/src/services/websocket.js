export function createEncounterSocket(encounterId, token, handlers = {}) {
  // In production use the Railway backend URL (swap https → wss)
  const backendUrl = import.meta.env.VITE_API_URL
  let url
  if (backendUrl) {
    const wsBase = backendUrl.replace(/^https/, 'wss').replace(/^http/, 'ws')
    url = `${wsBase}/ws/encounter/${encounterId}?token=${token}`
  } else {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const host = location.hostname === 'localhost' ? 'localhost:8000' : location.host
    url = `${protocol}://${host}/ws/encounter/${encounterId}?token=${token}`
  }

  const ws = new WebSocket(url)

  ws.onopen = () => handlers.onOpen?.()
  ws.onclose = (e) => handlers.onClose?.(e)
  ws.onerror = (e) => handlers.onError?.(e)

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'connected': handlers.onConnected?.(msg); break
        case 'transcript': handlers.onTranscript?.(msg); break
        case 'soap_note': handlers.onSoapNote?.(msg); break
        case 'entities': handlers.onEntities?.(msg); break
        case 'status': handlers.onStatus?.(msg.message); break
        case 'audio_received': handlers.onAudioReceived?.(msg); break
        case 'complete': handlers.onComplete?.(msg); break
        case 'error': handlers.onError?.(msg); break
        default: handlers.onMessage?.(msg)
      }
    } catch {
      // ignore non-JSON messages
    }
  }

  return {
    sendAudio: (chunk) => ws.readyState === WebSocket.OPEN && ws.send(chunk),
    transcribe: (language = 'en', fileExt = '.webm') => ws.readyState === WebSocket.OPEN &&
      ws.send(JSON.stringify({ command: 'transcribe', language, file_ext: fileExt })),
    ping: () => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ command: 'ping' })),
    close: () => ws.close(),
    get readyState() { return ws.readyState },
  }
}
