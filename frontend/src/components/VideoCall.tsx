import { useEffect, useRef, useState } from 'react'

interface Props {
  user: { name: string; avatar: string }
  onClose: () => void
}

export function VideoCall({ user, onClose }: Props) {
  const localRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [status, setStatus] = useState<"connecting"|"connected"|"error">("connecting")
  const [errorMsg, setErrorMsg] = useState("")
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    const timer = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => {
      clearInterval(timer)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (localRef.current) localRef.current.srcObject = stream
      setTimeout(() => setStatus("connected"), 1500)
    } catch(e: any) {
      setErrorMsg(e.name === "NotAllowedError" ? "Izin kamera ditolak!" : "Kamera tidak tersedia")
      setStatus("error")
    }
  }

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setMuted(!muted)
  }

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setVideoOff(!videoOff)
  }

  const handleEnd = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    onClose()
  }

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`

  const s = { position:"fixed" as const, inset:0, background:"#0a0a0a", zIndex:9999, display:"flex", flexDirection:"column" as const }

  if (status === "error") return (
    <div style={s}>
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
        <div style={{ width:80, height:80, borderRadius:"50%", border:"2px solid #ef4444", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
          <svg width="40" height="40" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"/>
          </svg>
        </div>
        <p style={{ color:"#ef4444", fontWeight:600, marginBottom:16 }}>{errorMsg}</p>
        <button onClick={handleEnd} style={{ padding:"10px 24px", background:"#4A154B", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700 }}>Tutup</button>
      </div>
    </div>
  )

  return (
    <div style={s}>
      <div style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {/* Remote placeholder */}
        <div style={{ textAlign:"center" }}>
          <div style={{ width:112, height:112, borderRadius:"50%", background:"#2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48, fontWeight:700, color:"white", margin:"0 auto 16px" }}>
            {user.avatar}
          </div>
          <p style={{ color:"white", fontWeight:600, fontSize:20 }}>{user.name}</p>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background: status==="connected" ? "#4ade80" : "#facc15" }}/>
            <p style={{ color:"#999", fontSize:14 }}>{status==="connecting" ? "Menghubungkan..." : fmt(seconds)}</p>
          </div>
        </div>

        {/* Local video */}
        <div style={{ position:"absolute", bottom:16, right:16, width:112, height:144, borderRadius:16, overflow:"hidden", border:"2px solid #333", background:"#1a1a1a" }}>
          {!videoOff
            ? <video ref={localRef} autoPlay muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ color:"white", fontSize:24, fontWeight:700 }}>{user.avatar[0]}</span>
              </div>
          }
        </div>

        {/* Timer */}
        {status === "connected" && (
          <div style={{ position:"absolute", top:16, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.6)", padding:"6px 14px", borderRadius:20, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80" }}/>
            <span style={{ color:"white", fontSize:13 }}>{fmt(seconds)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ height:112, background:"#111", borderTop:"1px solid #222", display:"flex", alignItems:"center", justifyContent:"center", gap:20 }}>
        <div style={{ textAlign:"center" }}>
          <button onClick={toggleMute} style={{ width:56, height:56, borderRadius:"50%", background: muted ? "#ef4444" : "#2a2a2a", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 4px" }}>
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              {muted
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                : <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              }
            </svg>
          </button>
          <span style={{ color:"#666", fontSize:11 }}>{muted ? "Bisu" : "Suara"}</span>
        </div>

        <div style={{ textAlign:"center" }}>
          <button onClick={handleEnd} style={{ width:64, height:64, borderRadius:"50%", background:"#ef4444", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 4px" }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"/>
            </svg>
          </button>
          <span style={{ color:"#666", fontSize:11 }}>Akhiri</span>
        </div>

        <div style={{ textAlign:"center" }}>
          <button onClick={toggleVideo} style={{ width:56, height:56, borderRadius:"50%", background: videoOff ? "#ef4444" : "#2a2a2a", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 4px" }}>
            <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              {videoOff && <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18"/>}
            </svg>
          </button>
          <span style={{ color:"#666", fontSize:11 }}>{videoOff ? "Video Mati" : "Video"}</span>
        </div>
      </div>
    </div>
  )
}
