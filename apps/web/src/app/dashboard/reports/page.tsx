'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, BarChart, Calendar, Filter, Users, ShieldAlert } from 'lucide-react';

export default function ReportsPage() {
  // Dummy data for the report table
  const [reports] = useState([
    { id: '1', date: '2026-05-12', program: 'Ingeniería de Sistemas', submissions: 45, avgScore: 16.5, plagiarismCases: 2, criticalFindings: 12 },
    { id: '2', date: '2026-05-11', program: 'Ingeniería Industrial', submissions: 32, avgScore: 15.2, plagiarismCases: 5, criticalFindings: 20 },
    { id: '3', date: '2026-05-10', program: 'Derecho', submissions: 60, avgScore: 17.1, plagiarismCases: 1, criticalFindings: 8 },
    { id: '4', date: '2026-05-09', program: 'Administración', submissions: 28, avgScore: 14.8, plagiarismCases: 4, criticalFindings: 15 },
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Reportes Analíticos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Genera y exporta estadísticas de evaluación por programa y periodo</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filtrar</span>
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Evaluaciones</p>
            <p className="text-2xl font-bold">165</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
            <BarChart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nota Promedio Global</p>
            <p className="text-2xl font-bold">15.9</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Casos de Plagio</p>
            <p className="text-2xl font-bold">12</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" /> Rendimiento por Programa
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Programa</th>
                <th className="px-6 py-4 font-medium">Entregas</th>
                <th className="px-6 py-4 font-medium">Nota Prom.</th>
                <th className="px-6 py-4 font-medium">Alertas Plagio</th>
                <th className="px-6 py-4 font-medium">Hallazgos Críticos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {reports.map((row) => (
                <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                  <td className="px-6 py-4">{row.date}</td>
                  <td className="px-6 py-4 font-medium">{row.program}</td>
                  <td className="px-6 py-4">{row.submissions}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md font-semibold text-xs ${row.avgScore >= 16 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      {row.avgScore}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.plagiarismCases > 0 ? (
                      <span className="text-red-600 font-semibold">{row.plagiarismCases}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{row.criticalFindings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
