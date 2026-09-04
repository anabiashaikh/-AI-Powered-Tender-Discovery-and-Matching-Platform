'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useStore } from '@/lib/store'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenderMatch {
  id: string
  match_score: number
  match_explanation: string
  tender: {
    id: string
    title: string
    description: string
    organization: string
    category: string
    deadline: string
    budget_range: string
    location: string
  }
}

interface Tender {
  id: string
  title: string
  description: string
  organization: string
  category: string
  deadline: string
  budget_range: string
  location: string
  country: string
  source_url: string
  published_date: string
  source?: {
    name: string
    url: string
    region: string
  }
}

interface DashboardStats {
  totalMatches: number
  highScoreMatches: number
  avgScore: number
  activeDeadlines: number
}

// ─── Mock / Fallback Data ─────────────────────────────────────────────────────

const MOCK_CHART_DATA = [
  { date: 'Jan', score: 72 },
  { date: 'Feb', score: 78 },
  { date: 'Mar', score: 65 },
  { date: 'Apr', score: 84 },
  { date: 'May', score: 79 },
  { date: 'Jun', score: 91 },
  { date: 'Jul', score: 88 },
]

const CATEGORIES = [
  'All Categories',
  'Technology',
  'Construction',
  'Healthcare',
  'Consulting',
  'Logistics',
  'Finance',
  'Education',
  'Energy',
  'Other',
]

const REGIONS = ['All Regions', 'Canada', 'Worldwide']

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest First' },
  { value: 'deadline', label: 'Deadline Soonest' },
  { value: 'published_date', label: 'Published Date' },
  { value: 'title', label: 'Title A-Z' },
]

// ─── Helper Utilities ─────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDeadline(date: string): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `${diffDays}d left`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getScoreBadge(score: number): string {
  if (score >= 80) return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
  if (score >= 60) return 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
  return 'bg-red-500/15 text-red-400 border border-red-500/30'
}

