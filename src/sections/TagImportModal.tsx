import { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles, CheckCircle, FileText, Loader2, Brain } from 'lucide-react';
import mammoth from 'mammoth';
import { callModelAPI, getEnabledModels } from '@/lib/ai';

interface TagCategory {
  name: string;
  description?: string;
  color: string;
}

interface ImportedTag {
  name: string;
  category: string;
}

interface AiModel {
  id: string;
  name: string;
}

interface TagImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string, targetCategory?: string) => ImportedTag[];
  categories: TagCategory[];
}

export default function TagImportModal({ isOpen, onClose, onImport, categories }: TagImportModalProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('manual');
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportedTag[] | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 手动导入状态
  const [targetCategory, setTargetCategory] = useState<string>('');

  // AI 状态
  const [aiModels, setAiModels] = useState<AiModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRawResult, setAiRawResult] = useState('');

  // 加载 AI 模型
  useEffect(() => {
    if (!isOpen) return;
    const models = getEnabledModels();
    setAiModels(models);
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── 手动导入 ───
  const handleManualImport = () => {
    if (!text.trim() || !targetCategory) return;
    const imported = onImport(text, targetCategory);
    setResult(imported);
  };

  // ─── AI 智能导入 ───
  const handleAiImport = async () => {
    if (!text.trim() || !selectedModelId) return;
    setIsAiClassifying(true);
    setAiError(null);
    setResult(null);
    setAiRawResult('');

    try {
      const catDescriptions = categories.map(c =>
        `- ${c.name}${c.description ? `：${c.description}` : ''}`
      ).join('\n');

      const prompt = `你是一个网文标签分类专家。请分析下面用户提供的一批标签，将每个标签分配到最合适的分类中。

可用分类：
${catDescriptions}

要求：
1. 对用户的每个标签，分析其语义，分配到最匹配的分类
2. 返回格式必须严格如下，每行一个标签：
【标签名：标签说明】=> 分类名
3. 如果标签名已包含说明，保留说明；如果没有说明，根据分类主题补充简短说明
4. 不要遗漏任何标签
5. 不要输出任何解释文字，只输出标签分配结果

用户输入：
${text.trim()}`;

      const response = await callModelAPI(prompt, selectedModelId);

      if (response.startsWith('【错误】')) {
        setAiError(response);
        setIsAiClassifying(false);
        return;
      }

      setAiRawResult(response);
      const classifiedText = buildClassifiedText(response, categories);
      const imported = onImport(classifiedText);
      setResult(imported);
    } catch (err: any) {
      setAiError(`AI 分类失败: ${err.message || String(err)}`);
    } finally {
      setIsAiClassifying(false);
    }
  };

  const buildClassifiedText = (aiResponse: string, cats: TagCategory[]): string => {
    const lines = aiResponse.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const output: string[] = [];
    let lastCat = cats[0]?.name || '默认分类';

    for (const line of lines) {
      const match = line.match(/【([^【】]+?)\s*[：:]\s*(.+?)】\s*=>\s*(.+)/);
      if (match) {
        const tagName = match[1].trim();
        const tagDesc = match[2].trim();
        const catName = match[3].trim();
        if (catName !== lastCat) {
          const catInfo = cats.find(c => c.name === catName);
          if (catInfo) {
            output.push(`*${catName}：${catInfo.description || ''}*`);
            lastCat = catName;
          }
        }
        output.push(`【${tagName}：${tagDesc}】`);
      } else {
        const tagOnly = line.match(/【([^【】]+?)\s*[：:]\s*(.+?)】/);
        if (tagOnly) {
          output.push(`【${tagOnly[1].trim()}：${tagOnly[2].trim()}】`);
        }
      }
    }
    return output.join('\n');
  };

  // ─── 文件选择 ───
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingFile(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let content = '';
      if (ext === 'txt' || ext === 'md') {
        content = await file.text();
      } else if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else if (ext === 'doc') {
        alert('.doc 格式暂不支持，请将文件另存为 .docx 或 .txt 后再导入');
        setParsingFile(false); return;
      } else {
        alert('不支持的文件格式'); setParsingFile(false); return;
      }
      setText(content); setResult(null); setAiError(null);
    } catch (err) {
      console.error('文件解析失败:', err); alert('文件解析失败');
    } finally {
      setParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setText(''); setResult(null); setAiError(null); setAiRawResult(''); setTargetCategory(''); onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden w-[600px] max-w-[95vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-base font-bold text-gray-900">导入标签</h3>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => { setActiveTab('manual'); setResult(null); }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-brand border-b-2 border-brand bg-brand-light/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            手动导入
          </button>
          <button
            onClick={() => { setActiveTab('ai'); setResult(null); setAiError(null); }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            AI 智能导入
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ─── AI 智能导入 Tab ─── */}
          {activeTab === 'ai' && (
            <>
              {/* AI 模型选择 */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">选择 AI 模型</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-violet-300 bg-white"
                >
                  {aiModels.length === 0 && <option value="">未配置 AI 模型</option>}
                  {aiModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {aiModels.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-500">请先在「模型管理」中配置并启用 AI 模型</p>
                )}
              </div>

              <div className="h-px bg-gray-100" />

              {/* 文件 + 文本输入 */}
              <input ref={fileInputRef} type="file" accept=".txt,.md,.doc,.docx" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={parsingFile}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/30 transition-all disabled:opacity-50">
                <FileText className="w-5 h-5 text-gray-300" />
                <span className="text-sm text-gray-500">{parsingFile ? '解析中...' : '选择 .txt / .md / .docx 文件'}</span>
              </button>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">粘贴标签文本</label>
                <textarea
                  value={text} onChange={(e) => { setText(e.target.value); setResult(null); setAiError(null); }}
                  placeholder={"粘贴标签列表，AI 自动分配到最合适的分类：\n【微末崛起：从社会最底层的低贱身份起步】\n【隐藏大佬：顶级身份隐瞒实力】"}
                  rows={8}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300 resize-none"
                />
              </div>

              {aiRawResult && (
                <div className="p-3 bg-violet-50/50 border border-violet-200 rounded-lg">
                  <p className="text-[11px] text-violet-600 font-medium mb-1">AI 分类结果</p>
                  <pre className="text-[11px] text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">{aiRawResult}</pre>
                </div>
              )}
              {aiError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-[11px] text-red-500">{aiError}</p></div>}
            </>
          )}

          {/* ─── 手动导入 Tab ─── */}
          {activeTab === 'manual' && (
            <>
              {/* 目标分类选择 */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block font-medium">选择目标分类 <span className="text-red-400">*</span></label>
                <p className="text-[11px] text-gray-400 mb-2">所有导入的标签将归入所选分类</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button key={cat.name} onClick={() => { setTargetCategory(cat.name); setResult(null); }}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1.5 ${
                        targetCategory === cat.name ? 'font-medium' : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      style={targetCategory === cat.name ? { borderColor: cat.color + '80', color: cat.color, backgroundColor: cat.color + '15' } : {}}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
                {!targetCategory && <p className="mt-1.5 text-[11px] text-amber-500">请先选择一个分类</p>}
              </div>

              <div className="h-px bg-gray-100" />

              {/* 文件 + 文本输入 */}
              <input ref={fileInputRef} type="file" accept=".txt,.md,.doc,.docx" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={parsingFile}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-brand hover:bg-brand-light/30 transition-all disabled:opacity-50">
                <FileText className="w-5 h-5 text-gray-300" />
                <span className="text-sm text-gray-500">{parsingFile ? '解析中...' : '选择 .txt / .md / .docx 文件'}</span>
              </button>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">粘贴标签文本</label>
                <textarea
                  value={text} onChange={(e) => { setText(e.target.value); setResult(null); }}
                  placeholder="格式：【标签名：标签说明】\n\n【微末崛起：从社会最底层的低贱身份起步】\n【隐藏大佬：顶级身份隐瞒实力】"
                  rows={8}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none"
                />
              </div>
            </>
          )}

          {/* ─── 导入结果（共用） ─── */}
          {result !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">
                  成功导入 {result.length} 个标签{activeTab === 'manual' && targetCategory ? `到「${targetCategory}」` : ''}
                </span>
              </div>
              {result.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {result.map(item => (
                    <span key={`${item.category}-${item.name}`} className="px-2 py-0.5 text-[11px] bg-white rounded border border-emerald-200 text-emerald-600">{item.name}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">关闭</button>
          {activeTab === 'ai' ? (
            <button onClick={handleAiImport} disabled={!text.trim() || !selectedModelId || isAiClassifying}
              className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-violet-500 rounded-md hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed">
              {isAiClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isAiClassifying ? 'AI 分析中...' : 'AI 智能导入'}
            </button>
          ) : (
            <button onClick={handleManualImport} disabled={!text.trim() || !targetCategory}
              className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
              <Upload className="w-4 h-4" /> 导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
