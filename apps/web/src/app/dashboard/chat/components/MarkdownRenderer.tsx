import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      let codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      const codeString = codeLines.join('\n');
      elements.push(
        <pre key={`code-${i}`} className="my-3 p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-xs border border-slate-800 shadow-inner">
          {language && <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 select-none border-b border-slate-800 pb-1">{language}</div>}
          <code>{codeString}</code>
        </pre>
      );
      continue;
    }

    // 2. Table
    if (line.trim().startsWith('|') || (line.includes('|') && lines[i+1]?.trim().startsWith('|---') || lines[i+1]?.includes('|---'))) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i].includes('|') || lines[i].trim() === '')) {
        if (lines[i].trim() !== '') {
          tableLines.push(lines[i]);
        }
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (rowStr: string) => {
          let cleaned = rowStr.trim();
          if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
          if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
          return cleaned.split('|').map(cell => cell.trim());
        };

        const headers = parseRow(tableLines[0]);
        const bodyRows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto border border-surface-200 dark:border-surface-700 rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700 text-xs">
              <thead className="bg-surface-50 dark:bg-surface-850 font-bold text-gray-700 dark:text-gray-200 text-left">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-4 py-3 font-semibold uppercase tracking-wider border-r last:border-r-0 border-surface-200 dark:border-surface-700">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-700 bg-white dark:bg-surface-900 text-gray-600 dark:text-gray-300">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/40 odd:bg-white even:bg-surface-50/20 dark:odd:bg-surface-900 dark:even:bg-surface-850">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 border-r last:border-r-0 border-surface-200 dark:border-surface-700 max-w-xs break-words">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Unordered list
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-gray-700 dark:text-gray-300">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 4. Ordered list
    const matchOrdered = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (matchOrdered) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^(\d+)\.\s+(.*)/);
        if (!m) break;
        listItems.push({ num: m[1], text: m[2] });
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 my-2.5 space-y-1.5 text-gray-700 dark:text-gray-300">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item.text)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 5. Headings
    if (line.trim().startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const text = line.replace(/^#+/, '').trim();
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
      const headingStyles = 
        level === 1 ? 'text-lg font-extrabold text-gray-900 dark:text-white mt-4 mb-2' :
        level === 2 ? 'text-base font-bold text-gray-800 dark:text-gray-150 mt-3.5 mb-1.5 border-b border-surface-100 dark:border-surface-800 pb-0.5' :
        level === 3 ? 'text-sm font-bold text-gray-800 dark:text-gray-200 mt-3 mb-1' :
        'text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2 mb-1';
      elements.push(
        <Tag key={`h-${i}`} className={headingStyles}>
          {renderInline(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // 6. Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().slice(1).trim());
        i++;
      }
      elements.push(
        <blockquote key={`quote-${i}`} className="pl-4 border-l-4 border-emerald-500 bg-surface-50 dark:bg-surface-800/30 py-2 my-3 text-xs italic text-gray-600 dark:text-gray-400 rounded-r-lg">
          {quoteLines.map((ql, idx) => (
            <p key={idx} className="my-1">{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 7. Divider
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-surface-200 dark:border-surface-700" />);
      i++;
      continue;
    }

    // 8. Normal paragraph
    if (line.trim() !== '') {
      elements.push(
        <p key={`p-${i}`} className="my-2 leading-relaxed text-gray-700 dark:text-gray-300">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="markdown-container text-sm space-y-1">{elements}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  const regex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={idx} className="italic text-gray-800 dark:text-gray-200">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-900/60 rounded font-mono font-bold text-xs text-red-500 dark:text-red-400">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return (
          <a key={idx} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline font-semibold transition-colors">
            {match[1]}
          </a>
        );
      }
    }
    return part;
  });
}
