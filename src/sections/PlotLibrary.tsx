import { useState, useMemo } from 'react';
import {
  Star, Trash2, Search, ArrowUpDown, Library, X, AlertTriangle, Edit3, Check,
  Tag, Minus, Plus,
} from 'lucide-react';
import { usePlotLibrary, type PlotLibraryItem } from '@/hooks/usePlotLibrary';

type SortMode = 'time' | 'wordCount-desc' | 'wordCount-asc' | 'score-desc' | 'score-asc';

/** 从剧情点内容中提取评分 */
function extractScore(content: string): number | null {
  const match = content.match(/平均分[:：]\s*(\d+)/);
  if (match) return parseInt(match[1], 10);
  const m2 = content.match(/评分[:：]\s*(\d+)/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

/**
 * 从 <bq>...</bq> 锚点中提取剧情标签
 */
function extractPlotTags(content: string): string[] {
  if (!content) return [];
  const match = content.match(/<bq>([\s\S]*?)<\/bq>/);
  if (!match) return [];
  return match[1]
    .split(/[、\s，,]+/)
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(tag => tag.length > 0 && tag.length < 20)
    .slice(0, 8);
}

/**
 * 弹窗文本清洗
 */
function prepareModalText(rawText: string): string {
  if (!rawText) return '';
  let cleanText = rawText;
  cleanText = cleanText.replace(/<fs>[\s\S]*?<\/fs>/g, '');
  cleanText = cleanText.replace(/<bq>[\s\S]*?<\/bq>/g, '');
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n');
  return cleanText.trim();
}

/**
 * 从 <fs>...</fs> 锚点中提取评分数据
 */
function extractFsScores(content: string): Record<string, string> | null {
  if (!content) return null;
  const match = content.match(/<fs>([\s\S]*?)<\/fs>/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const scores: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (m) scores[m[1].trim()] = m[2].trim();
  }
  return Object.keys(scores).length > 0 ? scores : null;
}

/** 从数值字符串提取数字 */
function extractNumber(value: string): number | null {
  const m = value.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/** 平均分颜色体系 */
function getScoreColor(value: string): string {
  const num = extractNumber(value);
  if (num === null) return 'text-gray-800';
  if (num < 70) return 'text-green-500';
  if (num < 80) return 'text-blue-500';
  if (num < 90) return 'text-purple-500';
  return 'text-yellow-500';
}

/** 判断某个评分键名是否使用颜色体系 */
function isScoringDimension(key: string): boolean {
  return ['新颖度', '冲突强度', '情绪强度', '期待感', '平均分', '张力', '情绪冲击', '综合评分'].includes(key);
}

/** 从所有剧情点中提取全部标签，按出现次数排序 */
function buildTagNav(items: PlotLibraryItem[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const tags = extractPlotTags(item.content);
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

export default function PlotLibrary() {
  const { items, deleteItem, updateItem, clearAll } = usePlotLibrary();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState<PlotLibraryItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  // 字号调节（连续，最小10最大20）
  const [modalFontSize, setModalFontSize] = useState(13);
  // 标签导航筛选
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // 标签导航数据
  const tagNav = useMemo(() => buildTagNav(items), [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const kw = search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(kw) ||
        p.content.toLowerCase().includes(kw) ||
        p.chapter.toLowerCase().includes(kw)
      );
    }
    if (activeTagFilter) {
      list = list.filter(p => extractPlotTags(p.content).includes(activeTagFilter));
    }
    switch (sortMode) {
      case 'time':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'wordCount-desc':
        list.sort((a, b) => b.wordCount - a.wordCount);
        break;
      case 'wordCount-asc':
        list.sort((a, b) => a.wordCount - b.wordCount);
        break;
      case 'score-desc':
        list.sort((a, b) => {
          const scoreDiff = (extractScore(b.content) || 0) - (extractScore(a.content) || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      case 'score-asc':
        list.sort((a, b) => {
          const scoreDiff = (extractScore(a.content) || 0) - (extractScore(b.content) || 0);
          if (scoreDiff !== 0) return scoreDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
    }
    return list;
  }, [items, search, sortMode, activeTagFilter]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 标题栏 */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-brand" />
            <div>
              <h1 className="text-base font-bold text-gray-900">剧情库</h1>
              <p className="text-[10px] text-gray-400">
                共 {items.length} 条剧情点
                {activeTagFilter && ` · 筛选「${activeTagFilter}」${filtered.length} 条`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 搜索 */}
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-6 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* 排序 */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand bg-white"
              >
                <option value="time">最新</option>
                <option value="wordCount-desc">字数高</option>
                <option value="wordCount-asc">字数低</option>
                <option value="score-desc">评分高</option>
                <option value="score-asc">评分低</option>
              </select>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> 清空
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 主内容：左侧标签导航树 + 右侧卡片网格 ═══ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 左侧：标签导航树 */}
        <div className="w-[180px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* 导航头部 */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-bold text-gray-700">标签筛选</span>
            <span className="text-[10px] text-gray-400 ml-auto">{tagNav.length} 个</span>
          </div>
          {/* 标签列表 */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* 全部 */}
            <button
              onClick={() => setActiveTagFilter(null)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                activeTagFilter === null
                  ? 'bg-brand text-white'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-xs font-medium">全部</span>
              <span className={`text-[10px] ${activeTagFilter === null ? 'text-white/80' : 'text-gray-400'}`}>
                {items.length}
              </span>
            </button>
            {/* 各标签 */}
            {tagNav.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  activeTagFilter === tag
                    ? 'bg-brand text-white'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-xs truncate flex-1 min-w-0">{tag}</span>
                <span className={`text-[10px] shrink-0 ml-1 ${activeTagFilter === tag ? 'text-white/80' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            ))}
            {tagNav.length === 0 && (
              <div className="text-center py-6 text-gray-300 text-xs">暂无标签</div>
            )}
          </div>
        </div>

        {/* 右侧：卡片网格区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <Library className="w-12 h-12 mb-2" />
              <p className="text-sm">
                {items.length === 0 ? '暂无剧情点，在提炼页面导入' : '没有匹配的剧情点'}
              </p>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="grid grid-cols-5 gap-3">
              {filtered.filter(item => item.content.trim().length > 0).map((item) => {
                const tags = extractPlotTags(item.content);
                const fsScores = extractFsScores(item.content);
                return (
                  <button
                    key={item.id}
                    onClick={() => setShowDetail(item)}
                    className="text-left bg-white rounded-lg border border-gray-200 hover:border-brand hover:shadow-md transition-all group flex flex-col min-h-[150px]"
                  >
                    {/* 左右结构：左侧评分，右侧标签 */}
                    <div className="flex flex-1 min-h-0">
                      {/* 左侧：评分（<fs>内容） */}
                      {fsScores ? (
                        <div className="w-1/2 shrink-0 p-2.5 border-r border-gray-100 bg-gray-50/30 flex flex-col justify-center gap-1.5">
                          {/* 字数 — #52c4f7 */}
                          <div className="flex items-center justify-between leading-none">
                            <span className="text-[15px] text-gray-400">字数</span>
                            <span className="text-[15px] font-bold" style={{ color: '#52c4f7' }}>{item.wordCount}</span>
                          </div>
                          {Object.entries(fsScores).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between leading-none">
                              <span className="text-[15px] text-gray-500">{key}</span>
                              <span className={`text-[15px] font-bold ${
                                isScoringDimension(key) ? getScoreColor(value) : 'text-gray-800'
                              }`}>{value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-1/2 shrink-0 p-2.5 border-r border-gray-100 bg-gray-50/30 flex items-center justify-center">
                          <span className="text-[11px] text-gray-400">无评分</span>
                        </div>
                      )}
                      {/* 右侧：标签（<bq>内容） */}
                      <div className="w-1/2 p-2.5 flex flex-col justify-center gap-2">
                        {tags.length > 0 ? (
                          tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-[14px] rounded-full text-center leading-none"
                              style={{ backgroundColor: '#f0f5ff', color: '#4a6cf7' }}
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[14px] text-gray-400 text-center">无标签</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ 详情弹窗（A- / A+ 字号调节） ═══════ */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowDetail(null); setEditingId(null); }}>
          <div className="w-[600px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">剧情点</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">{showDetail.chapter}</span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">{showDetail.wordCount} 字</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editingId === showDetail.id ? (
                  <>
                    <button
                      onClick={() => {
                        updateItem(showDetail.id, { content: editContent });
                        setEditingId(null);
                        setShowDetail({ ...showDetail, content: editContent, wordCount: editContent.length });
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
                    >
                      <Check className="w-3 h-3" /> 保存
                    </button>
                    <button
                      onClick={() => { setEditingId(null); }}
                      className="px-3 py-1.5 text-[11px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    {/* ═══ - / + 字号调节 ═══ */}
                    <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                      <button
                        onClick={() => setModalFontSize(s => Math.max(MIN_FONT_SIZE, s - 1))}
                        disabled={modalFontSize <= MIN_FONT_SIZE}
                        className="flex items-center justify-center px-2.5 py-1.5 text-gray-500 hover:text-brand hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="减小字号"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] text-gray-500 px-1 min-w-[22px] text-center tabular-nums font-medium">
                        {modalFontSize}
                      </span>
                      <button
                        onClick={() => setModalFontSize(s => Math.min(MAX_FONT_SIZE, s + 1))}
                        disabled={modalFontSize >= MAX_FONT_SIZE}
                        className="flex items-center justify-center px-2.5 py-1.5 text-gray-500 hover:text-brand hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="放大字号"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => { setEditingId(showDetail.id); setEditContent(showDetail.content); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> 编辑
                    </button>
                    <button
                      onClick={() => { deleteItem(showDetail.id); setShowDetail(null); setEditingId(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> 删除
                    </button>
                  </>
                )}
                <button onClick={() => { setShowDetail(null); setEditingId(null); }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-5">
              {editingId === showDetail.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] p-3 text-gray-800 leading-relaxed border border-gray-200 rounded-lg focus:outline-none focus:border-brand resize-none font-mono whitespace-pre-wrap"
                  style={{ fontSize: modalFontSize }}
                  spellCheck={false}
                />
              ) : (
                <div
                  className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words"
                  style={{ fontSize: modalFontSize }}
                >
                  {prepareModalText(showDetail.content)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 清空确认弹窗 ═══════ */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[400px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">清空剧情库</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                <span className="text-xs text-gray-600">将删除</span>
                <span className="text-sm font-bold text-red-600">{items.length}</span>
                <span className="text-xs text-gray-600">条剧情点，且无法恢复</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => { clearAll(); setShowClearConfirm(false); setShowDetail(null); }}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
