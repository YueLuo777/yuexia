import { useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle, Loader2, RotateCcw, Sparkles, Upload, X, BookOpen } from 'lucide-react';

import { useNovelLibrary, type ImportedChapterInput } from '@/features/novels/hooks/useNovelLibrary';
import type { WorkType } from '@/features/novels/model/novelTypes';

type ImportMode = 'smart' | 'local';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: WorkType;
}

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

const CHAPTER_TITLE_REGEX = /(?:^|\n)\s*(?:第[一二三四五六七八九十百千万零\d]+章|第\d+章|Chapter\s+\d+|序章|楔子|引子|开篇|终章|尾声)[\s：:\-、.]*([^\n]*)/gi;

function parseBookName(content: string): string | null {
  const match = content.match(/书名[：:]\s*(.+)/);
  return match ? match[1].trim() : null;
}

function parseSynopsis(content: string): string | null {
  const introMatch = content.match(/简介[：:]\s*\n?/);
  if (!introMatch) return null;
  const start = content.indexOf(introMatch[0]) + introMatch[0].length;
  const rest = content.slice(start);
  const stopPatterns = [
    /\n\s*[-=·~*]{3,}\s*\n/,
    /\n\s*(?:第[一二三四五六七八九十百千万零\d]+章|第\d+章|Chapter\s+\d+|正文|目录|章节目录)\s*[：:]?/i,
    /\n\s*(?:作者[：:]|分类[：:]|标签[：:]|状态[：:])\s*/i,
  ];
  let stopPos = rest.length;
  for (const pattern of stopPatterns) {
    const result = rest.match(pattern);
    if (result && result.index !== undefined && result.index < stopPos) {
      stopPos = result.index;
    }
  }
  const synopsis = rest.slice(0, stopPos).trim();
  return synopsis.length > 0 ? synopsis.slice(0, 800) : null;
}

function parseChapters(content: string): ParsedChapter[] {
  const matches: { index: number; title: string; raw: string }[] = [];
  const regex = new RegExp(CHAPTER_TITLE_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      index: match.index,
      title: (match[1] ?? match[0]).trim(),
      raw: match[0],
    });
  }

  if (matches.length === 0) return [];

  return matches.map((current, index) => {
    const start = current.index + current.raw.length;
    const end = index < matches.length - 1 ? matches[index + 1].index : content.length;
    const rawContent = content.slice(start, end).trim();
    const cleanContent = rawContent.replace(/^\s*\n+/, '').trim();
    return {
      title: current.title || `第${index + 1}章`,
      content: cleanContent,
      wordCount: cleanContent.length,
    };
  });
}

function parseSmartImport(content: string): SmartImportResult {
  const bookName = parseBookName(content);
  const synopsis = parseSynopsis(content);
  const chapters = parseChapters(content);
  const totalWordCount = chapters.reduce((sum, item) => sum + item.wordCount, 0);
  return { bookName, synopsis, chapters, totalWordCount };
}

async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const utf8 = new TextDecoder('utf-8').decode(arrayBuffer);
    const utf8Matches = utf8.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (utf8Matches && utf8Matches.length > 0) {
      return utf8Matches.map((item) => item.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
    }
    const utf16 = new TextDecoder('utf-16le').decode(arrayBuffer);
    const utf16Matches = utf16.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (utf16Matches && utf16Matches.length > 0) {
      return utf16Matches.map((item) => item.replace(/<w:t[^>]*>|<\/w:t>/g, '')).join('');
    }
  } catch {
    // ignore
  }
  return '';
}

function convertToImportedChapters(result: SmartImportResult, mode: ImportMode, selectedFile: File | null): ImportedChapterInput[] {
  if (mode === 'smart' && result.chapters.length > 0) {
    return result.chapters;
  }
  return [{
    title: selectedFile?.name.replace(/\.[^.]+$/, '') || '导入正文',
    content: result.chapters.map((chapter) => `${chapter.title}\n${chapter.content}`).join('\n\n') || '',
    wordCount: result.totalWordCount,
  }];
}

