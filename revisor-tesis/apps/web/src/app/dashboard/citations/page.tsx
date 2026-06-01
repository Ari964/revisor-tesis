'use client';

import { useState } from 'react';
import { BookCheck, FileText, Search, Filter, AlertTriangle, CheckCircle2, ArrowRight, BookOpen, Link as LinkIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function CitationsPage() {
  // Mock data representing CrossRef validations and APA formatting checks across documents
  const [citations, setCitations] = useState([
    {
      id: 1,
      documentName: 'Capitulo_1_Marco_Teorico_v3.pdf',
      author: 'María López',
      totalCitations: 45,
      validCitations: 42,
      errors: 3,
      lastChecked: '2026-05-13',
      status: 'WARNING'
    },
    {
      id: 2,
      documentName: 'Analisis_de_Resultados_Final.docx',
      author: 'Carlos Gómez',
      totalCitations: 12,
      validCitations: 12,
      errors: 0,
      lastChecked: '2026-05-12',
      status: 'VALID'
    },
    {
      id: 3,
      documentName: 'Propuesta_Metodologica.pdf',
      author: 'Ana Martínez',
      totalCitations: 28,
      validCitations: 15,
      errors: 13,
      lastChecked: '2026-05-10',
      status: 'CRITICAL'
    }
  ]);

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Análisis de Citas y Bibliografía
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitoreo global de validación CrossRef y formato APA.
          </p>
        </div>
        <button className="btn-secondary flex items-center gap-2 whitespace-nowrap">
          <RefreshCw className="w-4 h-4" /> Sincronizar con CrossRef
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Citas Analizadas</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">85</h3>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Citas Validadas (DOI)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">69</h3>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Errores de Formato APA</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">16</h3>
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
          Filtrar por Estado
        </button>
      </div>

      {/* Citations Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Documento</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Autor</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 text-center">Citas Extraídas</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 text-center">Errores Encontrados</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Última Revisión</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {citations.map((item) => (
                <tr key={item.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-700/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.status === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        item.status === 'WARNING' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{item.documentName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{item.author}</td>
                  <td className="p-4 text-center">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{item.totalCitations}</span>
                  </td>
                  <td className="p-4 text-center">
                    {item.errors > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50">
                        <AlertTriangle className="w-3 h-3" /> {item.errors} errores
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3" /> Sin errores
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{item.lastChecked}</td>
                  <td className="p-4">
                    <Link href={`/dashboard/documents/${item.id}?tab=citations`} className="p-2 bg-surface-100 dark:bg-surface-700 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/50 dark:hover:text-primary-400 rounded-lg inline-flex transition-colors">
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
