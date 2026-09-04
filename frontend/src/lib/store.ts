import { create } from 'zustand';
import api from './api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Company {
  id: string;
  company_name: string;
  industry: string;
  services: string[];
  keywords: string[];
  description: string;
  website_url?: string;
  country: string;
  certifications?: string[];
}

interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  initialize: () => Promise<void>;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setCompany: (company: Company | null) => void;
  fetchCompanyProfile: () => Promise<void>;
  toggleTheme: () => void;
}

export const useStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  isAuthenticated: false,
  theme: 'dark', // Default to sleek dark mode

  initialize: async () => {
    if (typeof window === 'undefined') return;

    // Load theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const finalTheme = savedTheme || 'dark';
    set({ theme: finalTheme });
    document.documentElement.classList.toggle('light', finalTheme === 'light');

    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      try {
        const res = await api.get('/auth/me');
        set({ user: res.data, isAuthenticated: true });
        await get().fetchCompanyProfile();
      } catch (err) {
        // Token was invalid or expired
        get().clearAuth();
      }
    }
  },

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    set({ user, isAuthenticated: true });
    get().fetchCompanyProfile();
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, company: null, isAuthenticated: false });
  },

  setCompany: (company) => {
    set({ company });
  },

  fetchCompanyProfile: async () => {
    try {
      const res = await api.get('/company/my-profile');
      set({ company: res.data });
    } catch (err) {
      // Profile might not exist yet
      set({ company: null });
    }
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    set({ theme: nextTheme });
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  },
}));
