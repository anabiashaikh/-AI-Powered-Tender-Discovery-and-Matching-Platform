'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

/* ─── password strength helpers ─────────────────────────────── */
function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
  barColor: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Very weak', color: 'text-red-400', barColor: 'bg-red-500' };
  if (score === 2) return { score, label: 'Weak', color: 'text-orange-400', barColor: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Fair', color: 'text-yellow-400', barColor: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Good', color: 'text-emerald-400', barColor: 'bg-emerald-500' };
  return { score, label: 'Strong', color: 'text-green-400', barColor: 'bg-green-500' };
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    invite_code: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = getStrength(form.password);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setError('');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm_password)
      errs.confirm_password = 'Passwords do not match';
    if (!agreed) errs.terms = 'You must agree to the terms';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');

    try {
      const payload: Record<string, string> = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
      };
      if (form.invite_code.trim()) payload.invite_code = form.invite_code.trim();

      await api.post('/auth/register', payload);
      router.push('/auth/login?registered=true');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(
        axiosErr?.response?.data?.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ─── Eye icon ─────────────────────────────────────────────── */
  const EyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeOff = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  /* ─── Reusable input ────────────────────────────────────────── */
  const inputClass = (field: string) =>
    `w-full bg-white/10 hover:bg-white/12 focus:bg-white/15 border ${
      fieldErrors[field] ? 'border-red-500/60 focus:border-red-500' : 'border-white/20 focus:border-indigo-500/70'
    } rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200 focus:ring-2 ${
      fieldErrors[field] ? 'focus:ring-red-500/20' : 'focus:ring-indigo-500/20'
    }`;

  return (
    <div className="min-h-screen flex bg-gray-950 overflow-hidden">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-900 to-gray-950" />
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-violet-500 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-fuchsia-500 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1.5s' }}
          />
          <div
            className="absolute top-2/3 left-1/4 w-64 h-64 bg-indigo-500 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '0.7s' }}
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-white font-black text-lg">R</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              RFP<span className="text-violet-300">Pro</span>
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h1 className="text-5xl font-black text-white leading-tight">
              Start winning
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                from day one
              </span>
            </h1>
            <p className="mt-4 text-lg text-gray-300/80 max-w-sm leading-relaxed">
              Join hundreds of companies using AI to write better proposals
              and win more government and enterprise contracts.
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-4">
            {[
              { step: '01', title: 'Create your account', desc: 'Free 14-day trial, no credit card' },
              { step: '02', title: 'Upload an RFP', desc: 'AI reads & scores it instantly' },
              { step: '03', title: 'Generate a proposal', desc: 'Draft ready in under 60 seconds' },
              { step: '04', title: 'Track & Win', desc: 'Monitor progress & close deals faster' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-black text-violet-300">{step}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="relative z-10 flex flex-wrap gap-3">
          {['SOC 2 Type II', 'GDPR Ready', '256-bit AES', 'ISO 27001'].map((badge) => (
            <span
              key={badge}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-gray-400"
            >
              <span className="text-green-400">✓</span>
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-start justify-center p-6 lg:p-12 overflow-y-auto relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-violet-950/40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-black">R</span>
            </div>
            <span className="text-white font-bold text-lg">
              RFP<span className="text-violet-300">Pro</span>
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white">Create account</h2>
            <p className="mt-1.5 text-gray-400">
              Start your free 14-day trial. No credit card required.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <span className="text-red-400 text-lg">✕</span>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Glass card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    First name
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={update('first_name')}
                    placeholder="Jane"
                    autoComplete="given-name"
                    className={inputClass('first_name')}
                  />
                  {fieldErrors.first_name && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={update('last_name')}
                    placeholder="Smith"
                    autoComplete="family-name"
                    className={inputClass('last_name')}
                  />
                  {fieldErrors.last_name && (
                    <p className="mt-1 text-xs text-red-400">{fieldErrors.last_name}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="jane@company.com"
                  autoComplete="email"
                  className={inputClass('email')}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={`${inputClass('password')} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                  >
                    {showPassword ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>

                {/* Strength meter */}
                {form.password.length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.barColor : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${strength.color}`}>
                        {strength.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        Use uppercase, numbers & symbols
                      </span>
                    </div>
                  </div>
                )}

                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={update('confirm_password')}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className={`${inputClass('confirm_password')} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-white/10"
                  >
                    {showConfirm ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
                {/* Match indicator */}
                {form.confirm_password.length > 0 && (
                  <p
                    className={`mt-1 text-xs flex items-center gap-1 ${
                      form.password === form.confirm_password
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {form.password === form.confirm_password ? (
                      <>
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Passwords match
                      </>
                    ) : (
                      <>✕ Passwords do not match</>
                    )}
                  </p>
                )}
                {fieldErrors.confirm_password && !form.confirm_password.length && (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.confirm_password}</p>
                )}
              </div>

              {/* Invite code */}
              <div>
                <label className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Invite code
                  </span>
                  <span className="text-[10px] font-semibold bg-violet-500/20 border border-violet-500/30 text-violet-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Optional
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.invite_code}
                    onChange={update('invite_code')}
                    placeholder="e.g. BETA-2025"
                    className="w-full bg-white/10 hover:bg-white/12 focus:bg-white/15 border border-white/20 focus:border-violet-500/60 rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-500 text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/20"
                  />
                  {/* Key icon */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                    </svg>
                  </div>
                </div>
                {form.invite_code && (
                  <p className="mt-1 text-xs text-violet-400 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Invite code will be applied
                  </p>
                )}
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        setFieldErrors((prev) => ({ ...prev, terms: '' }));
                      }}
                      className="sr-only peer"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border ${
                        fieldErrors.terms
                          ? 'border-red-500/60'
                          : 'border-white/25'
                      } bg-white/10 peer-checked:bg-violet-600 peer-checked:border-violet-600 transition-all duration-200 flex items-center justify-center group-hover:border-white/40`}
                    >
                      {agreed && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors select-none leading-relaxed">
                    I agree to the{' '}
                    <a href="/legal/terms" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                      Privacy Policy
                    </a>
                  </span>
                </label>
                {fieldErrors.terms && (
                  <p className="mt-1.5 text-xs text-red-400 ml-8">{fieldErrors.terms}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative mt-2 w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-800 disabled:to-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 text-sm transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group"
              >
                <span
                  className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
                >
                  Create Account
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
                    <svg className="w-5 h-5 animate-spin text-white/80" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
