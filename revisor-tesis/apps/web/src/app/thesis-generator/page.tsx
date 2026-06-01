"use client";

import { useMemo, useState } from 'react';
import { marked } from 'marked';
import { apiClient } from '@/lib/api-client';

export default function ThesisGeneratorPage() {
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState('Resumen, Introducción, Metodología');
  const [length, setLength] = useState<'short'|'medium'|'long'>('medium');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState('');

  const [docId, setDocId] = useState('');
  const [report, setReport] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);

  const generatedHtml = useMemo(() => marked.parse(generated), [generated]);
  const reportHtml = useMemo(() => marked.parse(report), [report]);

  async function handleGenerate(e: any) {
    e.preventDefault();
    setGenerating(true);
    try {
      const body = { title, sections: sections.split(',').map(s => s.trim()), length };
      const res: any = await apiClient('/thesis-generator/generate', { method: 'POST', body: JSON.stringify(body) });
      setGenerated(res.data.text || JSON.stringify(res));
    } catch (err: any) {
      setGenerated('Error: ' + (err.message || String(err)));
    } finally {
      setGenerating(false);
    }
  }

  async function handleFetchReport(e: any) {
    e.preventDefault();
    if (!docId) return;
    setLoadingReport(true);
    try {
      const res: any = await apiClient(`/documents/report?name=${encodeURIComponent(docId)}`);
      setReport(res.data.report || JSON.stringify(res));
    } catch (err: any) {
      setReport('Error: ' + (err.message || String(err)));
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Generador de Proyecto de Tesis</h1>

      <form onSubmit={handleGenerate} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full input" placeholder="Título de la tesis" />
        </div>
        <div>
          <label className="block text-sm font-medium">Secciones (separadas por coma)</label>
          <input value={sections} onChange={e => setSections(e.target.value)} className="mt-1 w-full input" />
        </div>
        <div>
          <label className="block text-sm font-medium">Longitud</label>
          <select value={length} onChange={e => setLength(e.target.value as any)} className="mt-1 select">
            <option value="short">Corta</option>
            <option value="medium">Media</option>
            <option value="long">Larga</option>
          </select>
        </div>

        <div>
          <button className="btn-primary" type="submit" disabled={generating}>{generating ? 'Generando...' : 'Generar Borrador'}</button>
        </div>
      </form>

      {generated ? (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Borrador generado</h2>
          <div className="prose max-w-none mt-2" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
        </div>
      ) : null}

      <hr />

      <h1 className="text-2xl font-bold">Visor de Reporte de Documento</h1>
      <form onSubmit={handleFetchReport} className="flex items-center space-x-2 mt-3">
        <input placeholder="Nombre del documento" value={docId} onChange={e => setDocId(e.target.value)} className="input" />
        <button className="btn" type="submit" disabled={loadingReport}>{loadingReport ? 'Cargando...' : 'Cargar Reporte'}</button>
      </form>

      {report ? (
        <div className="mt-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: reportHtml }} />
      ) : null}
    </div>
  );
}
