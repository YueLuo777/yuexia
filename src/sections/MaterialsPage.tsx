import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, X, Edit3, Trash2, BookOpen, Book, AlertTriangle, Pencil,
  Tag, Upload, ArrowRightLeft,
} from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import { useNovelsContext } from '@/hooks/useNovels';
import { useTags } from '@/hooks/useTags';
import type { Material } from '@/hooks/useMaterials';
import SmartImportModal from './SmartImportModal';
import TagImportModal from './TagImportModal';

/* ─── 辅助函数：从 content 解析标记 ─── */
function parseContentMarkers(content: string) {
  const lines = content.split('\n');
  let abstractStart = -1;
  let abstractEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('【摘要】')) { abstractStart = i; break; }
  }

  const metaMarkers = ['【出处】', '【评分】', '【标签】', '【章节】'];
  for (let i = 0; i < lines.length; i++) {
    if (metaMarkers.some((m) => lines[i].startsWith(m))) {
      if (abstractStart === -1 || i > abstractStart) { abstractEnd = i; break; }
    }
  }

  let abstract = '';
  if (abstractStart >= 0) {
    abstract = lines.slice(abstractStart + 1, abstractEnd).join('\n').trim();
  } else {
    abstract = lines.slice(0, abstractEnd).join('\n').trim();
  }

  const sourceMatch = content.match(/【出处】《([^》]+)》-(第[\d一二三四五六七八九十百]+章(?:\(或第[\d-]+章\))?)/);
  const ratingMatch = content.match(/【评分】\s*(\d+)分?/);
  // 提取标签
  const tagsMatch = content.match(/【标签】(.+)/);
  const tags = tagsMatch ? tagsMatch[1].split(/[,，、]/).map(t => t.trim()).filter(Boolean) : [];

  return { abstract, source: sourceMatch ? sourceMatch[1] : '', chapter: sourceMatch ? sourceMatch[2] : '', rating: ratingMatch ? parseInt(ratingMatch[1], 10) : 0, tags };
}

