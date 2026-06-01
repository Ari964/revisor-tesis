'use client';

import { useState } from 'react';
import { Bell, CheckCircle2, ShieldAlert, Layers, Clock, CheckCheck, Trash2, Info } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Análisis IA Completado',
      message: 'La revisión del documento "Capitulo_1_Marco_Teorico_v3.pdf" ha finalizado con 3 hallazgos críticos.',
      type: 'INFO',
      read: false,
      timestamp: 'Hace 5 minutos',
      link: '/dashboard/documents/1'
    },
    {
      id: 2,
      title: '¡Alerta de Plagio Detectada!',
      message: 'Se ha encontrado una similitud del 89% en "Analisis_de_Resultados.docx". Requiere revisión urgente.',
      type: 'ALERT',
      read: false,
      timestamp: 'Hace 1 hora',
      link: '/dashboard/plagiarism'
    },
    {
      id: 3,
      title: 'Nueva Rúbrica Asignada',
      message: 'El coordinador ha asignado la rúbrica "Rúbrica Pregrado (Ingeniería)" a tu proyecto.',
      type: 'SUCCESS',
      read: true,
      timestamp: 'Ayer',
      link: '/dashboard/patterns'
    },
    {
      id: 4,
      title: 'Recordatorio de Entrega',
      message: 'Faltan 48 horas para la fecha límite de entrega del Capítulo 3.',
      type: 'WARNING',
      read: true,
      timestamp: 'Hace 2 días',
      link: '/dashboard/projects'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INFO': return <Layers className="w-5 h-5 text-blue-500" />;
      case 'ALERT': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'WARNING': return <Clock className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-white dark:bg-surface-800';
    switch (type) {
      case 'INFO': return 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30';
      case 'ALERT': return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30';
      case 'SUCCESS': return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30';
      case 'WARNING': return 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30';
      default: return 'bg-surface-50 dark:bg-surface-900';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="relative">
              <Bell className="w-8 h-8" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-surface-50 dark:border-surface-900" />
              )}
            </div>
            Notificaciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tienes {unreadCount} notificaciones sin leer</p>
        </div>
        <button 
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCheck className="w-5 h-5" /> Marcar todas como leídas
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4 mt-8">
        {notifications.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Todo al día</h3>
            <p className="text-gray-500">No tienes notificaciones pendientes.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-5 rounded-2xl border transition-all ${getBgColor(notif.type, notif.read)} ${notif.read ? 'border-surface-200 dark:border-surface-700 opacity-70' : 'shadow-sm'}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-white dark:bg-surface-900 rounded-xl shadow-sm border border-surface-100 dark:border-surface-700 flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className={`font-semibold truncate ${notif.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${notif.read ? 'text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    {notif.message}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-3">
                    {notif.link && (
                      <Link 
                        href={notif.link}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Ver detalles &rarr;
                      </Link>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => deleteNotification(notif.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
