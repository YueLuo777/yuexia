import { useState, useRef, type ChangeEvent } from 'react';
import {
  X, Upload, BookOpen, Sparkles,
  CheckCircle, RotateCcw, Loader2, ListOrdered,
} from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';
import { useNovelsContext } from '@/hooks/useNovels';

type ImportMode = 'smart' | 'smart2' | 'local';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'novel' | 'script';
}

/* ─── 解析结果类型 ─── */
interface ParsedChapter {
  title: string;
  content: string;
  wordCount: number;
}

interface SmartImportResult {
  bookName: string | null;
  synopsis: string | null;
  chapters: ParsedChapter[];
  totalWordCount: number;
}

/* ─── 章节标题正则 ─── */
const CHAPTER_TITLE_REGEX = /(?:^|\n)\s*(?:第[一二三四五六七八九十百千零\d]+章|第\d+章|Chapter\s+\d+|序章|楔子|引子|开篇|终章|尾声)[\s：:.]*([^\n]*)/gi;

/* ─── 书名解析 ─── */
function parseBookName(content: string): string | null {
  const match = content.match(/书名[：:]\s*(.+)/);
  return match ? match[1].trim() : null;
}

/* ─── 简介解析 ─── */
function parseSynopsis(content: string): string | null {
  let synopsis: string | null = null;
  const introIdx = content.search(/简介[：:]\s*\n?/i);
  if (introIdx !== -1) {
    const afterIntro = content.slice(introIdx + content.slice(introIdx).match(/简介[：:]\s*\n?/i)![0].length);
    const stopPatterns = [
      /\n\s*[-=·~\*]{3,}\s*\n/,
      /\n\s*(?:第[一二三四五六七八九十百千零\d]+章|第\d+章|第\d+卷|Chapter\s+\d+|序章|楔子|开篇|引子|正文|目录|章节目录)\s*[：:]/i,
      /\n\s*(?:第[一二三四五六七八九十百千零\d]+章|第\d+章|第\d+卷|Chapter\s+\d+|序章|楔子)\s*\n/,
      /\n\n\n\n/,
      /\n\s*(?:作者[：:]|分类[：:]|标签[：:]|状态[：:])\s*/i,
    ];
    let stopPos = afterIntro.length;
    for (const pattern of stopPatterns) {
      const match = afterIntro.match(pattern);
      if (match && match.index !== undefined && match.index < stopPos) {
        stopPos = match.index;
      }
    }
    synopsis = afterIntro.slice(0, stopPos).trim()
      .replace(/\n\s*[-=·~\*]{3,}\s*$/, '')
      .replace(/\n\n\s*$/, '')
      .replace(/^\s*\n+/, '')
      .trim();
  }
  if (synopsis && synopsis.length > 800) {
    synopsis = synopsis.slice(0, 800) + '...';
  }
  return synopsis;
}

/* ─── 章节解析 ─── */
function parseChapters(content: string): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  const matches: { index: number; title: string; rawLine: string }[] = [];

  const regex = new RegExp(CHAPTER_TITLE_REGEX.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    matches.push({ index: m.index, title: m[1]?.trim() || m[0].trim(), rawLine: m[0] });
  }

  if (matches.length === 0) return [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].rawLine.length;
    const end = i < matches.length - 1 ? matches[i + 1].index : content.length;
    const chapterContent = content.slice(start, end).trim();
    const cleanContent = chapterContent.replace(/^\s*\n+/, '').trim();
    chapters.push({
      title: matches[i].title,
      content: cleanContent,
      wordCount: cleanContent.length,
    });
  }
  return chapters;
}

/* ─── 统一智能解析入口 ─── */
function parseSmartImport(content: string): SmartImportResult {
  const bookName = parseBookName(content);
  const synopsis = parseSynopsis(content);
  const chapters = parseChapters(content);
  const totalWordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  return { bookName, synopsis, chapters, totalWordCount };
}

