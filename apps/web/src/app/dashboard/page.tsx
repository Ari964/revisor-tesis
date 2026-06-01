'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  FolderKanban, FileText, AlertTriangle, CheckCircle2,
  Clock, TrendingUp, Shield, BookCheck,
} from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#6366f1'];
const SEVERITY_LABELS: Record<string, string> = { CRITICAL: 'Crítico', MAJOR: 'Mayor', MINOR: 'Menor', INFO: 'Info' };

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [severity, setSeverity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [s, t, d] = await Promise.all([
          apiClient<any>('/dashboard/stats'),
          apiClient<any>('/dashboard/timeline?days=30'),
          apiClient<any>('/dashboard/severity'),
        ]);
        setStats(s.data);
        setTimeline(t.data);
        setSeverity(d.data.map((item: any) => ({ ...item, name: SEVERITY_LABELS[item.severity] || item.severity })));
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Proyectos Activos', value: stats?.activeProjects || 0, icon: FolderKanban, color: 'from-primary-500 to-primary-700', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { label: 'Entregas Totales', value: stats?.totalSubmissions || 0, icon: FileText, color: 'from-accent-500 to-accent-700', bg: 'bg-accent-50 dark:bg-accent-900/20' },
    { label: 'Revisiones Pendientes', value: stats?.pendingReviews || 0, icon: Clock, color: 'from-orange-500 to-orange-700', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Nota Promedio', value: stats?.averageScore ? stats.averageScore.toFixed(1) : '—', icon: TrendingUp, color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Alertas de Plagio', value: stats?.plagiarismAlerts || 0, icon: Shield, color: 'from-red-500 to-red-700', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Citas Verificadas', value: stats?.verifiedCitations || 0, icon: BookCheck, color: 'from-blue-500 to-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen general de la plataforma</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, i) => (
          <div key={card.label} className="glass-card p-5 hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Actividad (últimos 30 días)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="submissions" stroke="#6366f1" name="Entregas" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="reviews" stroke="#10b981" name="Revisiones" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución de Severidad</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={severity} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={5} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {severity.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
