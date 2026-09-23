import React, { useState } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { importBatchVideos } from '../lib/api.ts';

interface ImportBatchProps {
  currentVersion?: number;
  onNavigate: (route: string) => void;
  onImportComplete: () => void;
}

export const ImportBatch: React.FC<ImportBatchProps> = ({
  currentVersion,
  onNavigate,
  onImportComplete,
}) => {
  const [inputText, setInputText] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleCsv = `video_url,download_url,product_url,affiliate_url,title,description,thumbnail_url,allow_download,position,active,tags,price,discount
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4,,https://shopee.com.br/produto1,https://s.shopee.com.br/afiliado1,Teclado Mecânico RGB Gamer,Teclado mecânico switch azul com led rainbow,https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600,true,7,true,"Gamer, Teclado, Tech",R$ 139,90,-30%`;

  const sampleJson = `[
  {
    "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "download_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "product_url": "https://shopee.com.br/mouse-gamer-sem-fio",
    "affiliate_url": "https://s.shopee.com.br/mouse_afiliado",
    "title": "Mouse Gamer Sem Fio Recarregável 3200 DPI",
    "description": "Sensor de alta precisão, iluminação RGB e clique silencioso.",
    "thumbnail_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600",
    "allow_download": true,
    "position": 8,
    "active": true,
    "tags": ["Gamer", "Mouse", "Setup"],
    "price": "R$ 69,90",
    "discount": "-45%"
  }
]`;

  const handleParseAndImport = async () => {
    setError(null);
    setResult(null);

    if (!inputText.trim()) {
      setError('Insira o conteúdo CSV ou JSON para importar.');
      return;
    }

    let parsedItems: any[] = [];

    if (format === 'json') {
      try {
        parsedItems = JSON.parse(inputText);
        if (!Array.isArray(parsedItems)) {
          throw new Error('O JSON precisa ser um array de objetos [ { ... } ]');
        }
      } catch (err: any) {
        setError(`Erro de sintaxe JSON: ${err.message}`);
        return;
      }
    } else {
      // Parse CSV
      try {
        const lines = inputText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length < 2) {
          throw new Error('O CSV precisa ter um cabeçalho e pelo menos 1 linha de dados.');
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

        for (let i = 1; i < lines.length; i++) {
          // Simple CSV splitter handling quoted values
          const row: string[] = [];
          let current = '';
          let insideQuotes = false;
          for (const char of lines[i]) {
            if (char === '"' || char === "'") {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              row.push(current.trim().replace(/^["']|["']$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.trim().replace(/^["']|["']$/g, ''));

          const item: Record<string, any> = {};
          headers.forEach((header, idx) => {
            item[header] = row[idx] !== undefined ? row[idx] : '';
          });
          parsedItems.push(item);
        }
      } catch (err: any) {
        setError(`Erro ao interpretar CSV: ${err.message}`);
        return;
      }
    }

    if (parsedItems.length === 0) {
      setError('Nenhum item válido identificado no conteúdo.');
      return;
    }

    setLoading(true);
    try {
      const res = await importBatchVideos(parsedItems, currentVersion);
      setResult(res);
      onImportComplete();
    } catch (err: any) {
      setError(err?.message || 'Erro durante a importação em lote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => onNavigate('/admin/videos')}
          className="flex items-center gap-2 text-zinc-300 hover:text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Gerenciamento</span>
        </button>

        <h1 className="font-bold text-sm">Importação em Massa (CSV / JSON)</h1>

        <div className="w-24" />
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-6 flex flex-col gap-6">
        {/* Intro */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-base">
            <UploadCloud className="w-5 h-5" />
            <h2>Importar dezenas ou centenas de vídeos para o VendeX</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            O importador verifica duplicidade de URL de vídeo, valida os links, gera IDs automáticos, cria backup prévio e atualiza o banco de dados oficial no Firebase Realtime Database.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={() => {
                setFormat('csv');
                setInputText(sampleCsv);
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Carregar Exemplo CSV</span>
            </button>

            <button
              onClick={() => {
                setFormat('json');
                setInputText(sampleJson);
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Carregar Exemplo JSON</span>
            </button>
          </div>
        </div>

        {/* Format Select and Input Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white uppercase tracking-wider">
              Formato Selecionado:
            </label>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setFormat('csv')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  format === 'csv' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  format === 'json' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              format === 'csv'
                ? 'Cole seu arquivo CSV aqui com os cabeçalhos...'
                : 'Cole seu array JSON aqui...'
            }
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500 resize-y"
          />

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Importação Concluída com Sucesso!</span>
              </div>
              <p>
                <strong>{result.importedCount}</strong> vídeos importados e adicionados ao catálogo.
              </p>
              {result.skippedCount > 0 && (
                <p className="text-amber-300">
                  {result.skippedCount} registros foram ignorados (já existiam ou dados incompletos).
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onNavigate('/admin/videos')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleParseAndImport}
              disabled={loading || !inputText.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-rose-950/50 flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{loading ? 'Processando e gravando...' : 'Iniciar Importação em Lote'}</span>
            </button>
          </div>
        </div>

        {/* Expected Fields Reference */}
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-300 font-bold">
            <HelpCircle className="w-4 h-4 text-rose-500" />
            <span>Colunas / Campos Suportados:</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] list-disc pl-4">
            <li>
              <code>video_url</code>: URL direta do vídeo (Obrigatório)
            </li>
            <li>
              <code>title</code>: Nome do produto (Obrigatório)
            </li>
            <li>
              <code>product_url</code>: Link original do produto
            </li>
            <li>
              <code>affiliate_url</code>: Link de comissão do afiliado
            </li>
            <li>
              <code>download_url</code>: Link do MP4 para download
            </li>
            <li>
              <code>allow_download</code>: true ou false
            </li>
            <li>
              <code>active</code>: true (ativo) ou false (rascunho)
            </li>
            <li>
              <code>tags</code>: Lista de tags separadas por vírgula
            </li>
            <li>
              <code>price</code>: Preço formatado (ex: R$ 89,90)
            </li>
            <li>
              <code>discount</code>: Desconto visual (ex: -30%)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
