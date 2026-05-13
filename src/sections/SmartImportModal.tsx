import { useState, useRef, useCallback } from 'react';
import {
  X, FileText, BookOpen, Upload, Sparkles, AlertTriangle,
  File, CheckCircle,
} from 'lucide-react';
import mammoth from 'mammoth';

interface NovelOption {
  id: number;
  title: string;
  type: 'novel' | 'script';
}

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    title: string;
    content: string;
    novelId: number;
    novelTitle: string;
    type: 'novel' | 'script';
  }[]) => void;
  novels: NovelOption[];
}

/* ─── 智能识别：从文本内容中提取结构化信息 ─── */
function smartParse(text: string, fileName: string): {
  title: string;
  content: string;
  abstract: string;
  source: string;
  chapter: string;
  rating: number;
  tags: string[];
} {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. 提取标题（从文件名或第一行）
  let title = fileName.replace(/\.(txt|doc|docx)$/i, '').trim();
  if (lines.length > 0 && lines[0].length < 50 && !lines[0].startsWith('【')) {
    title = lines[0];
  }

  // 2. 找【摘要】标记
  let abstractStart = -1;
  let abstractEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('【摘要】') || lines[i] === '【摘要】') {
      abstractStart = i;
      break;
    }
  }

  // 3. 找元数据标记位置
  const metaMarkers = ['【出处】', '【评分】', '【标签】', '【章节】', '【书名】', '【来源】'];
  for (let i = 0; i < lines.length; i++) {
    if (metaMarkers.some(m => lines[i].startsWith(m))) {
      if (abstractStart === -1 || i > abstractStart) {
        abstractEnd = Math.min(abstractEnd, i);
      }
    }
  }

  // 4. 提取摘要
  let abstract = '';
  if (abstractStart >= 0) {
    abstract = lines.slice(abstractStart + 1, abstractEnd).join('\n').trim();
  } else {
    // 没有【摘要】标记，取前5-10行作为摘要
    const endIdx = Math.min(10, lines.length);
    abstract = lines.slice(0, endIdx).join('\n').trim();
  }
  // 限制摘要长度
  if (abstract.length > 300) abstract = abstract.slice(0, 300) + '...';

  // 5. 提取出处/书名
  const sourceMatch = text.match(/【出处】《([^》]+)》/);
  const bookMatch = text.match(/【书名】《([^》]+)》/);
  const source = sourceMatch ? sourceMatch[1] : (bookMatch ? bookMatch[1] : title);

  // 6. 提取章节
  const chapterMatch = text.match(/【章节】(.+)/);
  const chMatch = text.match(/-(第[\d一二三四五六七八九十百]+章)/);
  const chapter = chapterMatch ? chapterMatch[1].trim() : (chMatch ? chMatch[1] : '');

  // 7. 提取评分
  const ratingMatch = text.match(/【评分】\s*(\d+)分?/);
  const rating = ratingMatch ? Math.min(100, Math.max(0, parseInt(ratingMatch[1], 10))) : 0;

  // 8. 提取标签
  const tagsMatch = text.match(/【标签】(.+)/);
  const tags = tagsMatch
    ? tagsMatch[1].split(/[,，、]/).map(t => t.trim()).filter(t => t.length > 0)
    : [];

  // 9. 组装标准化内容（带标记格式）
  const formattedContent = `【摘要】\n${abstract}\n\n【出处】《${source}》${chapter ? '-' + chapter : ''}\n\n【评分】${rating}分\n\n【标签】${tags.join('、') || '无'}\n\n${text}`;

  return { title, content: formattedContent, abstract, source, chapter, rating, tags };
}

/* ─── 智能识别：长文本自动拆分为多条资料 ─── */
function smartSplit(text: string, fileName: string): {
  title: string;
  content: string;
  abstract: string;
  source: string;
  chapter: string;
  rating: number;
  tags: string[];
}[] {
  // 如果文本中有多个【摘要】标记，按标记拆分
  const splits: typeof smartParse extends (...args: any[]) => infer R ? R[] : never = [];
  const segments = text.split(/(?=【摘要】)/g).filter(s => s.trim().length > 20);

  if (segments.length > 1) {
    segments.forEach((seg, idx) => {
      const parsed = smartParse(seg, `${fileName}_${idx + 1}`);
      if (parsed.abstract.length > 5) splits.push(parsed);
    });
  }

  // 如果拆不出多条，整体作为一条
  if (splits.length === 0) {
    splits.push(smartParse(text, fileName));
  }

  return splits;
}

