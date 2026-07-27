'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  UserPlus, Search, Edit2, Trash2, Mail, Globe, Award, ShieldAlert,
  Loader2, X, Check, AlertCircle, RefreshCw
} from 'lucide-react';

interface AuthorityUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'COORDINATOR' | 'ADVISOR' | 'STUDENT' | 'JURY' | 'AUTHORITY';
  academicDegree?: string | null;
  institution?: string | null;
  orcid?: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLES_TRANSLATION = {
  ADMIN: 'Administrador',
  COORDINATOR: 'Coordinador',
  ADVISOR: 'Asesor',
  STUDENT: 'Estudiante/Autor',
  JURY: 'Jurado Dictaminador',
  AUTHORITY: 'Autoridad Académica',
};

const ROLES_COLORS = {
  ADMIN: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50 dark:border-red-800/30',
  COORDINATOR: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/30',
  ADVISOR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30',
  STUDENT: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30',
  JURY: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30',
  AUTHORITY: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-800/30',
};

export default function AuthoritiesPage() {
  const [authorities, setAuthorities] = useState<AuthorityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ADVISOR' | 'JURY' | 'STUDENT' | 'AUTHORITY'>('ALL');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'COORDINATOR' | 'ADVISOR' | 'STUDENT' | 'JURY' | 'AUTHORITY'>('ADVISOR');
  const [formDegree, setFormDegree] = useState('Doctor');
  const [formInstitution, setFormInstitution] = useState('Universidad Nacional de Trujillo');
  const [formOrcid, setFormOrcid] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await apiClient<{ success: boolean; data: AuthorityUser[] }>('/users/academic');
      if (response.success && response.data) {
        setAuthorities(response.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar las autoridades');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormRole('ADVISOR');
    setFormDegree('Doctor');
    setFormInstitution('Universidad Nacional de Trujillo');
    setFormOrcid('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AuthorityUser) => {
    setEditingId(user.id);
    setFormEmail(user.email);
    setFormFirstName(user.firstName);
    setFormLastName(user.lastName);
    setFormRole(user.role);
    setFormDegree(user.academicDegree || 'Doctor');
    setFormInstitution(user.institution || 'Universidad Nacional de Trujillo');
    setFormOrcid(user.orcid || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');
    
    const payload = {
      email: formEmail.trim(),
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      role: formRole,
      academicDegree: formRole === 'STUDENT' ? 'Bachiller' : formDegree,
      institution: formInstitution.trim(),
      orcid: formOrcid.trim() || undefined,
    };

    try {
      let res;
      if (editingId) {
        res = await apiClient<{ success: boolean; data: AuthorityUser }>(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          setSuccessMsg('Autoridad actualizada correctamente');
        }
      } else {
        res = await apiClient<{ success: boolean; data: AuthorityUser }>('/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          setSuccessMsg('Autoridad creada correctamente');
        }
      }

      setIsModalOpen(false);
      fetchAuthorities();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar los cambios');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este miembro del registro? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const res = await apiClient<{ success: boolean }>(`/users/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSuccessMsg('Miembro eliminado del registro');
        fetchAuthorities();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el registro');
    }
  };

  // Filter authorities list
  const filtered = authorities.filter((user) => {
    const matchesTab = activeTab === 'ALL' || user.role === activeTab;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.orcid && user.orcid.toLowerCase().includes(searchLower));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Autoridades Académicas</h1>
          <p className="text-gray-500 mt-1 dark:text-gray-400">
            Administra los asesores, jurados dictaminadores y autores habilitados para generar documentos académicos.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/10 px-4 py-2.5 rounded-xl font-semibold"
        >
          <UserPlus className="w-5 h-5" />
          Registrar Autoridad
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 p-4 rounded-xl text-sm font-semibold border border-emerald-200/50 dark:border-emerald-800/20 shadow-sm transition-all duration-300">
          <Check className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 text-red-650 bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-4 rounded-xl text-sm font-semibold border border-red-200/50 dark:border-red-800/20 shadow-sm transition-all duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filters and search layout */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-surface-800 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm">
        {/* Tabs filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {(['ALL', 'ADVISOR', 'JURY', 'STUDENT', 'AUTHORITY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-700/50'
              }`}
            >
              {tab === 'ALL' ? 'Todos' : tab === 'ADVISOR' ? 'Asesores' : tab === 'JURY' ? 'Jurados' : tab === 'STUDENT' ? 'Estudiantes' : 'Autoridades'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
          <p className="text-sm text-gray-400">Cargando registros académicos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-sm text-center p-6">
          <ShieldAlert className="w-12 h-12 stroke-1 mb-2 text-gray-300" />
          <p className="text-base font-semibold">No se encontraron registros</p>
          <p className="text-xs max-w-sm mt-1">Prueba cambiando tu búsqueda o registra una nueva autoridad académica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((user) => {
            const initial = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
            const tagColor = ROLES_COLORS[user.role] || ROLES_COLORS.STUDENT;
            const degreeShort = user.academicDegree === 'Doctor' ? 'Dr.' : user.academicDegree === 'Magíster' ? 'Mg.' : user.academicDegree === 'Ingeniero' ? 'Ing.' : user.academicDegree === 'Licenciado' ? 'Lic.' : '';
            const fullNameWithDegree = `${degreeShort ? degreeShort + ' ' : ''}${user.firstName} ${user.lastName}`;

            return (
              <div
                key={user.id}
                className="group relative bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:border-primary-400 dark:hover:border-primary-650 hover:shadow-lg rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <div>
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${tagColor}`}>
                      {ROLES_TRANSLATION[user.role]}
                    </span>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-80 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg text-gray-500 hover:text-primary-500 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Profile Name & Initial */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {initial}
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {fullNameWithDegree}
                      </h3>
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                        <Award className="w-3 h-3 flex-shrink-0" />
                        {user.academicDegree || 'Grado no especificado'}
                      </p>
                    </div>
                  </div>

                  {/* Contact / Bio metadata */}
                  <div className="mt-4 pt-3 border-t border-surface-150 dark:border-surface-700 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{user.institution || 'Universidad Nacional de Trujillo'}</span>
                    </div>
                    {user.orcid && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-650 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-450 px-2 py-0.5 rounded-lg w-fit">
                        <span>ORCID: {user.orcid}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation/Edition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-750 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
              <h2 className="text-lg font-bold">
                {editingId ? 'Editar Autoridad Académica' : 'Registrar Nueva Autoridad'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre(s)</label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Ej. Juan Carlos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Ej. Pérez Mendoza"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Correo Universitario</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Ej. jperez@unitru.edu.pe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Rol de Autoridad</label>
                  <select
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  >
                    <option value="ADVISOR">Asesor Académico</option>
                    <option value="JURY">Jurado Dictaminador</option>
                    <option value="STUDENT">Estudiante/Autor</option>
                    <option value="AUTHORITY">Otras Autoridades</option>
                    <option value="COORDINATOR">Coordinador</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {formRole !== 'STUDENT' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Grado / Cargo</label>
                    <select
                      value={formDegree}
                      onChange={(e) => setFormDegree(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    >
                      <option value="Doctor">Doctor (Dr.)</option>
                      <option value="Magíster">Magíster (Mg.)</option>
                      <option value="Ingeniero">Ingeniero (Ing.)</option>
                      <option value="Licenciado">Licenciado (Lic.)</option>
                      <option value="Bachiller">Bachiller (Bach.)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Grado / Cargo</label>
                    <input
                      type="text"
                      disabled
                      value="Bachiller/Estudiante"
                      className="w-full px-3 py-2 text-sm bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-gray-400 outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Filiación / Institución</label>
                <input
                  type="text"
                  required
                  value={formInstitution}
                  onChange={(e) => setFormInstitution(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Ej. Universidad Nacional de Trujillo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ORCID iD (Opcional)</label>
                <input
                  type="text"
                  value={formOrcid}
                  onChange={(e) => setFormOrcid(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Ej. 0000-0002-1823-9023"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  {formLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
