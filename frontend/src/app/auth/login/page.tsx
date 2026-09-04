'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired') === 'true') setSessionExpired(true);
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = res.data;

      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      setAuth(user, access_token, refresh_token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr?.response?.data?.message ||
          'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-950 overflow-hidden">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-900 to-gray-950" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-fuchsia-500 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '2s' }}
          />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-lg">R</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              AARIM RFP
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h1 className="text-5xl font-black text-white leading-tight">
              Win more
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                contracts
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-300/80 max-w-sm leading-relaxed">
              AI-powered RFP analysis and proposal generation. Turn complex
              requirements into winning bids — in minutes, not days.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-col gap-3">
            {[
              { icon: '⚡', text: 'Instant RFP parsing & scoring' },
              { icon: '🤖', text: 'AI proposal drafting' },
              { icon: '📊', text: 'Competitive intelligence' },
              { icon: '🚀', text: 'Automated proposals' },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 w-fit"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-gray-200 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-8">
          {[
            { value: '500+', label: 'Companies' },
            { value: '98%', label: 'Win rate lift' },
            { value: '10×', label: 'Faster bids' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-indigo-950/50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
              <span className="text-white font-black">R</span>
            </div>
            <span className="text-white font-bold text-lg">
              AARIM RFP
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white">Welcome back</h2>
            <p className="mt-1.5 text-gray-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Session-expired banner */}
          {sessionExpired && (
            <div className="mb-5 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              <span className="text-amber-400 text-lg">⚠</span>
              <p className="text-amber-300 text-sm">
                Your session expired. Please sign in again.
              </p>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 animate-[fadeIn_.2s_ease]">
              <span className="text-red-400 text-lg">✕</span>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Glass card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
            {/* OAuth buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <a
                href="/api/auth/google"
                className="flex items-center justify-center gap-3 bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-white text-sm font-medium transition-all duration-200 group"
              >
                {/* Google SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </a>

              <a
                href="/api/auth/microsoft"
                className="flex items-center justify-center gap-3 bg-white/8 hover:bg-white/12 border border-white/15 hover:border-white/25 rounded-xl px-4 py-3 text-white text-sm font-medium transition-all duration-200"
              >
                {/* Microsoft SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M11 11H3V3h8v8z" fill="#F25022" />
                  <path d="M21 11h-8V3h8v8z" fill="#7FBA00" />
                  <path d="M11 21H3v-8h8v8z" fill="#00A4EF" />
                  <path d="M21 21h-8v-8h8v8z" fill="#FFB900" />
                </svg>
                Sign in with Microsoft
              </a>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                or email
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full bg-white/10 hover:bg-white/12 focus:bg-white/15 border border-white/20 focus:border-indigo-500/70 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-white/10 hover:bg-white/12 focus:bg-white/15 border border-white/20 focus:border-indigo-500/70 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      /* Eye-off icon */
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4.5 h-4.5"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      /* Eye icon */
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4.5 h-4.5"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border border-white/25 bg-white/10 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all duration-200 flex items-center justify-center group-hover:border-white/40">
                    {rememberMe && (
                      <svg
                        className="w-3 h-3 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors select-none">
                  Remember me for 30 days
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative mt-2 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-indigo-800 disabled:to-violet-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 text-sm transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group"
              >
                <span
                  className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
                >
                  Sign In
                  <svg
                    className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
                {loading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 animate-spin text-white/80"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
