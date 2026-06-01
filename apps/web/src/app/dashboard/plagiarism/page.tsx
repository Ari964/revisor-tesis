'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, AlertCircle, FileText, ArrowRight, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function PlagiarismPage() {
  // Datos mockeados para simular la detección de similitud global por Qdrant
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      documentName: 'Capitulo_1_Marco_Teorico_v3.pdf',
      author: 'María López',
      similarityScore: 89,
      date: '2026-05-13',
      status: 'CRITICAL',
      source: 'Repositorio Institucional (Tesis 2024)',
    },
    {
      id: 2,
      documentName: 'Analisis_de_Resultados_Final.docx',
      author: 'Carlos Gómez',
      similarityScore: 45,
      date: '2026-05-12',
      status: 'WARNING',
      source: 'Artículo IEEE Xplore',
    },
    {
      id: 3,
      documentName: 'Propuesta_Metodologica.pdf',
      author: 'Ana Martínez',
      similarityScore: 12,
      date: '2026-05-10',
      status: 'SAFE',
      source: 'Varias fuentes menores',
    },
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alertas de Similitud Global</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Monitoreo centralizado de plagio detectado por Qdrant en todos los proyectos.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alertas Críticas (&gt;85%)</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">12</h3>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Advertencias (40% - 84%)</p>
              <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">34</h3>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Documentos Seguros</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">145</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/50 dark:bg-surface-800/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por documento o autor..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        <button className="btn-secondary flex items-center gap-2 whitespace-nowrap">
          <Filter className="w-4 h-4" />
          Filtrar por Severidad
        </button>
      </div>

      {/* Alerts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Documento</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Autor</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Similitud</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Fuente Principal</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Fecha</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-700/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{alert.documentName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{alert.author}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        alert.status === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                        alert.status === 'WARNING' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50' :
                        'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
                      }`}>
                        {alert.similarityScore}%
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{alert.source}</td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{alert.date}</td>
                  <td className="p-4">
                    <Link href={`/dashboard/documents/${alert.id}?tab=plagiarism`} className="p-2 bg-surface-100 dark:bg-surface-700 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/50 dark:hover:text-primary-400 rounded-lg inline-flex transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