function getScoreRing(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function getDeadlineColor(date: string): string {
  if (!date) return 'text-gray-500'
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'text-red-500'
  if (diffDays <= 3) return 'text-red-400'
  if (diffDays <= 7) return 'text-amber-400'
  return 'text-gray-400'
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CanadaBuys: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400' },
  Biddingo:   { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  MERX:       { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-400' },
  TED:        { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  WorldBank:  { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-400' },
  IDB:        { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  UNGM:       { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-400' },
  ADB:        { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  AfDB:       { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30', dot: 'bg-pink-400' },
}

function getSourceStyle(name?: string) {
  return SOURCE_COLORS[name ?? ''] ?? { bg: 'bg-gray-700/40', text: 'text-gray-400', border: 'border-gray-600/40', dot: 'bg-gray-400' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
      <div className="h-3 bg-gray-800 rounded-full w-1/2 mb-4" />
      <div className="h-8 bg-gray-800 rounded-lg w-1/3 mb-2" />
      <div className="h-3 bg-gray-800 rounded-full w-2/3" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse flex gap-4 items-start">
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-800 rounded-full w-3/4" />
        <div className="h-3 bg-gray-800 rounded-full w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-800 rounded-full w-20" />
          <div className="h-6 bg-gray-800 rounded-full w-24" />
          <div className="h-6 bg-gray-800 rounded-full w-16" />
        </div>
      </div>
      <div className="w-14 h-14 bg-gray-800 rounded-full shrink-0" />
    </div>
  )
}

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  sub?: string
  gradient: string
}

function StatCard({ icon, label, value, sub, gradient }: StatCardProps) {
  return (
    <div
      className={`
        relative bg-gray-900 border border-gray-800 rounded-2xl p-6
        overflow-hidden group hover:border-gray-700
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40
      `}
    >
      {/* Top gradient accent border */}
      <div className={`absolute inset-x-0 top-0 h-px ${gradient}`} />
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">{label}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 shadow-2xl">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-indigo-400">{payload[0].value}%</p>
      </div>
    )
  }
  return null
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onRunMatch, hasProfile }: { onRunMatch: () => void; hasProfile: boolean }) {
  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-4xl">🏢</span>
            </div>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Company profile required</h3>
        <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
          Set up your company profile first — the AI matching engine uses it to find tenders
          that match your industry, services, and capabilities.
        </p>
        <a
          href="/profile"
          className="
            inline-flex items-center gap-2 px-6 py-3
            bg-amber-600 hover:bg-amber-500 text-white
            rounded-xl font-medium text-sm
            transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25
            active:scale-95
          "
        >
          <span>🏢</span>
          Set Up Company Profile
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
        </div>
        <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-indigo-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="absolute bottom-4 left-0 w-2 h-2 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: '200ms' }} />
        <div className="absolute top-8 -left-3 w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: '400ms' }} />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No matches yet</h3>
      <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">
        Click "Run AI Match" to let the AI engine scan all open tenders and find the best
        opportunities for your company profile.
      </p>
      <button
        onClick={onRunMatch}
        className="
          inline-flex items-center gap-2 px-6 py-3
          bg-indigo-600 hover:bg-indigo-500 text-white
          rounded-xl font-medium text-sm
          transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25
          active:scale-95
        "
      >
        <span>✨</span>
        Run AI Match Now
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, company } = useStore()

  const [matches, setMatches] = useState<TenderMatch[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData] = useState(MOCK_CHART_DATA)
  const [loading, setLoading] = useState(true)
  const [runningMatch, setRunningMatch] = useState(false)
  const [runSuccess, setRunSuccess] = useState(false)
  const [runMessage, setRunMessage] = useState<string | null>(null)
  const [filters, setFilters] = useState({ search: '', minScore: '', category: 'All Categories' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Tender search state
  const [activeTab, setActiveTab] = useState<'matches' | 'search'>('matches')
  const [tenders, setTenders] = useState<Tender[]>([])
  const [tenderTotal, setTenderTotal] = useState(0)
  const [tenderPage, setTenderPage] = useState(1)
  const [tenderLoading, setTenderLoading] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    keyword: '',
    industry: '',
    country: '',
    category: '',
    deadlineFrom: '',
    deadlineTo: '',
    region: 'All Regions',
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string>('')

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/login')
    }
  }, [router])

  // ── Data fetch ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (filterOverride?: typeof filters) => {
    setLoading(true)
    const f = filterOverride ?? filters
    try {
      const [statsRes, tendersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/tenders', {
          params: {
            ...(f.search && { search: f.search }),
            ...(f.minScore && { minScore: f.minScore }),
            ...(f.category && f.category !== 'All Categories' && { category: f.category }),
          },
        }),
      ])
      setStats(statsRes.data)
      setMatches(tendersRes.data?.matches ?? [])
    } catch {
      setStats(null)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  // ── Tender search fetch ─────────────────────────────────────────────────────
  const fetchTenders = useCallback(async () => {
    setTenderLoading(true)
    try {
      const params: any = {
        page: tenderPage,
        limit: 20,
        sortBy,
        sortOrder,
      }

      if (searchFilters.keyword) params.keyword = searchFilters.keyword
      if (searchFilters.industry) params.industry = searchFilters.industry
      if (searchFilters.country) params.country = searchFilters.country
      if (searchFilters.category && searchFilters.category !== 'All Categories') params.category = searchFilters.category
      if (searchFilters.deadlineFrom) params.deadlineFrom = searchFilters.deadlineFrom
      if (searchFilters.deadlineTo) params.deadlineTo = searchFilters.deadlineTo
      if (searchFilters.region && searchFilters.region !== 'All Regions') params.region = searchFilters.region.toLowerCase() as 'canada' | 'worldwide'
      if (selectedSourceId) params.sourceId = selectedSourceId

      const res = await api.get('/tender-search', { params })
      setTenders(res.data.tenders)
      setTenderTotal(res.data.total)
    } catch {
      setTenders([])
      setTenderTotal(0)
    } finally {
      setTenderLoading(false)
    }
  }, [tenderPage, sortBy, sortOrder, searchFilters, selectedSourceId])

  // ── Fetch search metadata ────────────────────────────────────────────────────
  const fetchSearchMetadata = useCallback(async () => {
    try {
      const [catsRes, countriesRes, sourcesRes] = await Promise.all([
        api.get('/tender-search/categories'),
        api.get('/tender-search/countries'),
        api.get('/tender-search/sources'),
      ])
      setAvailableCategories(['All Categories', ...catsRes.data])
      setAvailableCountries(['All Countries', ...countriesRes.data])
      setSources(sourcesRes.data)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchSearchMetadata()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'search') {
      fetchTenders()
    }
  }, [activeTab, tenderPage, sortBy, sortOrder, searchFilters, selectedSourceId])

  // ── Run AI Match ──────────────────────────────────────────────────────────
  const handleRunMatch = async () => {
    setRunningMatch(true)
    setRunSuccess(false)
    setRunMessage(null)
    try {
      const res = await api.post('/matching/run')
      if (res.data?.success === false) {
        setRunMessage(res.data.message ?? 'Could not run matching.')
        setTimeout(() => setRunMessage(null), 6000)
      } else {
        setRunSuccess(true)
        setTimeout(() => setRunSuccess(false), 4000)
        await fetchData()
      }
    } catch {
      setRunMessage('AI matching failed. Please try again.')
      setTimeout(() => setRunMessage(null), 5000)
    } finally {
      setRunningMatch(false)
    }
  }

  // ── Apply / Reset Filters ─────────────────────────────────────────────────
  const applyFilters = () => fetchData(filters)

  const resetFilters = () => {
    const reset = { search: '', minScore: '', category: 'All Categories' }
    setFilters(reset)
    fetchData(reset)
  }

  // ── Tender search actions ───────────────────────────────────────────────────
  const applyTenderSearch = () => {
    setTenderPage(1)
    fetchTenders()
  }

  const resetTenderSearch = () => {
    setSearchFilters({
      keyword: '',
      industry: '',
      country: '',
      category: 'All Categories',
      deadlineFrom: '',
      deadlineTo: '',
      region: 'All Regions',
    })
    setSelectedSourceId('')
    setTenderPage(1)
    setSortBy('created_at')
    setSortOrder('DESC')
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Ambient background glow ───────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ══ HEADER BAR ══════════════════════════════════════════════════════ */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">👋</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {getGreeting()},{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {user?.first_name ?? 'there'}
                </span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 pl-9">{formatDate()}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Toggle */}
            <div className="flex bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('matches')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === 'matches'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                My Matches
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === 'search'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                Search Tenders
              </button>
            </div>

            {activeTab === 'matches' && (
              <button
                onClick={handleRunMatch}
                disabled={runningMatch}
                className={`
                  relative inline-flex items-center gap-2.5 px-6 py-3
                  rounded-xl font-semibold text-sm
                  transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed
                  active:scale-95
                  ${runSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/25'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                  }
                `}
              >
                {runningMatch ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Running Match…
                  </>
                ) : runSuccess ? (
                  <>✅ Match Complete!</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Run AI Match
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* ── Run match message banner ─────────────────────────────────────── */}
        {runMessage && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-400 mt-0.5 shrink-0">⚠️</span>
            <div className="flex-1 text-amber-300">
              {runMessage}
              {!company && (
                <a href="/profile" className="ml-2 underline text-amber-200 hover:text-white font-medium">
                  Set up profile →
                </a>
              )}
            </div>
            <button onClick={() => setRunMessage(null)} className="text-amber-500 hover:text-amber-300 shrink-0">✕</button>
          </div>
        )}

        {/* ══ STATS ROW ═══════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon="📋"
              label="Total Tenders"
              value={stats?.totalMatches ?? 0}
              sub="All matched tenders"
              gradient="bg-gradient-to-r from-indigo-500 via-indigo-400 to-transparent"
            />
            <StatCard
              icon="🏆"
              label="High Score Matches"
              value={stats?.highScoreMatches ?? 0}
              sub="Score ≥ 80%"
              gradient="bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent"
            />
            <StatCard
              icon="📊"
              label="Avg Match Score"
              value={stats?.avgScore != null ? `${Math.round(stats.avgScore)}%` : '—'}
              sub="Across all matches"
              gradient="bg-gradient-to-r from-purple-500 via-purple-400 to-transparent"
            />
            <StatCard
              icon="⏰"
              label="Active Deadlines"
              value={stats?.activeDeadlines ?? 0}
              sub="Closing within 30 days"
              gradient="bg-gradient-to-r from-amber-500 via-amber-400 to-transparent"
            />
          </div>
        )}

        {/* ══ CHART + PIE ROW ═════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Area Chart */}
          <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-white">Match Score Trend</h2>
                <p className="text-xs text-gray-500 mt-0.5">Average AI match score over time</p>
              </div>
              <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5">
                Last 7 months
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[50, 100]}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#scoreGradient)"
                  dot={{ r: 4, fill: '#6366f1', stroke: '#1e1b4b', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#1e1b4b', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Score Distribution Pie */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white">Score Distribution</h2>
              <p className="text-xs text-gray-500 mt-0.5">Match quality breakdown</p>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'High (80%+)', value: stats?.highScoreMatches ?? 0 },
                    { name: 'Mid (60–79%)', value: Math.max(0, (stats?.totalMatches ?? 0) - (stats?.highScoreMatches ?? 0)) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {[
                { label: 'High (≥80%)', color: 'bg-emerald-500', value: stats?.highScoreMatches ?? 0 },
                { label: 'Mid (60–79%)', color: 'bg-amber-500', value: Math.max(0, (stats?.totalMatches ?? 0) - (stats?.highScoreMatches ?? 0)) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-gray-400">{item.label}</span>
                  </div>
                  <span className="font-semibold text-white tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ FILTER BAR ══════════════════════════════════════════════════════ */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search by title or organisation…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                  transition-colors
                "
              />
            </div>

            {/* Min Score */}
            <div className="relative w-full sm:w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium">MIN%</span>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={filters.minScore}
                onChange={(e) => setFilters((f) => ({ ...f, minScore: e.target.value }))}
                className="
                  w-full bg-gray-800 border border-gray-700 rounded-xl
                  pl-12 pr-4 py-2.5 text-sm text-white placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                  transition-colors
                "
              />
            </div>

            {/* Category */}
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="
                w-full sm:w-48 bg-gray-800 border border-gray-700 rounded-xl
                px-4 py-2.5 text-sm text-gray-300
                focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                transition-colors appearance-none cursor-pointer
              "
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-gray-900">
                  {c}
                </option>
              ))}
            </select>

            {/* Actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={applyFilters}
                className="
                  px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white
                  rounded-xl text-sm font-medium
                  transition-all duration-200 active:scale-95
                  hover:shadow-lg hover:shadow-indigo-500/25
                "
              >
                Apply
              </button>
              <button
                onClick={resetFilters}
                className="
                  px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200
                  border border-gray-700 hover:border-gray-600
                  rounded-xl text-sm font-medium
                  transition-all duration-200 active:scale-95
                "
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* ══ TENDER MATCHES LIST ══════════════════════════════════════════════ */}
        {activeTab === 'matches' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                Tender Matches
                {!loading && matches.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-800 rounded-full px-2.5 py-0.5">
                    {matches.length}
                  </span>
                )}
              </h2>
            </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
              <EmptyState onRunMatch={handleRunMatch} hasProfile={!!company} />
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => {
                const isExpanded = expandedId === match.id
                const score = match.match_score
                const pct = Math.min(100, Math.max(0, score))

                return (
                  <div
                    key={match.id}
                    className="
                      bg-gray-900 border border-gray-800 rounded-2xl
                      hover:border-gray-700 hover:shadow-xl hover:shadow-black/30
                      transition-all duration-300 group cursor-pointer
                    "
                    onClick={() => setExpandedId(isExpanded ? null : match.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">

                        {/* Score Ring */}
                        <div className="shrink-0 flex flex-col items-center gap-1">
                          <div className="relative w-14 h-14">
                            <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                              <circle cx="28" cy="28" r="24" fill="none" stroke="#1f2937" strokeWidth="4" />
                              <circle
                                cx="28" cy="28" r="24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${(pct / 100) * 150.8} 150.8`}
                                className={getScoreRing(score)}
                              />
                            </svg>
                            <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${getScoreRing(score)}`}>
                              {score}%
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2">
                              {match.tender.title}
                            </h3>
                            <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${getScoreBadge(score)}`}>
                              {score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'} {score}% match
                            </span>
                          </div>

                          {/* Meta pills */}
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded-lg px-2.5 py-1">
                              🏢 {match.tender.organization || 'Unknown'}
                            </span>
                            {match.tender.category && (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1">
                                🏷️ {match.tender.category}
                              </span>
                            )}
                            {match.tender.location && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded-lg px-2.5 py-1">
                                📍 {match.tender.location}
                              </span>
                            )}
                            {match.tender.budget_range && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                                💰 {match.tender.budget_range}
                              </span>
                            )}
                            {match.tender.deadline && (
                              <span className={`inline-flex items-center gap-1 text-xs bg-gray-800 rounded-lg px-2.5 py-1 ${getDeadlineColor(match.tender.deadline)}`}>
                                ⏰ {formatDeadline(match.tender.deadline)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand chevron */}
                        <div className="shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors mt-1">
                          <svg
                            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div
                          className="mt-4 pt-4 border-t border-gray-800 space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {match.tender.description && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                {match.tender.description.length > 300
                                  ? `${match.tender.description.substring(0, 300)}…`
                                  : match.tender.description}
                              </p>
                            </div>
                          )}
                          {match.match_explanation && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Why this matches</p>
                              <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3">
                                <p className="text-sm text-indigo-300 leading-relaxed">
                                  ✨ {match.match_explanation}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </section>
        )}

        {/* ══ TENDER SEARCH ═════════════════════════════════════════════════════ */}
        {activeTab === 'search' && (
          <section>
            {/* Search Filters */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Keyword */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by keyword, title, or organization…"
                    value={searchFilters.keyword}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, keyword: e.target.value }))}
                    className="
                      w-full bg-gray-800 border border-gray-700 rounded-xl
                      pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                      transition-colors
                    "
                  />
                </div>

                {/* Category */}
                <select
                  value={searchFilters.category}
                  onChange={(e) => setSearchFilters((f) => ({ ...f, category: e.target.value }))}
                  className="
                    w-full lg:w-48 bg-gray-800 border border-gray-700 rounded-xl
                    px-4 py-2.5 text-sm text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                    transition-colors appearance-none cursor-pointer
                  "
                >
                  {availableCategories.map((c) => (
                    <option key={c} value={c} className="bg-gray-900">
                      {c}
                    </option>
                  ))}
                </select>

                {/* Country */}
                <select
                  value={searchFilters.country}
                  onChange={(e) => setSearchFilters((f) => ({ ...f, country: e.target.value }))}
                  className="
                    w-full lg:w-48 bg-gray-800 border border-gray-700 rounded-xl
                    px-4 py-2.5 text-sm text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                    transition-colors appearance-none cursor-pointer
                  "
                >
                  {availableCountries.map((c) => (
                    <option key={c} value={c === 'All Countries' ? '' : c} className="bg-gray-900">
                      {c}
                    </option>
                  ))}
                </select>

                {/* Region */}
                <select
                  value={searchFilters.region}
                  onChange={(e) => setSearchFilters((f) => ({ ...f, region: e.target.value }))}
                  className="
                    w-full lg:w-40 bg-gray-800 border border-gray-700 rounded-xl
                    px-4 py-2.5 text-sm text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                    transition-colors appearance-none cursor-pointer
                  "
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r} className="bg-gray-900">
                      {r}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="
                    w-full lg:w-40 bg-gray-800 border border-gray-700 rounded-xl
                    px-4 py-2.5 text-sm text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                    transition-colors appearance-none cursor-pointer
                  "
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-gray-900">
                      {o.label}
                    </option>
                  ))}
                </select>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={applyTenderSearch}
                    disabled={tenderLoading}
                    className="
                      px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white
                      rounded-xl text-sm font-medium
                      transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
                      hover:shadow-lg hover:shadow-indigo-500/25
                    "
                  >
                    {tenderLoading ? 'Searching…' : 'Search'}
                  </button>
                  <button
                    onClick={resetTenderSearch}
                    className="
                      px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200
                      border border-gray-700 hover:border-gray-600
                      rounded-xl text-sm font-medium
                      transition-all duration-200 active:scale-95
                    "
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Deadline Range */}
              <div className="flex gap-3 mt-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Deadline From</label>
                  <input
                    type="date"
                    value={searchFilters.deadlineFrom}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, deadlineFrom: e.target.value }))}
                    className="
                      w-full bg-gray-800 border border-gray-700 rounded-xl
                      px-4 py-2.5 text-sm text-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                      transition-colors
                    "
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Deadline To</label>
                  <input
                    type="date"
                    value={searchFilters.deadlineTo}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, deadlineTo: e.target.value }))}
                    className="
                      w-full bg-gray-800 border border-gray-700 rounded-xl
                      px-4 py-2.5 text-sm text-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
                      transition-colors
                    "
                  />
                </div>
              </div>

              {/* Source Filter Pills */}
              {sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-500 mb-2.5 font-medium uppercase tracking-wider">Filter by Source</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setSelectedSourceId(''); setTenderPage(1) }}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                        ${selectedSourceId === ''
                          ? 'bg-white/10 text-white border-white/30'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
                        }
                      `}
                    >
                      All Sources
                    </button>
                    {sources.map((src) => {
                      const style = getSourceStyle(src.name)
                      const isActive = selectedSourceId === src.id
                      return (
                        <button
                          key={src.id}
                          onClick={() => { setSelectedSourceId(isActive ? '' : src.id); setTenderPage(1) }}
                          className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                            ${isActive
                              ? `${style.bg} ${style.text} ${style.border}`
                              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
                            }
                          `}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? style.dot : 'bg-gray-500'}`} />
                          {src.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">
                Live Tenders
                {tenderTotal > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-800 rounded-full px-2.5 py-0.5">
                    {tenderTotal} results
                  </span>
                )}
              </h2>
              <div className="text-xs text-gray-500">
                Page {tenderPage} of {Math.ceil(tenderTotal / 20) || 1}
              </div>
            </div>

            {/* Results */}
            {tenderLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : tenders.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔍</span>
                </div>
                {selectedSourceId && sources.find(s => s.id === selectedSourceId)?.name === 'Biddingo' ? (
                  <>
                    <h3 className="text-lg font-semibold text-white mb-2">No Biddingo tenders available</h3>
                    <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
                      Biddingo requires an authenticated session to access listings.
                      Automated scraping is currently blocked — this filter shows only real database records.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Source: Biddingo — 0 live tenders
                    </span>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-white mb-2">No tenders found</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Try adjusting your search filters or check back later for new opportunities.
                    </p>
                    <p className="text-xs text-gray-600">
                      Data is sourced from: {sources.filter(s => s.total_scraped > 0).map((s) => s.name).join(', ')}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {tenders.map((tender) => {
                    const isExpanded = expandedId === tender.id
                    const sourceName = tender.source?.name
                    const srcStyle = getSourceStyle(sourceName)
                    return (
                      <div
                        key={tender.id}
                        className="
                          bg-gray-900 border border-gray-800 rounded-2xl
                          hover:border-gray-700 hover:shadow-xl hover:shadow-black/30
                          transition-all duration-300 group cursor-pointer
                        "
                        onClick={() => setExpandedId(isExpanded ? null : tender.id)}
                      >
                        <div className="p-5">
                          {/* Source badge strip at top */}
                          {sourceName && (
                            <div className="flex items-center justify-between mb-3">
                              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${srcStyle.dot}`} />
                                Source: {sourceName}
                              </span>
                              {tender.source_url && (
                                <a
                                  href={tender.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border} hover:opacity-80 transition-opacity`}
                                >
                                  View on {sourceName} →
                                </a>
                              )}
                            </div>
                          )}

                          <div className="flex items-start gap-4">
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2.5">
                                {tender.title}
                              </h3>

                              {/* Meta pills */}
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded-lg px-2.5 py-1">
                                  🏢 {tender.organization || 'Unknown'}
                                </span>
                                {tender.category && (
                                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2.5 py-1">
                                    🏷️ {tender.category}
                                  </span>
                                )}
                                {tender.country && (
                                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded-lg px-2.5 py-1">
                                    🌍 {tender.country}
                                  </span>
                                )}
                                {tender.deadline && (
                                  <span className={`inline-flex items-center gap-1 text-xs bg-gray-800 rounded-lg px-2.5 py-1 ${getDeadlineColor(tender.deadline)}`}>
                                    ⏰ {formatDeadline(tender.deadline)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expand chevron */}
                            <div className="shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors mt-1">
                              <svg
                                className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div
                              className="mt-4 pt-4 border-t border-gray-800 space-y-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {tender.description && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Description</p>
                                  <p className="text-sm text-gray-400 leading-relaxed">
                                    {tender.description.length > 400
                                      ? `${tender.description.substring(0, 400)}…`
                                      : tender.description}
                                  </p>
                                </div>
                              )}
                              <div className="flex gap-4 text-xs">
                                {tender.published_date && (
                                  <div>
                                    <span className="text-gray-500">Published: </span>
                                    <span className="text-gray-400">{new Date(tender.published_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {tender.budget_range && (
                                  <div>
                                    <span className="text-gray-500">Budget: </span>
                                    <span className="text-emerald-400">{tender.budget_range}</span>
                                  </div>
                                )}
                              </div>
                              {tender.source_url && (
                                <a
                                  href={tender.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border ${srcStyle.bg} ${srcStyle.text} ${srcStyle.border} hover:opacity-80 transition-opacity`}
                                >
                                  Open Original Tender on {sourceName} →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {tenderTotal > 20 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                    <button
                      onClick={() => setTenderPage((p) => Math.max(1, p - 1))}
                      disabled={tenderPage === 1}
                      className="
                        px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white
                        border border-gray-700 rounded-lg text-sm font-medium
                        transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      Previous
                    </button>
                    <div className="text-sm text-gray-500">
                      Showing {((tenderPage - 1) * 20) + 1} to {Math.min(tenderPage * 20, tenderTotal)} of {tenderTotal}
                    </div>
                    <button
                      onClick={() => setTenderPage((p) => Math.min(Math.ceil(tenderTotal / 20), p + 1))}
                      disabled={tenderPage >= Math.ceil(tenderTotal / 20)}
                      className="
                        px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white
                        border border-gray-700 rounded-lg text-sm font-medium
                        transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── Footer spacing ────────────────────────────────────────────────── */}
        <div className="h-8" />
      </div>
    </div>
  )
}
