import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aarim RFP — Enterprise Tender Discovery Platform',
  description: 'AI-powered tender discovery, semantic matching, and automated proposal generation for enterprise teams.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-cyan-600/5 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gradient">Aarim RFP</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="btn-primary text-sm py-2 px-5"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-32">
        <div className="mb-8">
          <span className="text-6xl font-extrabold text-gradient">R</span>
          <span className="text-2xl font-bold text-white ml-2">Aarim RFP</span>
        </div>

        <h2 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          Win more contracts
        </h2>

        <p className="mt-6 max-w-2xl text-lg text-gray-400 leading-relaxed">
          AI-powered RFP analysis and proposal generation. Turn complex requirements into winning bids — in minutes, not days.
        </p>

        {/* Feature Tags */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-2xl">⚡</span>
            <span className="text-sm font-medium">Instant RFP parsing & scoring</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-2xl">🤖</span>
            <span className="text-sm font-medium">AI proposal drafting</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium">Competitive intelligence</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-2xl">🚀</span>
            <span className="text-sm font-medium">Automated proposals</span>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5">
            Start Free Trial
          </Link>
          <Link href="/auth/login" className="btn-secondary text-base px-8 py-3.5">
            Sign In to Dashboard
          </Link>
        </div>

        {/* Stats Row */}
        <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4 max-w-3xl">
          {[
            { label: 'Tenders Indexed', value: '50,000+' },
            { label: 'Avg Match Accuracy', value: '94%' },
            { label: 'Sources Monitored', value: '200+' },
            { label: 'Proposals Generated', value: '12,000+' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-3xl font-extrabold text-gradient">{stat.value}</span>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-5xl w-full text-left">
          {[
            {
              icon: '🔍',
              title: 'Smart Discovery',
              desc: 'Playwright-powered scrapers automatically monitor 200+ procurement portals 24/7, extracting structured tender data with AI parsing.',
            },
            {
              icon: '🧠',
              title: 'Semantic Matching',
              desc: 'pgvector embeddings compare your company profile against every tender using cosine similarity, delivering ranked matches with AI explanations.',
            },
            {
              icon: '🎙️',
              title: 'Voice AI Assistant',
              desc: 'Real-time streaming chat and voice interface powered by GPT-4o. Ask questions, generate proposals, and get briefings — hands free.',
            },
            {
              icon: '📊',
              title: 'Analytics Dashboard',
              desc: 'Visualize match trends, track deadline pipelines, and monitor your win rate over time with beautiful recharts visualizations.',
            },
            {
              icon: '🔔',
              title: 'Smart Alerts',
              desc: 'Instant email and in-app notifications when high-score matches (80%+) are found, powered by Resend with custom digest schedules.',
            },
            {
              icon: '🏢',
              title: 'Multi-Tenant Admin',
              desc: 'Full role-based access control with Admin, Manager, and Company User roles, invite codes, audit logs, and session management.',
            },
            {
              icon: '🚀',
              title: 'Automated Proposals',
              desc: 'AI-powered proposal generation that analyzes tender requirements and drafts customized responses based on your company profile and past successes.',
            },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 hover:border-indigo-500/20 transition-colors duration-300">
              <div className="mb-4 text-4xl">{f.icon}</div>
              <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Aarim RFP — Enterprise Tender Discovery Platform
      </footer>
    </div>
  );
}
