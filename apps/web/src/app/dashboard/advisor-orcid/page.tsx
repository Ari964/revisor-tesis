'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  BookOpen, Search, ExternalLink, RefreshCw, CheckCircle2, AlertCircle,
  BookMarked, Calendar, GraduationCap, Globe, Tag, User2, Clock
} from 'lucide-react';

const WORK_TYPE_LABELS: Record<string, string> = {
  'JOURNAL_ARTICLE': 'Artículo de Revista',
  'CONFERENCE_PAPER': 'Ponencia de Conferencia',
  'BOOK': 'Libro',
  'BOOK_CHAPTER': 'Capítulo de Libro',
  'DISSERTATION': 'Tesis / Disertación',
  'REPORT': 'Informe',
  'REVIEW': 'Revisión',
  'OTHER': 'Otro',
  'EDITED_BOOK': 'Libro Editado',
  'WORKING_PAPER': 'Working Paper',
};

const WORK_TYPE_COLORS: Record<string, string> = {
  'JOURNAL_ARTICLE': 'from-blue-500 to-blue-700',
  'CONFERENCE_PAPER': 'from-violet-500 to-violet-700',
  'BOOK': 'from-amber-500 to-amber-700',
  'BOOK_CHAPTER': 'from-orange-500 to-orange-700',
  'DISSERTATION': 'from-emerald-500 to-emerald-700',
  'OTHER': 'from-gray-500 to-gray-700',
};

export default function AdvisorOrcidPage() {
  const [orcidId, setOrcidId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchOrcidProfile();
  }, []);

  const fetchOrcidProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient<any>('/users/me/orcid');
      if (res.data) {
        setProfile(res.data);
        setOrcidId(res.data.orcidId || '');
      }
    } catch {
      // No profile yet
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orcidId.trim()) return;
    setError('');
    setSuccess('');
    setSyncing(true);

    try {
      const res = await apiClient<any>('/users/me/orcid', {
        method: 'POST',
        body: JSON.stringify({ orcidId: orcidId.trim() }),
      });
      setProfile(res.data);
      if (res.data?.syncError) {
        setError(`Sincronización parcial: ${res.data.syncError}`);
      } else {
        setSuccess('Perfil ORCID sincronizado correctamente');
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const works = profile?.works || [];
  const years = works.map((w: any) => parseInt(w.publicationYear)).filter((y: number) => !isNaN(y));
  const minYear = years.length > 0 ? Math.min(...years) : null;
  const maxYear = years.length > 0 ? Math.max(...years) : null;

  // Count by type
  const typeCounts: Record<string, number> = {};
  works.forEach((w: any) => {
    const t = w.type || 'OTHER';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary-500" />
          Mis Investigaciones ORCID
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Conecta tu perfil ORCID para visualizar y gestionar tus publicaciones académicas
        </p>
      </div>

      {/* ORCID Input */}
      <div className="glass-card p-6 animate-slide-up">
        <form onSubmit={handleSync} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Tu ORCID ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={orcidId}
                onChange={(e) => setOrcidId(e.target.value)}
                className="input-field pl-11"
                placeholder="0000-0002-1825-0097"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Encuentra tu ORCID en{' '}
              <a href="https://orcid.org" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                orcid.org
              </a>
            </p>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={syncing || !orcidId.trim()}
              className="btn-primary flex items-center gap-2 h-[46px] px-6"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sincronizar
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* Profile Info */}
      {profile && (
        <>
          {/* Researcher Card */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '60ms' }}>
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
                <User2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold">{profile.displayName || 'Investigador'}</h2>
                <a
                  href={`https://orcid.org/${profile.orcidId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-500 hover:underline flex items-center gap-1 mt-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  orcid.org/{profile.orcidId}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {profile.biography && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
                    {profile.biography}
                  </p>
                )}
                {profile.keywords && profile.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profile.keywords.map((kw: string, i: number) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-2.5 py-1 rounded-full">
                        <Tag className="w-3 h-3" />
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
                {profile.lastSyncAt && (
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Última sincronización: {new Date(profile.lastSyncAt).toLocaleString('es-PE')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Publicaciones</span>
              </div>
              <p className="text-3xl font-bold">{works.length}</p>
            </div>
            <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '180ms' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Años Activo</span>
              </div>
              <p className="text-3xl font-bold">
                {minYear && maxYear ? `${maxYear - minYear + 1}` : '—'}
              </p>
              {minYear && maxYear && <p className="text-xs text-gray-400 mt-1">{minYear} – {maxYear}</p>}
            </div>
            <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Artículos en Revistas</span>
              </div>
              <p className="text-3xl font-bold">{typeCounts['JOURNAL_ARTICLE'] || 0}</p>
            </div>
            <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Tipos de Trabajo</span>
              </div>
              <p className="text-3xl font-bold">{Object.keys(typeCounts).length}</p>
            </div>
          </div>

          {/* Works List */}
          {works.length > 0 && (
            <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '360ms' }}>
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-5">
                <BookMarked className="w-5 h-5 text-primary-500" />
                Publicaciones ({works.length})
              </h2>

              {/* Type filter pills */}
              {Object.keys(typeCounts).length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <span key={type} className="text-xs bg-surface-100 dark:bg-surface-700 px-3 py-1.5 rounded-full font-medium">
                      {WORK_TYPE_LABELS[type] || type} ({count})
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {works.map((work: any, i: number) => {
                  const colorClass = WORK_TYPE_COLORS[work.type] || WORK_TYPE_COLORS['OTHER'];
                  return (
                    <div
                      key={i}
                      className="group p-5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 bg-gradient-to-br ${colorClass} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base group-hover:text-primary-600 transition-colors leading-snug">
                            {work.title}
                          </h3>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {work.journalTitle && (
                              <span className="flex items-center gap-1 italic">
                                {work.journalTitle}
                              </span>
                            )}
                            {work.publicationYear && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {work.publicationYear}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs bg-surface-200 dark:bg-surface-600 px-2 py-0.5 rounded-full font-medium">
                              {WORK_TYPE_LABELS[work.type] || work.type}
                            </span>
                          </div>
                          {work.doi && (
                            <a
                              href={work.url || `https://doi.org/${work.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-sm text-primary-500 hover:underline"
                            >
                              DOI: {work.doi}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {works.length === 0 && profile.orcidId && (
            <div className="glass-card p-12 text-center animate-slide-up" style={{ animationDelay: '360ms' }}>
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold">No se encontraron publicaciones</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Verifica que tu ORCID es correcto y que tus publicaciones son visibles públicamente en orcid.org
              </p>
            </div>
          )}
        </>
      )}

      {/* No profile yet */}
      {!profile && (
        <div className="glass-card p-12 text-center animate-slide-up">
          <Globe className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold">Conecta tu perfil ORCID</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            Ingresa tu identificador ORCID en el campo de arriba y presiona "Sincronizar" para importar automáticamente tu portafolio de investigaciones
          </p>
        </div>
      )}
    </div>
  );
}
