import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Language } from '../types';
import { tokenStorage } from '../services/api';

// ─── Auth Store ───────────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        tokenStorage.set(token);
        set({ token, user, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },

      logout: () => {
        tokenStorage.clear();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'bc_auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ─── App Store ────────────────────────────────────────────────────────────────
interface AppStore {
  language: Language;
  direction: 'ltr' | 'rtl';
  unreadNotifications: number;
  isOnline: boolean;
  pushEnabled: boolean;
  setLanguage: (lang: Language) => void;
  setUnread: (count: number) => void;
  decrementUnread: () => void;
  setOnline: (online: boolean) => void;
  setPushEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      language: 'fa',
      direction: 'rtl',
      unreadNotifications: 0,
      isOnline: navigator.onLine,
      pushEnabled: false,

      setLanguage: (lang) => {
        const dir = lang === 'en' ? 'ltr' : 'rtl';
        document.documentElement.lang = lang;
        document.documentElement.dir = dir;
        set({ language: lang, direction: dir });
      },

      setUnread: (count) => set({ unreadNotifications: count }),
      decrementUnread: () => set((s) => ({ unreadNotifications: Math.max(0, s.unreadNotifications - 1) })),
      setOnline: (online) => set({ isOnline: online }),
      setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
    }),
    {
      name: 'bc_app',
      partialize: (state) => ({ language: state.language, direction: state.direction, pushEnabled: state.pushEnabled }),
    }
  )
);

// ─── Request Store ────────────────────────────────────────────────────────────
interface RequestStore {
  activeRequestId: number | null;
  setActiveRequest: (id: number | null) => void;
}

export const useRequestStore = create<RequestStore>()((set) => ({
  activeRequestId: null,
  setActiveRequest: (id) => set({ activeRequestId: id }),
}));
