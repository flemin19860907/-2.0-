import React, { useState, useRef } from 'react';
import { Loader2, Clapperboard, Film, Clock, Wand2, Upload, FileText, X, Download } from 'lucide-react';
import { generateStoryboard } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export default function StoryboardGenerator() {
  const [script, setScript] = useState('');
  const [duration, setDuration] = useState('60s');
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!script.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const output = await generateStoryboard(script, duration, style);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        throw new Error('不支持的文件格式。请上传 .docx, .txt, 或 .md 文件。');
      }

      setScript((prev) => prev + (prev ? '\n\n' : '') + text);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取文件失败');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportExcel = () => {
    if (!result) return;

    // Parse Markdown table
    const lines = result.split('\n');
    const tableData: string[][] = [];
    let isTable = false;

    for (const line of lines) {
      if (line.trim().startsWith('|')) {
        isTable = true;
        // Remove leading/trailing pipes and split by pipe
        const row = line.split('|').map(cell => cell.trim()).filter((cell, index, arr) => {
           // Filter out empty strings that result from split at the start/end if the line starts/ends with |
           return index !== 0 && index !== arr.length - 1;
        });
        
        // Skip separator line (e.g., |---|---|)
        if (row.some(cell => cell.match(/^[-:]+$/))) {
          continue;
        }
        
        tableData.push(row);
      } else if (isTable && line.trim() === '') {
        // End of table
        isTable = false;
      }
    }

    if (tableData.length === 0) {
      alert('未找到可导出的表格数据');
      return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(tableData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "分镜脚本");

    // Generate Excel file
    XLSX.writeFile(wb, "分镜脚本.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-gray-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight text-white">
              即梦 2.0 <span className="text-gray-500 font-normal">分镜导演</span>
            </h1>
          </div>
          <div className="text-xs font-mono text-gray-600 border border-white/5 px-2 py-1 rounded">
            v1.2.0
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#18181b] rounded-2xl p-1 border border-white/5 shadow-xl">
            <div className="p-5 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                    <Film className="w-4 h-4" />
                    剧本 / 故事梗概
                  </label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    上传文档
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md,.docx"
                    className="hidden"
                  />
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="在此粘贴剧本，或点击右上角上传文档 (.docx, .txt, .md)..."
                  className="w-full h-64 bg-[#0f0f12] border border-white/10 rounded-xl p-4 text-sm text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-none transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Wand2 className="w-4 h-4" />
                  电影风格
                </label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="例如：赛博朋克、吉卜力动画、黑白胶片、诺兰风格..."
                  className="w-full bg-[#0f0f12] border border-white/10 rounded-xl p-3 text-sm text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <Clock className="w-4 h-4" />
                  目标时长
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="例如：60秒, 2分钟"
                  className="w-full bg-[#0f0f12] border border-white/10 rounded-xl p-3 text-sm text-gray-300 placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !script.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      生成分镜脚本
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setScript("赛博朋克风格的侦探在雨夜的霓虹城市中行走，寻找嫌疑人。他在垃圾桶里发现了一条线索，抬头看向巨大的全息广告牌。");
                    setDuration("30秒");
                    setStyle("赛博朋克 / 银翼杀手风格");
                  }}
                  disabled={loading}
                  className="px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-colors border border-white/5"
                  title="加载示例"
                >
                  示例
                </button>

                <button
                  onClick={() => {
                    setScript("");
                    setDuration("60秒");
                    setStyle("");
                    setResult(null);
                    setError(null);
                  }}
                  disabled={loading}
                  className="px-4 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded-xl transition-colors border border-white/5"
                  title="清空"
                >
                  清空
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#18181b]/50 rounded-xl p-6 border border-white/5 text-xs text-gray-500 leading-relaxed">
            <h3 className="text-gray-400 font-medium mb-2">使用技巧</h3>
            <ul className="space-y-2 list-disc list-inside">
              <li>支持上传 .docx, .txt, .md 格式的剧本文件。</li>
              <li>在剧本中包含具体的视觉细节，有助于生成更精准的提示词。</li>
              <li>注明影片风格（如：科幻、动漫、胶片感），AI会自动调整画风。</li>
            </ul>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}
          
          {result ? (
            <div className="bg-[#18181b] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-white/5 bg-white/2 flex justify-between items-center">
                <h2 className="text-sm font-medium text-gray-300">分镜脚本输出</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportExcel}
                    className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-indigo-500/20"
                  >
                    <Download className="w-3 h-3" />
                    导出 Excel
                  </button>
                  <button 
                    onClick={() => navigator.clipboard.writeText(result)}
                    className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    复制 Markdown
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-x-auto">
                <div className="prose prose-invert prose-sm max-w-none prose-table:border-collapse prose-th:bg-white/5 prose-th:p-3 prose-td:p-3 prose-td:border-b prose-td:border-white/5 prose-th:text-gray-300 prose-td:text-gray-400 prose-th:font-medium prose-th:text-left prose-td:align-top">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {result}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/5 rounded-2xl bg-[#18181b]/30">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Clapperboard className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm">准备生成分镜脚本</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
