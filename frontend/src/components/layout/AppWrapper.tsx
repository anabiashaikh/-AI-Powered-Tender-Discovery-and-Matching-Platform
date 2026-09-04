'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import Sidebar from './Sidebar';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { initialize, isAuthenticated, user } = useStore();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function boot() {
      await initialize();
      setLoading(false);
    }
    boot();
  }, [initialize]);

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth');

  React.useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, isPublicRoute, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-4">
          {/* Custom animated spinner using CSS */}
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20" />
          </div>
          <p className="text-sm font-medium tracking-widest uppercase text-gray-500 animate-pulse">
            Loading platform...
          </p>
        </div>
      </div>
    );
  }

  // Admin Route Check
  const isAdminRoute = pathname.startsWith('/admin');
  if (isAdminRoute && user?.role !== 'admin' && !loading && isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white p-4">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You must be logged in as an Administrator to view this console.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isPublicRoute) {
    return <div className="min-h-screen bg-gray-950 text-white">{children}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