export default function SmartImportModal({ isOpen, onClose, onImport, novels }: SmartImportModalProps) {
  const [importType, setImportType] = useState<'novel' | 'script'>('novel');
  const [selectedNovelId, setSelectedNovelId] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [parsedItems, setParsedItems] = useState<ReturnType<typeof smartParse>[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [step, setStep] = useState<'select' | 'preview'>('select');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAbstract, setEditAbstract] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredNovels = novels.filter(n => n.type === importType);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsParsing(true);

    try {
      let text = '';
      const ext = selected.name.split('.').pop()?.toLowerCase();

      if (ext === 'txt') {
        text = await selected.text();
      } else if (ext === 'docx') {
        const arrayBuffer = await selected.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (ext === 'doc') {
        // .doc 老格式浏览器无法解析，提示用户
        setFile(null);
        setIsParsing(false);
        alert('.doc 格式暂不支持，请另存为 .docx 或 .txt 后导入');
        return;
      }

      setFileContent(text);
      const items = smartSplit(text, selected.name.replace(/\.(txt|docx?)$/i, ''));
      setParsedItems(items);
      setStep('preview');
    } catch (err) {
      console.error('Parse error:', err);
      alert('文件解析失败，请检查文件格式');
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (parsedItems.length === 0) return;
    const novel = filteredNovels.find(n => n.id === selectedNovelId);
    if (!novel && filteredNovels.length > 0) {
      alert('请先选择目标作品');
      return;
    }

    const targetNovel = novel || filteredNovels[0];
    if (!targetNovel) {
      alert(`请先创建一个${importType === 'novel' ? '小说' : '剧本'}作品`);
      return;
    }

    const data = parsedItems.map(item => ({
      title: item.title,
      content: item.content,
      novelId: targetNovel.id,
      novelTitle: targetNovel.title,
      type: importType,
    }));

    onImport(data);
    // 重置
    setFile(null);
    setFileContent('');
    setParsedItems([]);
    setStep('select');
    onClose();
  }, [parsedItems, filteredNovels, selectedNovelId, importType, onImport, onClose]);

  const handleEditStart = useCallback((idx: number) => {
    setEditingIdx(idx);
    setEditTitle(parsedItems[idx].title);
    setEditAbstract(parsedItems[idx].abstract);
  }, [parsedItems]);

  const handleEditSave = useCallback(() => {
    if (editingIdx === null) return;
    setParsedItems(prev => prev.map((item, i) => {
      if (i !== editingIdx) return item;
      const newContent = item.content.replace(
        /【摘要】\n[\s\S]*?(?=\n\n【出处】)/,
        `【摘要】\n${editAbstract}`
      );
      return { ...item, title: editTitle, abstract: editAbstract, content: newContent };
    }));
    setEditingIdx(null);
  }, [editingIdx, editTitle, editAbstract]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden"
        style={{ width: step === 'preview' ? 680 : 520, maxWidth: '95vw', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-gray-900">智能导入</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'select' ? (
            <div className="space-y-5">
              {/* 导入目标选择 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">导入到</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportType('novel')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      importType === 'novel'
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-sm font-medium">小说资料</span>
                  </button>
                  <button
                    onClick={() => setImportType('script')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      importType === 'script'
                        ? 'border-brand bg-brand-light text-brand'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">剧本资料</span>
                  </button>
                </div>
              </div>

              {/* 目标作品 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">目标作品</label>
                <select
                  value={selectedNovelId}
                  onChange={(e) => setSelectedNovelId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand bg-white"
                >
                  <option value={0}>请选择作品...</option>
                  {filteredNovels.map(n => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
                {filteredNovels.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    暂无{importType === 'novel' ? '小说' : '剧本'}作品，请先创建
                  </p>
                )}
              </div>

              {/* 文件选择 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">选择文件</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-200 rounded-lg hover:border-brand hover:bg-brand-light/30 transition-all disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-brand">正在智能识别...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-300" />
                      <span className="text-sm text-gray-500">点击选择 .txt 或 .docx 文件</span>
                      <span className="text-xs text-gray-400">支持 txt、docx 格式，doc 请另存为 docx</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* 预览步骤 */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-gray-700">
                    识别到 {parsedItems.length} 条资料
                  </span>
                </div>
                <button
                  onClick={() => { setStep('select'); setFile(null); setParsedItems([]); }}
                  className="text-xs text-brand hover:underline"
                >
                  重新选择文件
                </button>
              </div>

              {/* 资料卡片预览 */}
              <div className="space-y-3">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    {editingIdx === idx ? (
                      /* 编辑模式 */
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">标题</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">摘要</label>
                          <textarea
                            value={editAbstract}
                            onChange={(e) => setEditAbstract(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-100"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleEditSave}
                            className="px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 预览模式 */
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <File className="w-4 h-4 text-brand" />
                            <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                          </div>
                          <button
                            onClick={() => handleEditStart(idx)}
                            className="text-xs text-brand hover:underline"
                          >
                            编辑
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-2">{item.abstract}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                          {item.source && <span>书名：《{item.source}》</span>}
                          {item.chapter && <span>章节：{item.chapter}</span>}
                          {item.rating > 0 && <span>评分：{item.rating}分</span>}
                          {item.tags.length > 0 && <span>标签：{item.tags.join('、')}</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 shrink-0">
          {step === 'preview' && file && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <FileText className="w-3.5 h-3.5" />
              <span>{file.name}</span>
              <span>({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
          {step === 'select' && <div />}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (step === 'preview') {
                  setStep('select');
                  setFile(null);
                  setParsedItems([]);
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              {step === 'preview' ? '上一步' : '取消'}
            </button>
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={parsedItems.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                确认导入 ({parsedItems.length}条)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
