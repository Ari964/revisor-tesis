import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revisor de Tesis | Plataforma de Evaluación Académica',
  description: 'Sistema integral de gestión, revisión y evaluación automatizada de tesis universitarias con inteligencia artificial.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