/* ─── 从 docx 二进制提取文本 ─── */
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(arrayBuffer);
    const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (matches && matches.length > 0) {
      return matches.map((m) => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
    }
    const decoder16 = new TextDecoder('utf-16le');
    const text16 = decoder16.decode(arrayBuffer);
    const matches16 = text16.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (matches16 && matches16.length > 0) {
      return matches16.map((m) => m.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
    }
  } catch { /* ignore */ }
  return '';
}

export default function ImportModal({ isOpen, onClose, defaultType = 'novel' }: ImportModalProps) {
  const { importNovelWithChapters, mergeNovelChapters, novels, getDefaultTitle } = useNovelsContext();
  const [importMode, setImportMode] = useState<ImportMode>('smart');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<SmartImportResult | null>(null);
  const workType = defaultType;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useBackdropClick(onClose, isOpen);

  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  /* ─── 文件选择 ─── */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'txt' && ext !== 'docx' && ext !== 'doc') {
      alert('仅支持 .txt、.doc 和 .docx 格式');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过 50MB');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setParsedResult(null);

    if (importMode === 'smart' || importMode === 'smart2') {
      setIsParsing(true);
      try {
        let content = '';
        if (ext === 'txt') {
          content = await file.text();
        } else {
          const arrayBuffer = await file.arrayBuffer();
          content = await extractTextFromDocx(arrayBuffer);
          if (!content || content.length < 10) {
            alert('该 docx 文件无法提取文本，请尝试转换为 .txt 格式后重新导入');
            setIsParsing(false);
            setSelectedFile(null);
            setFileName(null);
            return;
          }
        }
        const result = parseSmartImport(content);
        setParsedResult(result);
      } catch (err) {
        alert('文件解析失败：' + (err as Error).message);
      } finally {
        setIsParsing(false);
      }
    }
  };

  /* ─── 重新解析 ─── */
  const handleReparse = async () => {
    if (!selectedFile) return;
    setIsParsing(true);
    try {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      let content = '';
      if (ext === 'txt') {
        content = await selectedFile.text();
      } else {
        const arrayBuffer = await selectedFile.arrayBuffer();
        content = await extractTextFromDocx(arrayBuffer);
      }
      setParsedResult(parseSmartImport(content));
    } catch (err) {
      alert('重新解析失败：' + (err as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  /* ─── 切换导入模式时重置 ─── */
  const handleModeChange = (mode: ImportMode) => {
    setImportMode(mode);
    setSelectedFile(null);
    setFileName(null);
    setParsedResult(null);
  };

  /* ─── 确认导入 ─── */
  const handleImport = () => {
    if (!selectedFile) return;

    if (importMode === 'smart' && parsedResult) {
      // 智能导入：创建新作品
      importNovelWithChapters(
        {
          title: parsedResult.bookName?.trim() || getDefaultTitle(workType),
          cover: '',
          type: workType,
          synopsis: parsedResult.synopsis || undefined,
          category: '未分类',
        },
        parsedResult.chapters,
      );
    } else if (importMode === 'smart2' && parsedResult) {
      // 智能导入2：合并到同名作品（跳过已有章节）
      const finalTitle = parsedResult.bookName?.trim() || getDefaultTitle(workType);
      const existingNovel = novels.find(
        (n) => n.title.trim() === finalTitle && n.type === workType
      );

      if (existingNovel) {
        mergeNovelChapters(existingNovel.id, parsedResult.chapters);
      } else {
        // 没有同名作品，退化为普通智能导入
        importNovelWithChapters(
          {
            title: finalTitle,
            cover: '',
            type: workType,
            synopsis: parsedResult.synopsis || undefined,
            category: '未分类',
          },
          parsedResult.chapters,
        );
      }
    } else {
      // 本地导入
      importNovelWithChapters(
        {
          title: getDefaultTitle(workType),
          cover: '',
          type: workType,
          category: '未分类',
        },
        [],
      );
    }

    resetAndClose();
  };

  const resetAndClose = () => {
    setImportMode('smart');
    setSelectedFile(null);
    setFileName(null);
    setParsedResult(null);
    onClose();
  };

  const canImport = !!selectedFile && (importMode === 'local' || !isParsing);

  // 智能模式才显示解析结果
  const displayResult = parsedResult || ((importMode === 'smart' || importMode === 'smart2') && !selectedFile && !isParsing ? {
    bookName: null, synopsis: null, chapters: [], totalWordCount: 0,
  } : null);

  // 底部按钮文字
  const getButtonText = () => {
    if (!parsedResult) return '开始导入';
    if (importMode === 'smart') {
      return `智能导入（创建新作品）`;
    }
    if (importMode === 'smart2') {
      return `智能导入2（合并追加）`;
    }
    return '开始导入';
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[680px] max-w-[92vw] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">导入作品</h2>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导入模式切换 — 三个Tab */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleModeChange('smart')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              importMode === 'smart'
                ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            智能导入
          </button>
          <button
            onClick={() => handleModeChange('smart2')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              importMode === 'smart2'
                ? 'text-green-600 border-b-2 border-green-500 bg-green-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            智能导入2
          </button>
          <button
            onClick={() => handleModeChange('local')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              importMode === 'local'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            本地导入
          </button>
        </div>

        {/* 内容区 — 统一最小高度 */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ minHeight: '420px', maxHeight: '55vh' }}>
          {/* 模式说明 */}
          {importMode === 'smart' && (
            <div className="p-3 bg-orange-50 rounded-lg flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-xs text-orange-700 leading-relaxed">
                <span className="font-bold">智能导入</span>：识别书名、简介和章节，<span className="font-bold">创建全新作品</span>。即使已有同名作品也会独立创建。
              </p>
            </div>
          )}
          {importMode === 'smart2' && (
            <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700 leading-relaxed">
                <span className="font-bold">智能导入2</span>：识别书名、简介和章节，<span className="font-bold">合并到同名已有作品</span>。自动跳过已存在的章节，只追加新章节。同名作品不存在时自动创建新作品。
              </p>
            </div>
          )}
          {importMode === 'local' && (
            <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
              <Upload className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-bold">本地导入</span>：将文件内容直接保存为单章节，适用于已有完整文稿。
              </p>
            </div>
          )}

          {/* 选择文件 */}
          <div className="p-4 border border-gray-200 rounded-lg flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <label className="text-sm text-gray-700">选择文件</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                选择文件
              </button>
            </div>
            <p className="text-xs text-gray-400">
              {fileName || '未选择文件（.txt / .doc / .docx，≤50MB）'}
            </p>
          </div>

          {/* 智能导入/智能导入2：解析结果预览（含空状态） */}
          {(importMode === 'smart' || importMode === 'smart2') && displayResult && (
            <div className="border border-orange-200 rounded-lg overflow-hidden">
              {/* 预览头部 */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">智能识别结果</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    共 <span className="font-bold text-orange-600">{displayResult.chapters.length}</span> 章，
                    <span className="font-bold text-orange-600">{displayResult.totalWordCount.toLocaleString()}</span> 字
                  </span>
                  {selectedFile && (
                    <button
                      onClick={handleReparse}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重新解析
                    </button>
                  )}
                </div>
              </div>

              {/* 识别字段 */}
              <div className="p-4 space-y-3">
                {/* 书名 */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 min-w-[60px]">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">书名</span>
                  </div>
                  {displayResult.bookName ? (
                    <span className="text-sm font-bold text-gray-900">{displayResult.bookName}</span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">—</span>
                  )}
                </div>

                {/* 章节统计 */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 min-w-[60px] mt-0.5">
                    <ListOrdered className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">章节</span>
                  </div>
                  {displayResult.chapters.length > 0 ? (
                    <span className="text-sm text-gray-700">
                      共识别 <span className="font-bold text-orange-600">{displayResult.chapters.length}</span> 章
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 italic">—</span>
                  )}
                </div>

                {/* 简介 */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 min-w-[60px] mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">简介</span>
                  </div>
                  {displayResult.synopsis ? (
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">{displayResult.synopsis}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">—</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 解析中 */}
          {(importMode === 'smart' || importMode === 'smart2') && isParsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">正在智能解析文件内容...</span>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={resetAndClose}
            className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!canImport}
            className={`px-5 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${
              importMode === 'smart2'
                ? 'bg-green-500 hover:bg-green-600'
                : importMode === 'local'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}
