'use client';

import { useState } from 'react';
import { Users, Plus, Search, MoreVertical, Shield, Mail, Calendar, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin Principal', email: 'admin@universidad.edu.pe', role: 'ADMIN', status: 'ACTIVE', joined: '2026-05-10' },
    { id: 2, name: 'Dr. Roberto Gómez', email: 'coordinador@universidad.edu.pe', role: 'COORDINATOR', status: 'ACTIVE', joined: '2026-05-11' },
    { id: 3, name: 'Dra. María Sánchez', email: 'asesor@universidad.edu.pe', role: 'ADVISOR', status: 'ACTIVE', joined: '2026-05-11' },
    { id: 4, name: 'Juan Pérez', email: 'estudiante@universidad.edu.pe', role: 'STUDENT', status: 'ACTIVE', joined: '2026-05-12' },
    { id: 5, name: 'Ana Martínez', email: 'ana.m@universidad.edu.pe', role: 'STUDENT', status: 'SUSPENDED', joined: '2026-05-13' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'STUDENT' });

  const handleAddUser = () => {
    const user = {
      id: Date.now(),
      ...newUser,
      status: 'ACTIVE',
      joined: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, user]);
    setIsModalOpen(false);
    setNewUser({ name: '', email: '', role: 'STUDENT' });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'COORDINATOR': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ADVISOR': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'STUDENT': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Administra accesos y roles de la plataforma</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-5 h-5" /> Nuevo Usuario
        </button>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select className="w-full sm:w-auto px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 outline-none focus:ring-2 focus:ring-primary-500">
            <option value="ALL">Todos los roles</option>
            <option value="ADMIN">Administradores</option>
            <option value="COORDINATOR">Coordinadores</option>
            <option value="ADVISOR">Asesores</option>
            <option value="STUDENT">Estudiantes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-700">
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Usuario</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Rol</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Estado</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300">Registro</th>
                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-700/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3"/> {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex w-fit items-center gap-1.5 ${getRoleBadge(user.role)} border-current/20`}>
                      <Shield className="w-3 h-3" /> {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                     <span className={`flex items-center gap-1.5 text-sm font-medium ${user.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                       {user.status === 'ACTIVE' ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                       {user.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                     </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4"/> {user.joined}
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors text-gray-500">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-surface-200 dark:border-surface-700">
            <h2 className="text-2xl font-bold mb-6">Crear Nuevo Usuario</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre Completo</label>
                <input 
                  type="text" 
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="ejemplo@universidad.edu.pe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rol en el Sistema</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="STUDENT">Estudiante</option>
                  <option value="ADVISOR">Asesor</option>
                  <option value="COORDINATOR">Coordinador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.email}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold btn-primary disabled:opacity-50"
              >
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