/* ─── 删除确认弹窗 ─── */
function DeleteConfirmModal({ isOpen, onClose, onConfirm }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[360px] bg-white rounded-xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">确认删除</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">删除后将无法恢复，是否继续？</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">取消</button>
          <button onClick={onConfirm} className="px-4 py-1.5 text-sm text-white bg-red-500 rounded-md hover:bg-red-600">删除</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 标签移动弹窗 ─── */
function TagMoveModal({ isOpen, onClose, onMove, tag, categories }: {
  isOpen: boolean; onClose: () => void;
  onMove: (category: string) => void;
  tag: { id: string; name: string; category: string } | null;
  categories: { name: string; color: string }[];
}) {
  const [selectedCat, setSelectedCat] = useState('');

  if (!isOpen || !tag) return null;

  const handleMove = () => {
    if (!selectedCat) return;
    onMove(selectedCat);
    setSelectedCat('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[400px] bg-white rounded-xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-1">移动标签</h3>
        <p className="text-sm text-gray-500 mb-4">
          将 <span className="font-medium text-gray-700">{tag.name.replace(/^#/, '')}</span> 移动到：
        </p>
        <div className="flex flex-wrap gap-2 mb-5 max-h-48 overflow-y-auto">
          {categories.filter(c => c.name !== tag.category).map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCat(cat.name)}
              className={`px-3 py-2 text-xs rounded-lg border transition-colors flex items-center gap-1.5 ${
                selectedCat === cat.name
                  ? 'font-medium border-transparent'
                  : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              style={
                selectedCat === cat.name
                  ? { borderColor: cat.color + '80', color: cat.color, backgroundColor: cat.color + '15' }
                  : {}
              }
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">取消</button>
          <button onClick={handleMove} disabled={!selectedCat}
            className="px-4 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
            移动
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 标签删除确认弹窗 ─── */
function TagDeleteConfirmModal({ isOpen, onClose, onConfirm, tagName }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void; tagName: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[360px] bg-white rounded-xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-gray-900">确认删除标签</h3>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          确定要删除标签 <span className="font-medium text-gray-700">「{tagName}」</span> 吗？删除后将无法恢复。
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">取消</button>
          <button onClick={onConfirm} className="px-4 py-1.5 text-sm text-white bg-red-500 rounded-md hover:bg-red-600">删除</button>
        </div>
      </div>
    </div>
  );
}

/* ─── 资料编辑弹窗 ─── */
function MaterialEditModal({ isOpen, onClose, onSave, novels, defaultType, editMaterial }: {
  isOpen: boolean; onClose: () => void;
  onSave: (data: { title: string; content: string; novelId: number; novelTitle: string; type: 'novel' | 'script' }) => void;
  novels: { id: number; title: string; type: 'novel' | 'script' }[];
  defaultType: 'novel' | 'script';
  editMaterial?: Material | null;
}) {
  const filteredNovels = novels.filter((n) => n.type === defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedNovelId, setSelectedNovelId] = useState<number>(filteredNovels[0]?.id || 0);

  useEffect(() => {
    if (editMaterial) {
      setTitle(editMaterial.title);
      setContent(editMaterial.content);
      setSelectedNovelId(editMaterial.novelId);
    } else {
      setTitle('');
      setContent('');
      setSelectedNovelId(filteredNovels[0]?.id || 0);
    }
  }, [editMaterial, filteredNovels]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!title.trim()) return;
    const novel = filteredNovels.find((n) => n.id === selectedNovelId);
    if (!novel) return;
    onSave({ title: title.trim(), content: content.trim(), novelId: novel.id, novelTitle: novel.title, type: defaultType });
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="flex flex-col w-[560px] max-w-[90vw] bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{editMaterial ? '编辑资料' : '新增资料'}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">所属作品</label>
            <select value={selectedNovelId} onChange={(e) => setSelectedNovelId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand bg-white">
              {filteredNovels.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
              {filteredNovels.length === 0 && <option value={0}>暂无作品</option>}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">资料标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入资料标题"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">资料内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="输入资料内容..." rows={8}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">取消</button>
          <button onClick={handleSave} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark font-medium">保存</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   主页面
   ═══════════════════════════════════════ */
export default function MaterialsPage() {
  const { novels } = useNovelsContext();
  const { materials, addMaterial, updateMaterial, deleteMaterial, searchMaterials, stats } = useMaterials();
  const { tags, tagsByCategory, categories, importTags, moveTag, deleteTag: deleteTagItem } = useTags();

  // Tab 状态: 'novel' | 'script' | 'all' | 'plot'
  const [mainTab, setMainTab] = useState<'novel' | 'script' | 'all' | 'plot'>('novel');

  // 资料相关状态
  const [selectedNovelId, setSelectedNovelId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

  // 标签相关状态
  const [tagSearch, setTagSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    '主角设定与开局逻辑': true,
    '剧情推进与爽点逻辑': true,
    '社交交互与情感反馈': true,
    '场景、结构与氛围锚点': true,
  });
  const [showUncategorized, setShowUncategorized] = useState(false);
  const [isTagImportOpen, setIsTagImportOpen] = useState(false);

  // 标签移动/删除状态
  const [tagToMove, setTagToMove] = useState<{ id: string; name: string; category: string } | null>(null);
  const [tagToDelete, setTagToDelete] = useState<{ id: string; name: string } | null>(null);

  // 资料数据过滤
  const activeType: 'novel' | 'script' | 'all' = mainTab === 'plot' ? 'all' : mainTab;
  const novelGroups = useMemo(() => {
    const filtered = activeType === 'all' ? novels : novels.filter((n) => n.type === activeType);
    return filtered.map((n) => ({ id: n.id, title: n.title, type: n.type as 'novel' | 'script' }));
  }, [novels, activeType]);

  const filteredMaterials = useMemo(() => {
    return searchMaterials(searchQuery, activeType === 'all' ? 'all' : activeType, selectedNovelId);
  }, [searchMaterials, searchQuery, activeType, selectedNovelId]);

  // 标签筛选后的剧情点（从资料中筛选含标签的）
  const plotMaterials = useMemo(() => {
    const all = mainTab === 'plot' ? materials : [];
    if (showUncategorized) return []; // 未分类模式下不显示普通剧情点
    if (!selectedTag) return all;
    return all.filter(m => {
      const markers = parseContentMarkers(m.content);
      return markers.tags.includes(selectedTag);
    });
  }, [materials, mainTab, selectedTag, showUncategorized]);

  // 未分类的剧情点（没有任何标签标记）
  const uncategorizedMaterials = useMemo(() => {
    const all = mainTab === 'plot' ? materials : [];
    return all.filter(m => {
      const markers = parseContentMarkers(m.content);
      return markers.tags.length === 0;
    });
  }, [materials, mainTab]);

  // 标签搜索过滤
  const filteredTagsByCategory = useMemo(() => {
    if (!tagSearch.trim()) return tagsByCategory;
    const q = tagSearch.toLowerCase();
    const result: Record<string, typeof tags> = {};
    for (const [cat, catTags] of Object.entries(tagsByCategory)) {
      const filtered = catTags.filter(t => t.name.toLowerCase().includes(q));
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [tagsByCategory, tagSearch]);

  // 切换主Tab时重置子状态
  const handleMainTabChange = (tab: typeof mainTab) => {
    setMainTab(tab);
    setSelectedNovelId(null);
    setSearchQuery('');
    setSelectedTag(null);
  };

  // 事件处理
  const handleAdd = useCallback(() => { setEditTarget(null); setIsEditOpen(true); }, []);
  const handleEdit = useCallback((m: Material) => { setEditTarget(m); setIsEditOpen(true); }, []);
  const handleDelete = useCallback(() => {
    if (deleteTargetId !== null) { deleteMaterial(deleteTargetId); setDeleteTargetId(null); }
  }, [deleteTargetId, deleteMaterial]);
  const handleSave = useCallback((data: Parameters<typeof addMaterial>[0]) => {
    if (editTarget) updateMaterial(editTarget.id, data); else addMaterial(data);
    setEditTarget(null);
  }, [editTarget, addMaterial, updateMaterial]);
  const handleSmartImport = useCallback((items: { title: string; content: string; novelId: number; novelTitle: string; type: 'novel' | 'script' }[]) => {
    items.forEach(item => addMaterial(item));
  }, [addMaterial]);

  const novelListForSelect = useMemo(() => {
    // 编辑资料时，如果当前是总资料库或剧情点，默认用小说类型
    const typeFilter = activeType === 'all' ? 'novel' : activeType;
    return novels.filter((n) => n.type === typeFilter).map((n) => ({ id: n.id, title: n.title, type: n.type }));
  }, [novels, activeType]);

  // 剧情点卡片组件
  const PlotPointCard = ({ m }: { m: Material }) => {
    const markers = parseContentMarkers(m.content);
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <h4 className="text-sm font-bold text-gray-800 mb-2">{m.title}</h4>
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 mb-3">{markers.abstract}</p>
        {/* 标签 */}
        {markers.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {markers.tags.slice(0, 5).map(tagName => {
              const tagInfo = tags.find(t => t.name === tagName);
              return (
                <span key={tagName} className="px-1.5 py-0.5 text-[10px] rounded border"
                  style={{ borderColor: tagInfo?.color || '#e5e7eb', color: tagInfo?.color || '#6b7280', backgroundColor: (tagInfo?.color || '#6b7280') + '10' }}>
                  {tagName}
                </span>
              );
            })}
            {markers.tags.length > 5 && <span className="text-[10px] text-gray-400">+{markers.tags.length - 5}</span>}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-[10px] text-gray-400">
            {markers.source && `《${markers.source}》`}
            {markers.rating > 0 && ` ⭐${markers.rating}`}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleEdit(m)} className="text-[11px] text-brand hover:underline"><Pencil className="w-3 h-3 inline" /> 编辑</button>
            <button onClick={() => setDeleteTargetId(m.id)} className="text-[11px] text-red-400 hover:text-red-600 hover:underline"><Trash2 className="w-3 h-3 inline" /> 删除</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ═══ 顶部标题 + 主Tab ═══ */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <h1 className="text-xl font-bold text-gray-900">资料库</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              共 {stats.total} 条资料 · {tags.length} 个标签
            </p>
          </div>
          {/* 主Tab切换 — 与左侧导航栏右边缘对齐 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0 ml-[220px]">
            <button onClick={() => handleMainTabChange('novel')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                mainTab === 'novel' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Book className="w-3.5 h-3.5" /> 小说资料
            </button>
            <button onClick={() => handleMainTabChange('script')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                mainTab === 'script' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <BookOpen className="w-3.5 h-3.5" /> 剧本资料
            </button>
            <button onClick={() => handleMainTabChange('all')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                mainTab === 'all' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <BookOpen className="w-3.5 h-3.5" /> 总资料库
            </button>
            <button onClick={() => handleMainTabChange('plot')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${
                mainTab === 'plot' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Tag className="w-3.5 h-3.5" /> 标签库
            </button>
          </div>

          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              value={mainTab === 'plot' ? tagSearch : searchQuery}
              onChange={(e) => mainTab === 'plot' ? setTagSearch(e.target.value) : setSearchQuery(e.target.value)}
              placeholder={mainTab === 'plot' ? '搜索标签...' : '搜索资料...'}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand w-[170px]"
            />
          </div>

        </div>
      </div>

      {/* ═══ 主体内容 ═══ */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ─── 左侧边栏 ─── */}
        {mainTab === 'plot' ? (
          /* 标签库模式 */
          <aside className="w-[192px] flex flex-col bg-white border-r border-gray-200 overflow-hidden self-stretch min-h-0">
            {/* 标签搜索 */}
            <div className="shrink-0 px-2.5 py-1.5 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                <input type="text" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="搜索标签..."
                  className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-brand" />
              </div>
            </div>

            {/* 全部标签按钮 */}
            <div className="shrink-0 px-2.5 py-1">
              <button onClick={() => { setSelectedTag(null); setPreviewCategory(null); setShowUncategorized(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                  selectedTag === null && previewCategory === null && !showUncategorized ? 'text-white bg-brand font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <span>全部标签</span>
                <span className={`text-xs ${selectedTag === null && previewCategory === null && !showUncategorized ? 'text-white/70' : 'text-gray-400'}`}>{tags.length}</span>
              </button>
            </div>

            {/* 未分类按钮 */}
            <div className="shrink-0 px-2.5 py-0.5">
              <button onClick={() => { setSelectedTag(null); setPreviewCategory(null); setShowUncategorized(true); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                  showUncategorized ? 'text-white bg-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
                  <span>未分类</span>
                </div>
                <span className={`text-xs ${showUncategorized ? 'text-white/70' : 'text-gray-400'}`}>{uncategorizedMaterials.length}</span>
              </button>
            </div>

            <div className="shrink-0 h-px bg-gray-100 mx-2.5" />

            {/* 按分类展开的标签列表 — 可滚动 */}
            <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-1 min-h-0">
              {categories.map(cat => {
                const catTags = filteredTagsByCategory[cat.name] || [];
                if (catTags.length === 0) return null;
                const isExpanded = expandedCategories[cat.name] ?? true;
                const isCatActive = previewCategory === cat.name;

                return (
                  <div key={cat.name}>
                    {/* 分类标题栏 — 蓝色栏样式 */}
                    <div
                      className={`flex items-center gap-1 rounded-md px-2 h-[32px] transition-colors select-none ${isCatActive ? 'bg-brand/15' : 'bg-brand-light hover:bg-brand/10'}`}
                    >
                      {/* 分类名 — 单击预览 */}
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-1.5 text-left min-w-0 cursor-pointer bg-transparent border-0 p-0"
                        onClick={() => { setPreviewCategory(cat.name); setSelectedTag(null); setShowUncategorized(false); }}
                      >
                        <span className={`text-xs font-medium truncate ${isCatActive ? 'text-brand' : 'text-brand-dark'}`}>
                          {cat.name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{catTags.length}</span>
                      </button>
                      {/* 展开/收起文字按钮 */}
                      <button
                        type="button"
                        className="shrink-0 px-1.5 py-0.5 text-[10px] rounded font-medium text-orange-500 hover:text-orange-600 hover:bg-orange-50 cursor-pointer bg-transparent border-0"
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.name]: !(prev[cat.name] ?? true) }))}
                      >
                        {isExpanded ? '收起' : '展开'}
                      </button>
                    </div>
                    {/* 标签列表 */}
                    {isExpanded && (
                      <div className="ml-2 space-y-0.5 mt-0.5">
                        {catTags.map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => { setSelectedTag(tag.name); setPreviewCategory(null); setShowUncategorized(false); }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                              selectedTag === tag.name && !previewCategory
                                ? 'text-orange-600 bg-orange-50 font-medium'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-[11px] truncate">{tag.name.replace(/^#/, '')}</span>
                            <span className={`text-[10px] shrink-0 ml-1 ${selectedTag === tag.name && !previewCategory ? 'text-orange-400' : 'text-gray-300'}`}>{tag.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI 智能导入按钮 — 固定在底部 */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setIsTagImportOpen(true)}
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors cursor-pointer">
                AI 智能导入
              </button>
            </div>
          </aside>
        ) : (
          /* 小说/剧本/总资料库模式：作品分类 */
          <aside className="w-[192px] flex flex-col bg-white border-r border-gray-200 shrink-0 self-stretch min-h-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">
                {activeType === 'all' ? '全部作品' : activeType === 'novel' ? '小说作品' : '剧本作品'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <button onClick={() => setSelectedNovelId(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors ${
                  selectedNovelId === null ? 'text-white bg-brand font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span className="truncate">全部资料</span>
                <span className={`text-xs ${selectedNovelId === null ? 'text-white/70' : 'text-gray-400'}`}>
                  {searchMaterials(searchQuery, 'all', null).length}
                </span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              {/* 总资料库：合并显示所有作品，不区分小说/剧本 */}
              {novelGroups.map((group) => (
                <button key={group.id} onClick={() => setSelectedNovelId(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    selectedNovelId === group.id ? 'text-white bg-brand font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span className="truncate" style={{ maxWidth: '140px' }}>{group.title}</span>
                  <span className={`text-xs ${selectedNovelId === group.id ? 'text-white/70' : 'text-gray-400'}`}>
                    {materials.filter((m) => m.novelId === group.id).length}
                  </span>
                </button>
              ))}
              {novelGroups.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-2">暂无作品</p>
              )}
            </div>
            {/* 导入资料按钮 — 固定在底部 */}
            <div className="shrink-0 px-4 py-2.5 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setIsSmartImportOpen(true)}
                className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors cursor-pointer">
                导入资料
              </button>
            </div>
          </aside>
        )}

        {/* ─── 右侧内容区 ─── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 标签库模式 */}
          {mainTab === 'plot' && (
            <>
              {/* ─── 分类预览 ─── */}
              {previewCategory && (() => {
                const cat = categories.find(c => c.name === previewCategory);
                const catTags = tags.filter(t => t.category === previewCategory);
                if (!cat) return null;
                return (
                  <div className="space-y-3">
                    {/* 分类信息 — 一行显示 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-base font-bold text-gray-900">{cat.name}</span>
                        <span className="text-gray-300">|</span>
                        {cat.description && (
                          <span className="text-sm text-gray-500 italic truncate">
                            {cat.name}：{cat.description}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto shrink-0">{catTags.length} 个标签</span>
                      </div>
                    </div>
                    {/* 该分类下所有标签 — 一行四列 */}
                    <div className="grid grid-cols-4 gap-3">
                      {catTags.map(tag => (
                        <div
                          key={tag.id}
                          className="relative text-left bg-white border border-gray-200 rounded-lg p-2.5 hover:border-orange-300 hover:shadow-sm transition-all group"
                        >
                          {/* 右上角操作按钮 */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setTagToMove({ id: tag.id, name: tag.name, category: tag.category }); }}
                              className="p-1 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 cursor-pointer"
                              title="移动到其他分类"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setTagToDelete({ id: tag.id, name: tag.name }); }}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                              title="删除标签"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {/* 标签内容 — 点击选中 */}
                          <div
                            className="cursor-pointer"
                            onClick={() => { setSelectedTag(tag.name); setPreviewCategory(null); }}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5 pr-8">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-xs font-bold text-gray-800 truncate">{tag.name.replace(/^#/, '')}</span>
                            </div>
                            {tag.description && (
                              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">{tag.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ─── 单标签预览 ─── */}
              {selectedTag && !previewCategory && (() => {
                const tagInfo = tags.find(t => t.name === selectedTag);
                if (!tagInfo) return null;
                return (
                  <div className="relative bg-white border border-gray-200 rounded-lg p-4 group">
                    {/* 右上角操作按钮 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setTagToMove({ id: tagInfo.id, name: tagInfo.name, category: tagInfo.category })}
                        className="p-1.5 rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 cursor-pointer"
                        title="移动到其他分类"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTagToDelete({ id: tagInfo.id, name: tagInfo.name })}
                        className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"
                        title="删除标签"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2 pr-16">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tagInfo.color }} />
                      <h3 className="text-lg font-bold text-gray-900">{tagInfo.name.replace(/^#/, '')}</h3>
                      <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{tagInfo.category}</span>
                    </div>
                    {tagInfo.description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{tagInfo.description}</p>
                    )}
                  </div>
                );
              })()}

              {/* ─── 未分类剧情点列表 ─── */}
              {showUncategorized && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">未分类剧情点</h2>
                    <span className="text-xs text-gray-400">{uncategorizedMaterials.length} 条</span>
                  </div>
                  {uncategorizedMaterials.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Tag className="w-12 h-12 text-gray-200 mb-4" />
                      <p className="text-sm text-gray-500 mb-1">所有剧情点都已分类</p>
                      <p className="text-xs text-gray-400">没有未打标签的剧情点</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {uncategorizedMaterials.map(m => <PlotPointCard key={m.id} m={m} />)}
                    </div>
                  )}
                </div>
              )}

              {/* ─── 剧情点列表 ─── */}
              {!previewCategory && !showUncategorized && (
                plotMaterials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Tag className="w-12 h-12 text-gray-200 mb-4" />
                    <p className="text-sm text-gray-500 mb-1">
                      {selectedTag ? `暂无"${selectedTag}"标签的剧情点` : '暂无剧情点'}
                    </p>
                    <p className="text-xs text-gray-400">资料中的【标签】标记会显示在这里</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {plotMaterials.map(m => <PlotPointCard key={m.id} m={m} />)}
                  </div>
                )
              )}
            </>
          )}

          {/* 小说/剧本资料模式 */}
          {mainTab !== 'plot' && (
            <>
              {filteredMaterials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <BookOpen className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="text-sm text-gray-500 mb-1">
                    {searchQuery ? '未找到匹配的资料' : `暂无${mainTab === 'novel' ? '小说' : '剧本'}资料`}
                  </p>
                  {!searchQuery && (
                    <>
                      <p className="text-xs text-gray-400 mb-4">点击"导入资料"开始添加</p>
                      <button onClick={() => setIsSmartImportOpen(true)}
                        className="flex items-center px-4 py-2 text-sm text-amber-600 border border-amber-400 rounded-md hover:bg-amber-50">
                        导入资料
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredMaterials.map((m) => {
                    const markers = parseContentMarkers(m.content);
                    return (
                      <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col h-full">
                        <div className="mb-2">
                          <span className="text-[10px] text-gray-400 font-medium">摘要：</span>
                          <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 mt-0.5 whitespace-pre-wrap">{markers.abstract}</p>
                        </div>
                        <div className="mb-1">
                          <span className="text-[10px] text-gray-400 font-medium">书名：</span>
                          <span className="text-xs text-gray-700">《{markers.source || m.novelTitle}》</span>
                        </div>
                        <div className="mb-1">
                          <span className="text-[10px] text-gray-400 font-medium">章节：</span>
                          <span className="text-xs text-gray-700">{markers.chapter || `第${m.chapterSerial || '?'}章`}</span>
                        </div>
                        <div className="mb-3">
                          <span className="text-[10px] text-gray-400 font-medium">评分：</span>
                          <span className="text-xs text-gray-700">{markers.rating || m.rating || 0}分</span>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                          <span className="text-[10px] text-gray-400">{m.updatedAt}</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleEdit(m)} className="text-[11px] text-brand hover:underline"><Pencil className="w-3 h-3 inline" /> 编辑</button>
                            <button onClick={() => setDeleteTargetId(m.id)} className="text-[11px] text-red-400 hover:text-red-600 hover:underline"><Trash2 className="w-3 h-3 inline" /> 删除</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ 弹窗 ═══ */}
      <MaterialEditModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditTarget(null); }}
        onSave={handleSave} novels={novelListForSelect} defaultType={activeType === 'all' ? 'novel' : activeType} editMaterial={editTarget} />
      <DeleteConfirmModal isOpen={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} onConfirm={handleDelete} />
      <TagMoveModal
        isOpen={tagToMove !== null}
        onClose={() => setTagToMove(null)}
        onMove={(cat) => { if (tagToMove) moveTag(tagToMove.id, cat); }}
        tag={tagToMove}
        categories={categories}
      />
      <TagDeleteConfirmModal
        isOpen={tagToDelete !== null}
        onClose={() => setTagToDelete(null)}
        onConfirm={() => { if (tagToDelete) deleteTagItem(tagToDelete.id); setTagToDelete(null); }}
        tagName={tagToDelete?.name.replace(/^#/, '') || ''}
      />
      <SmartImportModal isOpen={isSmartImportOpen} onClose={() => setIsSmartImportOpen(false)}
        onImport={handleSmartImport} novels={novels.map(n => ({ id: n.id, title: n.title, type: n.type as 'novel' | 'script' }))} />
      <TagImportModal isOpen={isTagImportOpen} onClose={() => setIsTagImportOpen(false)}
        onImport={(text, cat) => importTags(text, cat)} categories={categories} />
    </div>
  );
}
