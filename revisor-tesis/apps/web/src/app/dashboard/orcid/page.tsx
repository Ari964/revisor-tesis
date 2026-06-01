'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  BookOpen, Link2, User, RefreshCw, Unlink, ExternalLink,
  Globe, Calendar, BookMarked, Award, CheckCircle
} from 'lucide-react';

export default function OrcidProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [orcidInput, setOrcidInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>('/users/me');
      setProfile(res.data?.orcidProfile || null);
      if (res.data?.orcidProfile?.orcidId) {
        setOrcidInput(res.data.orcidProfile.orcidId);
      }
    } catch (err: any) {
      console.error(err);
      setError('No se pudo cargar el perfil de usuario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSync = async (orcidIdToSync: string) => {
    if (!orcidIdToSync.trim()) {
      setError('Por favor, ingrese un ID de ORCID válido.');
      return;
    }
    setSyncing(true);
    setError(null);
    try {
      const res = await apiClient<any>('/users/me/orcid', {
        method: 'PATCH',
        body: JSON.stringify({ orcidId: orcidIdToSync }),
      });
      setProfile(res.data);
      alert('¡Perfil de ORCID sincronizado exitosamente!');
    } catch (err: any) {
      setError(err.message || 'Error de comunicación con ORCID. Verifique el ID.');
    } finally {
      setSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('¿Está seguro de que desea desvincular su ORCID? Esto eliminará el perfil y las investigaciones guardadas en la plataforma.')) {
      return;
    }
    setSyncing(true);
    try {
      await apiClient('/users/me/orcid/unlink', {
        method: 'PATCH',
      });
      setProfile(null);
      setOrcidInput('');
      alert('Perfil de ORCID desvinculado.');
    } catch (err: any) {
      setError(err.message || 'Error al desvincular perfil.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Parsear obras y keywords guardados como JSON string
  let works: any[] = [];
  let keywords: string[] = [];
  if (profile) {
    try {
      works = profile.works ? JSON.parse(profile.works) : [];
    } catch (e) {
      console.error('Error parsing works:', e);
    }
    try {
      keywords = profile.keywords ? JSON.parse(profile.keywords) : [];
    } catch (e) {
      console.error('Error parsing keywords:', e);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary-600" />
          Mi Perfil ORCID
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Vincula tu identificador ORCID oficial para sincronizar e importar tus investigaciones y publicaciones de forma automática
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {profile ? (
        /* Connected State */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Publications list */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 border-b border-surface-200 dark:border-surface-700 pb-3">
                <BookMarked className="w-5 h-5 text-primary-500" />
                Mis Investigaciones y Publicaciones ({works.length})
              </h2>

              {works.length > 0 ? (
                <div className="space-y-4">
                  {works.map((work, i) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400">
                            {work.type?.replace(/_/g, ' ') || 'PUBLICACIÓN'}
                          </span>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-tight mt-1">
                            {work.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                            {work.journal && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" /> {work.journal}
                              </span>
                            )}
                            {work.year && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Año: {work.year}
                              </span>
                            )}
                          </div>
                        </div>

                        {work.url && (
                          <a 
                            href={work.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-2 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg text-primary-600 dark:text-primary-400 transition-colors self-start flex-shrink-0"
                            title="Ver publicación oficial"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-surface-200 dark:border-surface-700 rounded-2xl">
                  <BookMarked className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">No hay publicaciones importadas</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                    Tu registro de ORCID no contiene publicaciones públicas en este momento.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Meta Details */}
          <div className="space-y-6">
            <div className="glass-card p-6 space-y-6">
              {/* Profile Card */}
              <div className="text-center pb-4 border-b border-surface-200 dark:border-surface-700">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-primary-500/20">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg mt-3 text-gray-900 dark:text-gray-100">{profile.displayName}</h3>
                
                <a 
                  href={`https://orcid.org/${profile.orcidId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold mt-1 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-200/40"
                >
                  <img src="https://orcid.org/assets/vectors/orcid.logo.svg" className="w-4 h-4" alt="ORCID iD Logo" />
                  {profile.orcidId}
                </a>

                {profile.lastSyncAt && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    Última sincronización: {new Date(profile.lastSyncAt).toLocaleString('es-PE')}
                  </p>
                )}
              </div>

              {/* Biography */}
              {profile.biography && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Biografía</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-line pr-1 scrollbar-thin">
                    {profile.biography}
                  </p>
                </div>
              )}

              {/* Research Areas / Keywords */}
              {keywords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Áreas de Investigación</h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {keywords.map((kw, i) => (
                      <span 
                        key={i} 
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-accent-50 dark:bg-accent-950/30 text-accent-700 dark:text-accent-400 border border-accent-100 dark:border-accent-900/30"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-surface-200 dark:border-surface-700 flex flex-col gap-2">
                <button
                  onClick={() => handleSync(profile.orcidId)}
                  disabled={syncing}
                  className="btn-primary w-full py-2 flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Sincronizando...' : 'Volver a Sincronizar'}</span>
                </button>

                <button
                  onClick={handleUnlink}
                  disabled={syncing}
                  className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-sm text-red-500 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Unlink className="w-4 h-4" />
                  <span>Desvincular ORCID</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Connect State */
        <div className="glass-card max-w-2xl mx-auto p-8 text-center space-y-6 animate-slide-up">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-500/20">
            <Link2 className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vincula tu Perfil Investigador</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
              ORCID proporciona un identificador digital persistente que te distingue de otros investigadores. Al vincularlo, importamos automáticamente tu biografía, palabras clave de estudio y tus publicaciones científicas.
            </p>
          </div>

          <div className="max-w-md mx-auto pt-4 space-y-4">
            <div className="space-y-1 text-left">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tu ORCID iD <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  value={orcidInput}
                  onChange={(e) => setOrcidInput(e.target.value)}
                  className="input-field pl-10" 
                  placeholder="Ej. 0000-0002-1825-0097" 
                  disabled={syncing}
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <span className="font-semibold text-emerald-600 text-xs">iD</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Debe ser un identificador oficial de 16 dígitos en el formato XXXX-XXXX-XXXX-XXXX.
              </p>
            </div>

            <button 
              onClick={() => handleSync(orcidInput)}
              disabled={syncing}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
            >
              {syncing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span>{syncing ? 'Sincronizando Publicaciones...' : 'Vincular y Sincronizar Perfil'}</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-surface-200 dark:border-surface-700 pt-4 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-emerald-600" /> API Pública ORCID v3.0</span>
            <span>•</span>
            <span>Seguro y Sin Contraseñas</span>
          </div>
        </div>
      )}
    </div>
  );
}
