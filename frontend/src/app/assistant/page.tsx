'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore } from '../../lib/store'
import { useRouter } from 'next/navigation'
import api from '../../lib/api'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

type SpeechRecognition = any
type SpeechRecognitionEvent = any

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

const SUGGESTED_PROMPTS = [
  'Find tenders matching our profile',
  'Analyze latest high-score matches',
  'Generate proposal draft',
  'What tenders are expiring soon?',
]

function genId() {
  return Math.random().toString(36).slice(2, 11)
}

export default function AssistantPage() {
  const { isAuthenticated, user } = useStore()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [voiceActive, setVoiceActive] = useState(false)
  const [wsReady, setWsReady] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamingIdRef = useRef<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const reconnectCountRef = useRef(0)

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login')
  }, [isAuthenticated, router])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking, scrollToBottom])

  const handleWsMessage = useCallback(
    (payload: { type: string; data?: string; message?: string }) => {
      if (payload.type === 'stream_chunk' && payload.data) {
        setIsThinking(false)
        setMessages((prev) => {
          const sid = streamingIdRef.current
          if (!sid) {
            const newId = genId()
            streamingIdRef.current = newId
            return [
              ...prev,
              {
                id: newId,
                role: 'assistant',
                content: payload.data ?? '',
                timestamp: new Date(),
                isStreaming: true,
              },
            ]
          }
          return prev.map((m) =>
            m.id === sid
              ? { ...m, content: m.content + (payload.data ?? ''), isStreaming: true }
              : m
          )
        })
      } else if (payload.type === 'stream_end') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingIdRef.current ? { ...m, isStreaming: false } : m
          )
        )
        streamingIdRef.current = null
        setIsThinking(false)
      } else if (payload.type === 'error') {
        setIsThinking(false)
        streamingIdRef.current = null
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: 'assistant',
            content: `⚠️ ${payload.message ?? 'Something went wrong. Please try again.'}`,
            timestamp: new Date(),
            isStreaming: false,
          },
        ])
      }
    },
    []
  )

  /* ── WebSocket lifecycle — max 3 reconnect attempts ── */
  useEffect(() => {
    if (!isAuthenticated) return

    const token = localStorage.getItem('access_token') ?? ''
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/assistant?token=${encodeURIComponent(token)}`

    let ws: WebSocket
    let reconnectTimer: ReturnType<typeof setTimeout>

    const connect = () => {
      if (reconnectCountRef.current >= 3) return
      try {
        ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setIsConnected(true)
          setWsReady(true)
          reconnectCountRef.current = 0
        }

        ws.onclose = () => {
          setIsConnected(false)
          setWsReady(false)
          reconnectCountRef.current += 1
          if (reconnectCountRef.current < 3) {
            reconnectTimer = setTimeout(connect, 5000)
          }
        }

        ws.onerror = () => {
          setIsConnected(false)
          setWsReady(false)
          ws.close()
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data as string)
            handleWsMessage(payload)
          } catch {
            /* ignore malformed frames */
          }
        }
      } catch {
        setIsConnected(false)
        setWsReady(false)
        reconnectCountRef.current += 1
        if (reconnectCountRef.current < 3) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, handleWsMessage])

  /* ── HTTP fallback — uses api client (has auth headers) ── */
  const sendViaHttp = useCallback(async (content: string) => {
    try {
      const res = await api.post('/assistant/chat', { message: content })
      const reply: string = res.data?.reply ?? res.data?.content ?? 'No response.'
      const newId = genId()
      setMessages((prev) => [
        ...prev,
        { id: newId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true },
      ])
      let i = 0
      const interval = setInterval(() => {
        i++
        setMessages((prev) =>
          prev.map((m) =>
            m.id === newId ? { ...m, content: reply.slice(0, i) } : m
          )
        )
        if (i >= reply.length) {
          clearInterval(interval)
          setMessages((prev) =>
            prev.map((m) => (m.id === newId ? { ...m, isStreaming: false } : m))
          )
          setIsThinking(false)
        }
      }, 12)
    } catch {
      setIsThinking(false)
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: 'assistant',
          content: '⚠️ Failed to reach the assistant. Please try again.',
          timestamp: new Date(),
          isStreaming: false,
        },
      ])
    }
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isThinking) return

      const userMsg: Message = {
        id: genId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsThinking(true)
      streamingIdRef.current = null

      if (wsReady && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'message', content: trimmed }))
      } else {
        sendViaHttp(trimmed)
      }
    },
    [isThinking, wsReady, sendViaHttp]
  )

  const toggleVoice = useCallback(() => {
    const hasSR = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    if (!hasSR) {
      alert('Voice input is not supported in this browser.')
      return
    }

    if (voiceActive) {
      recognitionRef.current?.stop()
      setVoiceActive(false)
      return
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition: SpeechRecognition = new SpeechRecognitionCtor()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setVoiceActive(true)
    recognition.onend = () => setVoiceActive(false)
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('')
      setInput(transcript)
      if (e.results[e.results.length - 1].isFinal) {
        setVoiceActive(false)
      }
    }
    recognition.start()
  }, [voiceActive])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="assistant-page flex flex-col h-screen bg-gray-950 overflow-hidden">

      {/* ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 light-hide">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gray-950/80 backdrop-blur-xl assistant-header">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <span className="text-xl leading-none select-none">🤖</span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400/20 to-purple-600/20 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              TenderAI{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Assistant
              </span>
            </h1>
            <p className="text-xs text-gray-500">Powered by AI · Real-time responses</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-white/5 assistant-status-pill">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </span>
          <span
            className={`text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {isConnected ? 'Live Stream' : 'HTTP Mode'}
          </span>
        </div>
      </header>

      {/* ═══ SUGGESTED PROMPTS ═══ */}
      <div className="relative z-10 px-4 pt-3 pb-1">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isThinking}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/20 text-indigo-300 hover:text-white hover:border-indigo-400/50 hover:from-indigo-800/70 hover:to-purple-800/70 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-indigo-500/10 active:scale-95 whitespace-nowrap backdrop-blur-sm assistant-chip"
            >
              ✦ {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CHAT AREA ═══ */}
      <main
        className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-6"
        style={{ scrollbarWidth: 'none' }}
      >
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8 pb-16">
            <div className="relative">
              <div
                className="text-7xl mb-2"
                style={{ animation: 'bounceSlow 3s ease-in-out infinite' }}
              >
                🤖
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-4 bg-indigo-500/20 blur-xl rounded-full" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Hello{user?.first_name ? `, ${user.first_name}` : ''}! 👋
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                I&apos;m your TenderAI assistant. Ask me anything about tenders, proposals, or your
                company profile — I reply in real time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {[
                { icon: '🔍', label: 'Find Tenders' },
                { icon: '📊', label: 'Analyze Matches' },
                { icon: '✍️', label: 'Draft Proposals' },
                { icon: '⏰', label: 'Expiring Soon' },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-900/60 border border-white/5 text-gray-400 text-xs font-medium assistant-feature-card"
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            style={{ animation: 'fadeIn 0.25s ease-out forwards' }}
          >
            <span className="text-[10px] text-gray-500 px-1 font-medium tracking-wide uppercase">
              {msg.role === 'user' ? (user?.first_name ?? 'You') : 'TenderAI'}
            </span>

            <div
              className={`relative px-4 py-3 max-w-lg text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-br-sm ml-auto shadow-indigo-500/20'
                  : 'assistant-bubble bg-gray-800/90 text-gray-100 rounded-2xl rounded-bl-sm mr-auto shadow-black/30 border border-white/5'
              }`}
            >
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
              {msg.isStreaming && (
                <span
                  className="ml-0.5 inline-block w-0.5 h-4 bg-indigo-400 rounded-full align-middle"
                  style={{ animation: 'blink 1s step-start infinite' }}
                />
              )}
            </div>

            <span className="text-[10px] text-gray-600 px-1">{fmt(msg.timestamp)}</span>
          </div>
        ))}

        {isThinking && (
          <div
            className="flex flex-col items-start gap-1"
            style={{ animation: 'fadeIn 0.25s ease-out forwards' }}
          >
            <span className="text-[10px] text-gray-500 px-1 font-medium tracking-wide uppercase">
              TenderAI
            </span>
            <div className="flex items-center gap-1.5 px-4 py-3.5 bg-gray-800/90 border border-white/5 rounded-2xl rounded-bl-sm shadow-lg assistant-bubble">
              <span className="w-2 h-2 bg-indigo-400 rounded-full" style={{ animation: 'bounce 1s infinite 0ms' }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full" style={{ animation: 'bounce 1s infinite 150ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full" style={{ animation: 'bounce 1s infinite 300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ═══ INPUT BAR ═══ */}
      <div className="relative z-10 px-4 pb-6 pt-3">
        <div className="assistant-input-bar flex items-end gap-3 px-4 py-3 rounded-2xl bg-gray-900/80 border border-white/[0.08] backdrop-blur-xl shadow-2xl shadow-black/40 ring-1 ring-white/5 focus-within:border-indigo-500/40 transition-all duration-300">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about tenders, proposals, analysis…"
            rows={1}
            disabled={isThinking}
            className="flex-1 resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50 min-h-[24px] max-h-[160px] assistant-textarea"
            style={{ height: '24px', scrollbarWidth: 'none' }}
          />

          <button
            onClick={toggleVoice}
            title={voiceActive ? 'Stop recording' : 'Voice input'}
            className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl text-lg transition-all duration-200 cursor-pointer active:scale-90 ${voiceActive ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20' : 'bg-gray-800 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 border border-white/5'}`}
            style={voiceActive ? { animation: 'pulse 1s infinite' } : {}}
          >
            🎤
          </button>

          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isThinking}
            title="Send (Enter)"
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 cursor-pointer"
          >
            ➤
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-600 mt-2">
          Press{' '}
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500 text-[10px] font-mono assistant-kbd">
            Enter
          </kbd>{' '}
          to send &nbsp;·&nbsp;{' '}
          <kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500 text-[10px] font-mono assistant-kbd">
            Shift+Enter
          </kbd>{' '}
          for new line
        </p>
      </div>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }

        /* ── Light mode overrides for assistant page ── */
        html.light .assistant-page { background-color: #f1f5f9 !important; }
        html.light .assistant-header { background-color: rgba(241,245,249,0.9) !important; border-color: rgba(0,0,0,0.08) !important; }
        html.light .assistant-status-pill { background-color: #ffffff !important; border-color: rgba(0,0,0,0.08) !important; }
        html.light .assistant-chip { background: rgba(99,102,241,0.08) !important; color: #4f46e5 !important; border-color: rgba(99,102,241,0.2) !important; }
        html.light .assistant-chip:hover { color: #3730a3 !important; }
        html.light .assistant-bubble { background-color: #ffffff !important; border-color: rgba(0,0,0,0.08) !important; color: #1e293b !important; }
        html.light .assistant-feature-card { background-color: #ffffff !important; border-color: rgba(0,0,0,0.08) !important; color: #475569 !important; }
        html.light .assistant-input-bar { background-color: rgba(255,255,255,0.95) !important; border-color: rgba(0,0,0,0.1) !important; box-shadow: 0 4px 24px rgba(0,0,0,0.06) !important; }
        html.light .assistant-textarea { color: #0f172a !important; }
        html.light .assistant-textarea::placeholder { color: #94a3b8 !important; }
        html.light .assistant-kbd { background-color: #e2e8f0 !important; color: #64748b !important; }
        html.light .light-hide { opacity: 0 !important; }
        html.light h2.text-white { color: #0f172a !important; }
      `}</style>
    </div>
  )
}
