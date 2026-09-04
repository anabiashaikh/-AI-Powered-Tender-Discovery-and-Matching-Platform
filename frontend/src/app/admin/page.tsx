'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

/* ─────────────────────────── types ─────────────────────────── */
interface Stats {
  total_users: number;
  total_companies: number;
  total_tenders: number;
  active_sessions: number;
}

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  ip: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'company' | string;
  status: 'active' | 'inactive' | string;
}

interface InviteCode {
  id: string;
  code: string;
  created_by: string;
  used_by?: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  status: 'active' | 'expired' | 'used' | string;
}

interface Tender {
  id: string;
  title: string;
  source: string;
  score?: number;
  status: string;
  scraped_at: string;
}

interface ScrapingSource {
  id: string;
  name: string;
  url: string;
  region: string;
  is_active: boolean;
  last_scraped_at: string;
  last_success_at: string;
  last_error_at: string;
  last_error_message: string;
  total_scraped: number;
  total_failed: number;
  health_score: number;
}

/* ─────────────────────────── helpers ─────────────────────────── */
const TABS = ['Overview', 'Users', 'Invite Codes', 'Tenders', 'Scraping'] as const;
type Tab = (typeof TABS)[number];

function roleBadge(role: string) {
  const map: Record<string, string> = {
    admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    manager: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    company: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return map[role?.toLowerCase()] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    inactive: 'bg-red-500/20 text-red-300 border-red-500/30',
    expired: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    used: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return map[status?.toLowerCase()] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl ${color}`} />
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-bold tracking-tight text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <span className="mt-3 inline-block text-2xl">{icon}</span>
    </div>
  );
}

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════ */
export default function AdminPage() {
  const router = useRouter();
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  /* Overview */
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  /* Users */
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  /* Invite Codes */
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* Tenders */
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState('');

  /* Scraping */
  const [scrapingSources, setScrapingSources] = useState<ScrapingSource[]>([]);
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);

  const [error, setError] = useState('');

  /* Redirect non-admins */
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user, router]);

  /* Fetch on tab change */
  useEffect(() => {
    if (activeTab === 'Overview') fetchOverview();
    if (activeTab === 'Users') fetchUsers();
    if (activeTab === 'Invite Codes') fetchInviteCodes();
    if (activeTab === 'Tenders') fetchTenders();
    if (activeTab === 'Scraping') fetchScrapingSources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchOverview() {
    try {
      const [s, a] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/audit-logs'),
      ]);
      setStats(s.data);
      setAuditLogs(a.data?.logs ?? a.data ?? []);
    } catch {
      setError('Failed to load overview data.');
    }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data?.users ?? res.data ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function toggleUserStatus(id: string, current: string) {
    const action = current === 'active' ? 'deactivate' : 'activate';
    try {
      await api.patch(`/admin/users/${id}/${action}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: action === 'activate' ? 'active' : 'inactive' } : u
        )
      );
    } catch {
      setError('Failed to update user status.');
    }
  }

  async function fetchInviteCodes() {
    setInviteLoading(true);
    try {
      const res = await api.get('/admin/invite-codes');
      setInviteCodes(res.data?.codes ?? res.data ?? []);
    } catch {
      setError('Failed to load invite codes.');
    } finally {
      setInviteLoading(false);
    }
  }

  async function generateInviteCode() {
    setGenerating(true);
    setNewCode(null);
    try {
      const res = await api.post('/admin/invite-codes', { max_uses: 1, expires_in_days: 7 });
      setNewCode(res.data?.code ?? res.data?.invite_code ?? '');
      fetchInviteCodes();
    } catch {
      setError('Failed to generate invite code.');
    } finally {
      setGenerating(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function fetchTenders() {
    setTendersLoading(true);
    try {
      const res = await api.get('/tenders/all');
      setTenders(res.data?.tenders ?? res.data ?? []);
    } catch {
      setError('Failed to load tenders.');
    } finally {
      setTendersLoading(false);
    }
  }

  async function triggerScraping() {
    setScraping(true);
    setScrapeMsg('');
    try {
      const res = await api.post('/scraping/sources/scrape-all');
      setScrapeMsg(res.data?.message ?? 'Scraping triggered successfully.');
      setTimeout(() => setScrapeMsg(''), 4000);
    } catch {
      setScrapeMsg('Failed to trigger scraping.');
    } finally {
      setScraping(false);
    }
  }

  async function fetchScrapingSources() {
    setScrapingLoading(true);
    try {
      const res = await api.get('/scraping/sources/statistics');
      setScrapingSources(res.data ?? []);
    } catch {
      setError('Failed to load scraping sources.');
    } finally {
      setScrapingLoading(false);
    }
  }

  async function toggleSource(sourceId: string, currentStatus: boolean) {
    try {
      await api.post(`/scraping/sources/${sourceId}/toggle`, { isActive: !currentStatus });
      setScrapingSources((prev) =>
        prev.map((s) =>
          s.id === sourceId ? { ...s, is_active: !currentStatus } : s
        )
      );
    } catch {
      setError('Failed to toggle source status.');
    }
  }

  async function scrapeSource(sourceId: string) {
    setScrapingSourceId(sourceId);
    try {
      await api.post(`/scraping/sources/${sourceId}/scrape`);
      fetchScrapingSources();
    } catch {
      setError('Failed to scrape source.');
    } finally {
      setScrapingSourceId(null);
    }
  }

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Top accent line */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold shadow-lg shadow-indigo-500/30">
              &#9881;
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Admin Panel</h1>
              <p className="text-sm text-slate-500">System management &amp; oversight</p>
            </div>
          </div>
        </div>

        {/* Error toast */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span className="text-base">&#9888;</span>
            {error}
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              &#10005;
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 border-b border-white/5">
          <nav className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ─── TAB: OVERVIEW ─── */}
        {activeTab === 'Overview' && (
          <div className="space-y-8">
            {stats ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Users" value={stats.total_users} icon="&#128100;" color="bg-indigo-500" />
                <StatCard label="Total Companies" value={stats.total_companies} icon="&#127970;" color="bg-purple-500" />
                <StatCard label="Total Tenders" value={stats.total_tenders} icon="&#128203;" color="bg-cyan-500" />
                <StatCard label="Active Sessions" value={stats.active_sessions} icon="&#128994;" color="bg-emerald-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.03]" />
                ))}
              </div>
            )}

            {/* Audit Log Table */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
                Recent Audit Log
              </h2>
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Timestamp</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-5 py-12 text-center text-slate-600">
                            No audit logs found.
                          </td>
                        </tr>
                      )}
                      {auditLogs.map((log, i) => (
                        <tr
                          key={log.id ?? i}
                          className="border-b border-white/[0.03] transition-colors duration-150 hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs text-indigo-300">{log.action}</td>
                          <td className="px-5 py-3.5 text-slate-300">{log.user}</td>
                          <td className="px-5 py-3.5 text-slate-400">{fmtDate(log.timestamp)}</td>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{log.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: USERS ─── */}
        {activeTab === 'Users' && (
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">All Users</h2>
            {usersLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-600">No users found.</td>
                        </tr>
                      )}
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-white/[0.03] transition-colors duration-150 hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3.5 font-medium text-white">{u.name}</td>
                          <td className="px-5 py-3.5 text-slate-400">{u.email}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(u.status)}`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => toggleUserStatus(u.id, u.status)}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                                u.status === 'active'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                              }`}
                            >
                              {u.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: INVITE CODES ─── */}
        {activeTab === 'Invite Codes' && (
          <div className="space-y-6">
            {/* Generator card */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">Generate Invite Code</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Creates a single-use code valid for 7 days</p>
                </div>
                <button
                  onClick={generateInviteCode}
                  disabled={generating}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-indigo-500/40 hover:brightness-110 disabled:opacity-60"
                >
                  {generating ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <span className="text-base font-bold">+</span>
                  )}
                  Generate Invite Code
                </button>
              </div>

              {newCode && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
                  <code className="flex-1 font-mono text-sm tracking-widest text-indigo-300">{newCode}</code>
                  <button
                    onClick={() => copyCode(newCode)}
                    className="rounded-lg border border-indigo-500/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/30"
                  >
                    {copied ? '&#10003; Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">All Invite Codes</h2>
            {inviteLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Code</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Created By</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Used By</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Expires At</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Uses</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" />
                      </tr>
                    </thead>
                    <tbody>
                      {inviteCodes.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-slate-600">
                            No invite codes found.
                          </td>
                        </tr>
                      )}
                      {inviteCodes.map((c, i) => (
                        <tr
                          key={c.id ?? i}
                          className="border-b border-white/[0.03] transition-colors duration-150 hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3.5 font-mono text-xs tracking-widest text-indigo-300">{c.code}</td>
                          <td className="px-5 py-3.5 text-slate-300">{c.created_by}</td>
                          <td className="px-5 py-3.5 text-slate-400">{c.used_by ?? '—'}</td>
                          <td className="px-5 py-3.5 text-slate-400">{fmtDate(c.expires_at)}</td>
                          <td className="px-5 py-3.5 text-slate-400">
                            {c.uses ?? 0}/{c.max_uses}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(c.status)}`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => copyCode(c.code)}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: TENDERS ─── */}
        {activeTab === 'Tenders' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">All Tenders</h2>
              <div className="flex items-center gap-3">
                {scrapeMsg && (
                  <span className={`text-xs ${scrapeMsg.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {scrapeMsg}
                  </span>
                )}
                <button
                  onClick={triggerScraping}
                  disabled={scraping}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 shadow-sm transition-all duration-200 hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  {scraping ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                  ) : (
                    <span className="text-base">&#8635;</span>
                  )}
                  Trigger Scraping
                </button>
              </div>
            </div>

            {tendersLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Title</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Source</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Score</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Scraped At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenders.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-12 text-center text-slate-600">No tenders found.</td>
                        </tr>
                      )}
                      {tenders.map((t, i) => (
                        <tr
                          key={t.id ?? i}
                          className="border-b border-white/[0.03] transition-colors duration-150 hover:bg-white/[0.03]"
                        >
                          <td className="max-w-xs px-5 py-3.5 font-medium text-white">
                            <span className="line-clamp-1">{t.title}</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{t.source}</td>
                          <td className="px-5 py-3.5">
                            {t.score != null ? (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  t.score >= 80
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : t.score >= 50
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-500/20 text-slate-400'
                                }`}
                              >
                                {t.score}%
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(t.status)}`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{fmtDate(t.scraped_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: SCRAPING ─── */}
        {activeTab === 'Scraping' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Scraping Sources</h2>
              <button
                onClick={triggerScraping}
                disabled={scraping}
                className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 shadow-sm transition-all duration-200 hover:bg-cyan-500/20 disabled:opacity-60"
              >
                {scraping ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                ) : (
                  <span className="text-base">&#8635;</span>
                )}
                Scrape All Sources
              </button>
            </div>

            {scrapingLoading ? (
              <div className="space-y-2">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Region</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Health</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Total Scraped</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Last Success</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scrapingSources.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-slate-600">No scraping sources found.</td>
                        </tr>
                      )}
                      {scrapingSources.map((s, i) => (
                        <tr
                          key={s.id ?? i}
                          className="border-b border-white/[0.03] transition-colors duration-150 hover:bg-white/[0.03]"
                        >
                          <td className="px-5 py-3.5">
                            <div>
                              <div className="font-medium text-white">{s.name}</div>
                              <div className="text-xs text-slate-500 line-clamp-1">{s.url}</div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-slate-500/20 text-slate-300 border-slate-500/30">
                              {s.region}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.is_active ? statusBadge('active') : statusBadge('inactive')}`}
                            >
                              {s.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    s.health_score >= 80 ? 'bg-emerald-500' : s.health_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${s.health_score}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400">{s.health_score}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{s.total_scraped.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-slate-400">{s.last_success_at ? fmtDate(s.last_success_at) : '—'}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleSource(s.id, s.is_active)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                                  s.is_active
                                    ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                }`}
                              >
                                {s.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => scrapeSource(s.id)}
                                disabled={scrapingSourceId === s.id}
                                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 disabled:opacity-60"
                              >
                                {scrapingSourceId === s.id ? (
                                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                                ) : (
                                  'Scrape Now'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
