import React, { useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, BarChart2,
  Settings, LogOut, Droplets, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/users',     icon: Users,           label: 'Users' },
  { path: '/admin/requests',  icon: FileText,        label: 'Requests' },
  { path: '/admin/analytics', icon: BarChart2,       label: 'Analytics' },
  { path: '/admin/config',    icon: Settings,        label: 'Config' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* Auth guard */
  useEffect(() => {
    const token = localStorage.getItem('bc_admin_token')
    if (!token) navigate('/admin/login', { replace: true })
  }, [])

  const admin = (() => {
    try { return JSON.parse(localStorage.getItem('bc_admin') || '{}') } catch { return {} }
  })()

  const handleLogout = () => {
    localStorage.removeItem('bc_admin_token')
    localStorage.removeItem('bc_admin')
    navigate('/admin/login', { replace: true })
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={clsx(
      'flex flex-col bg-neutral-dark text-white',
      mobile ? 'w-full h-full' : 'w-64 h-screen sticky top-0 flex-shrink-0'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-blood flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-black text-base leading-tight">BloodConnect</div>
          <div className="text-white/50 text-xs">Admin Panel</div>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ms-auto text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = location.pathname.startsWith(path)
          return (
            <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                active ? 'bg-blood text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              )}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Admin info + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-blood flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {(admin.fullName || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{admin.fullName || 'Admin'}</div>
            <div className="text-xs text-white/40 truncate">{admin.role || 'admin'}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-gray-100" dir="ltr">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 h-full">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <Menu className="w-5 h-5 text-neutral-dark" />
          </button>
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blood" />
            <span className="font-black text-neutral-dark text-sm">BloodConnect Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