export function ImportModal({ isOpen, onClose, defaultType = 'novel' }: ImportModalProps) {
  const { importNovelWithChapters } = useNovelLibrary();
  const [importMode, setImportMode] = useState<ImportMode>('smart');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<SmartImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setImportMode('smart');
    setSelectedFile(null);
    setFileName(null);
    setParsedResult(null);
    setIsParsing(false);
    onClose();
  };

  const parseSelectedFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let content = '';
    if (ext === 'txt') {
      content = await file.text();
    } else {
      const arrayBuffer = await file.arrayBuffer();
      content = await extractTextFromDocx(arrayBuffer);
      if (!content || content.length < 10) {
        throw new Error('当前 doc/docx 文件无法提取文本，请先转成 txt 再导入。');
      }
    }
    setParsedResult(parseSmartImport(content));
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    setIsParsing(true);
    try {
      await parseSelectedFile(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : '文件解析失败');
      setSelectedFile(null);
      setFileName(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = () => {
    if (!selectedFile || !parsedResult) return;
    const chapters = convertToImportedChapters(parsedResult, importMode, selectedFile);
    const title = importMode === 'smart'
      ? parsedResult.bookName?.trim() || selectedFile.name.replace(/\.[^.]+$/, '')
      : selectedFile.name.replace(/\.[^.]+$/, '');

    importNovelWithChapters(
      {
        title,
        type: defaultType,
        synopsis: parsedResult.synopsis || undefined,
        category: '未分类',
      },
      chapters,
    );
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex w-[720px] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">导入作品</h2>
          <button onClick={resetAndClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setImportMode('smart')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              importMode === 'smart'
                ? 'border-b-2 border-orange-500 bg-orange-50/50 text-orange-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              智能导入
            </span>
          </button>
          <button
            onClick={() => setImportMode('local')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              importMode === 'local'
                ? 'border-b-2 border-blue-500 bg-blue-50/50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              本地导入
            </span>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5" style={{ minHeight: '420px', maxHeight: '55vh' }}>
          {importMode === 'smart' ? (
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-xs leading-relaxed text-orange-700">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p><strong>智能导入</strong>：识别书名、简介和章节，创建全新作品。</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p><strong>本地导入</strong>：直接把文件内容保存成单章节，适合完整正文。</p>
            </div>
          )}

          <div className="flex flex-col rounded-lg border border-gray-200 p-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="text-sm text-gray-700">选择文件</span>
              <input ref={fileInputRef} type="file" accept=".txt,.doc,.docx" className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50">
                选择文件
              </button>
            </div>
            <p className="text-xs text-gray-400">{fileName || '未选择文件（支持 .txt / .doc / .docx，最大 50MB）'}</p>
          </div>

          <div className="overflow-hidden rounded-lg border border-orange-200">
            <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">识别结果</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  共 <span className="font-bold text-orange-600">{parsedResult?.chapters.length ?? 0}</span> 章，
                  <span className="ml-1 font-bold text-orange-600">{(parsedResult?.totalWordCount ?? 0).toLocaleString()}</span> 字
                </span>
                {selectedFile && (
                  <button
                    onClick={async () => {
                      if (!selectedFile) return;
                      setIsParsing(true);
                      try {
                        await parseSelectedFile(selectedFile);
                      } catch (error) {
                        alert(error instanceof Error ? error.message : '重新解析失败');
                      } finally {
                        setIsParsing(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-orange-600 transition-colors hover:bg-orange-100"
                  >
                    <RotateCcw className="h-3 w-3" />
                    重新解析
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 p-4">
              {isParsing ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在解析文件...
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex min-w-[60px] items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">书名</span>
                    </div>
                    {parsedResult?.bookName ? (
                      <span className="text-sm font-bold text-gray-900">{parsedResult.bookName}</span>
                    ) : (
                      <span className="text-sm italic text-gray-400">未识别</span>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex min-w-[60px] items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">简介</span>
                    </div>
                    {parsedResult?.synopsis ? (
                      <p className="line-clamp-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{parsedResult.synopsis}</p>
                    ) : (
                      <span className="text-sm italic text-gray-400">未识别</span>
                    )}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex min-w-[60px] items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">章节</span>
                    </div>
                    {parsedResult && parsedResult.chapters.length > 0 ? (
                      <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="mb-2 text-xs text-gray-500">已识别 {parsedResult.chapters.length} 章</div>
                        <div className="max-h-[160px] space-y-1 overflow-y-auto text-xs text-gray-700">
                          {parsedResult.chapters.slice(0, 12).map((chapter, index) => (
                            <div key={`${chapter.title}-${index}`} className="truncate">
                              {index + 1}. {chapter.title || `第${index + 1}章`}
                            </div>
                          ))}
                          {parsedResult.chapters.length > 12 && (
                            <div className="pt-1 text-[11px] text-gray-400">... 还有 {parsedResult.chapters.length - 12} 章</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm italic text-gray-400">未识别</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <button onClick={resetAndClose} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-white">
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || !parsedResult || isParsing}
            className="rounded-md bg-brand px-5 py-2 text-sm text-white hover:bg-brand-dark disabled:bg-gray-300"
          >
            {importMode === 'smart' ? '智能导入并创建作品' : '开始导入'}
          </button>
        </div>
      </div>
    </div>
  );
}
