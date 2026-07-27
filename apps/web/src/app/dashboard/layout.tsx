'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, FileUp, BookTemplate, Shield,
  BookCheck, Users, Bell, LogOut, Menu, X, GraduationCap, Moon, Sun,
  BarChart, Settings, BookOpen, FilePlus2, MessageSquare, UserCheck,
  FileCheck
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/chat', label: 'Asistente IA', icon: MessageSquare, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/projects', label: 'Proyectos', icon: FolderKanban, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/documents', label: 'Documentos', icon: FileUp, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/generator', label: 'Generar Tesis', icon: FilePlus2, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/reviewer', label: 'Revisión Avanzada', icon: FileCheck, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/authorities', label: 'Autoridades', icon: UserCheck, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/patterns', label: 'Patrones', icon: BookTemplate, roles: ['ADMIN', 'COORDINATOR'] },
  { href: '/dashboard/plagiarism', label: 'Plagio', icon: Shield, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR'] },
  { href: '/dashboard/citations', label: 'Citas', icon: BookCheck, roles: ['ADMIN', 'COORDINATOR', 'ADVISOR', 'STUDENT'] },
  { href: '/dashboard/advisor-orcid', label: 'Investigaciones', icon: BookOpen, roles: ['ADVISOR'] },
  { href: '/dashboard/reports', label: 'Reportes', icon: BarChart, roles: ['ADMIN', 'COORDINATOR'] },
  { href: '/dashboard/admin/users', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
  { href: '/dashboard/settings', label: 'Ajustes', icon: Settings, roles: ['ADMIN'] },
];


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    setUser(JSON.parse(stored));
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(prefersDark);
    if (prefersDark) document.documentElement.classList.add('dark');
  }, [router]);

  const toggleDark = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (!user) return null;

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700 transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-200 dark:border-surface-700">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Revisor</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tesis Platform</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-surface-50 dark:hover:bg-surface-700/50'
                  }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-surface-200 dark:border-surface-700 p-4">
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleDark} className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={handleLogout} className="flex-1 btn-secondary text-sm py-2 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-700">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <Link href="/dashboard/notifications" className="relative p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Link>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
