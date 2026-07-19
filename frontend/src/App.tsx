import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore, useAppStore } from './store'
import { userApi } from './services/api'

// Auth pages
import { LoginPage } from './pages/auth/AuthPages'
import { RegisterPage } from './pages/auth/RegisterPage'

// App pages
import HomePage         from './pages/HomePage'
import DonatePage       from './pages/DonatePage'
import RequestsPage     from './pages/RequestsPage'
import RequestBloodPage from './pages/RequestBloodPage'
import RequestDetailPage from './pages/RequestDetailPage'
import HistoryPage      from './pages/HistoryPage'
import ProfilePage      from './pages/ProfilePage'
import NotifDetailPage  from './pages/NotifDetailPage'

// Admin pages
import AdminLayout    from './pages/admin/AdminLayout'
import AdminLogin     from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers     from './pages/admin/AdminUsers'
import AdminRequests  from './pages/admin/AdminRequests'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminConfig    from './pages/admin/AdminConfig'

import BottomNav from './components/layout/BottomNav'
import PWAInstallPrompt from './components/pwa/PWAInstallPrompt'
import PWAUpdatePrompt  from './components/pwa/PWAUpdatePrompt'

// ─── Guards ───────────────────────────────────────────────────────────────────
const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return <>{children}</>
}

const AuthOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/home" replace />
  return <>{children}</>
}

// ─── Shell ────────────────────────────────────────────────────────────────────
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-neutral-light">
    {children}
    <BottomNav />
  </div>
)

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { logout, isAuthenticated, setUser } = useAuthStore()
  const { setLanguage, language, setOnline } = useAppStore()
  const navigate = useNavigate()

  // Apply stored language direction on mount
  useEffect(() => { setLanguage(language) }, [])

  // Online/Offline watcher
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Listen for auth logout events from api interceptor
  useEffect(() => {
    const handler = () => { logout(); navigate('/auth', { replace: true }) }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  // Refresh user profile once on mount when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      userApi.getMe()
        .then(r => setUser(r.data.data.user))
        .catch(() => {})
    }
  }, [])

  return (
    <>
      <Routes>
        {/* ── Auth ── */}
        <Route path="/auth"     element={<AuthOnly><LoginPage /></AuthOnly>} />
        <Route path="/register" element={<AuthOnly><RegisterPage /></AuthOnly>} />

        {/* ── App ── */}
        <Route path="/home"            element={<Protected><AppShell><HomePage /></AppShell></Protected>} />
        <Route path="/donate"          element={<Protected><AppShell><DonatePage /></AppShell></Protected>} />
        <Route path="/donate/:notifId" element={<Protected><AppShell><NotifDetailPage /></AppShell></Protected>} />
        <Route path="/requests"        element={<Protected><AppShell><RequestsPage /></AppShell></Protected>} />
        <Route path="/requests/new"    element={<Protected><AppShell><RequestBloodPage /></AppShell></Protected>} />
        <Route path="/requests/:id"    element={<Protected><AppShell><RequestDetailPage /></AppShell></Protected>} />
        <Route path="/history"         element={<Protected><AppShell><HistoryPage /></AppShell></Protected>} />
        <Route path="/profile"         element={<Protected><AppShell><ProfilePage /></AppShell></Protected>} />

        {/* ── Admin ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="users"      element={<AdminUsers />} />
          <Route path="requests"   element={<AdminRequests />} />
          <Route path="analytics"  element={<AdminAnalytics />} />
          <Route path="config"     element={<AdminConfig />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/home' : '/auth'} replace />} />
      </Routes>

      {/* PWA: install banner + SW update toast — shown globally over all pages */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </>
  )
}
