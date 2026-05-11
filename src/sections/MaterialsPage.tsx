import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, X, Edit3, Trash2, BookOpen, Book, AlertTriangle, Pencil,
} from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import { useNovelsContext } from '@/hooks/useNovels';
import type { Material } from '@/hooks/useMaterials';
// Layout removed - local app mode

/* ─── 辅助函数：从 content 解析标记 ─── */
function parseContentMarkers(content: string) {
  // 先提取所有元数据标记的位置，然后取中间的内容作为摘要
  const lines = content.split('\n');
  let abstractStart = -1;
  let abstractEnd = lines.length;

  // 找【摘要】行
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('【摘要】')) {
      abstractStart = i;
      break;
    }
  }

  // 找第一个元数据标记行（【出处】【评分】【标签】等）
  const metaMarkers = ['【出处】', '【评分】', '【标签】', '【章节】'];
  for (let i = 0; i < lines.length; i++) {
    if (metaMarkers.some((m) => lines[i].startsWith(m))) {
      if (abstractStart === -1 || i > abstractStart) {
        abstractEnd = i;
        break;
      }
    }
  }

  // 提取摘要内容
  let abstract = '';
  if (abstractStart >= 0) {
    // 从【摘要】行后面开始取
    const startLine = abstractStart + 1;
    abstract = lines.slice(startLine, abstractEnd).join('\n').trim();
  } else {
    // 没有【摘要】标记，取开头到第一个元数据之间的内容
    abstract = lines.slice(0, abstractEnd).join('\n').trim();
  }

  // 提取【出处】《书名》-第X章
  const sourceMatch = content.match(/【出处】《([^》]+)》-(第[\d一二三四五六七八九十百]+章(?:\(或第[\d-]+章\))?)/);
  // 提取【评分】数字（支持"95分"或"80"格式）
  const ratingMatch = content.match(/【评分】\s*(\d+)分?/);

  return {
    abstract,
    source: sourceMatch ? sourceMatch[1] : '',
    chapter: sourceMatch ? sourceMatch[2] : '',
    rating: ratingMatch ? parseInt(ratingMatch[1], 10) : 0,
    body: abstract,
  };
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

/* ─── 资料编辑弹窗 ─── */
function MaterialEditModal({ isOpen, onClose, onSave, novels, defaultType, editMaterial }: {
  isOpen: boolean; onClose: () => void; onSave: (data: { title: string; content: string; novelId: number; novelTitle: string; type: 'novel' | 'script' }) => void;
  novels: { id: number; title: string; type: 'novel' | 'script' }[]; defaultType: 'novel' | 'script'; editMaterial?: Material | null;
}) {
  const filteredNovels = novels.filter((n) => n.type === defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedNovelId, setSelectedNovelId] = useState<number>(filteredNovels[0]?.id || 0);

  // 用 useEffect 监听 editMaterial 变化，正确回填数据
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
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
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
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="输入资料标题"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">资料内容</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="输入资料内容..."
              rows={8}
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

export default function MaterialsPage() {
  const { novels } = useNovelsContext();
  const { materials, addMaterial, updateMaterial, deleteMaterial, searchMaterials, stats } = useMaterials();

  const [activeType, setActiveType] = useState<'novel' | 'script'>('novel');
  const [viewMode, setViewMode] = useState<'type' | 'all'>('type');
  const [selectedNovelId, setSelectedNovelId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 从作品列表（novels）读取所有作品，而非仅从已有资料中过滤
  const novelGroups = useMemo(() => {
    if (viewMode === 'all') return novels.map((n) => ({ id: n.id, title: n.title }));
    return novels.filter((n) => n.type === activeType).map((n) => ({ id: n.id, title: n.title }));
  }, [novels, activeType, viewMode]);

  const filteredMaterials = useMemo(() => {
    if (viewMode === 'all') return searchMaterials(searchQuery, 'all', selectedNovelId);
    return searchMaterials(searchQuery, activeType, selectedNovelId);
  }, [searchMaterials, searchQuery, activeType, selectedNovelId, viewMode]);

  const handleAdd = useCallback(() => {
    setEditTarget(null);
    setIsEditOpen(true);
  }, []);

  const handleEdit = useCallback((m: Material) => {
    setEditTarget(m);
    setIsEditOpen(true);
  }, []);

  const handleSave = useCallback((data: { title: string; content: string; novelId: number; novelTitle: string; type: 'novel' | 'script' }) => {
    if (editTarget) {
      updateMaterial(editTarget.id, data);
    } else {
      addMaterial(data);
    }
    setEditTarget(null);
  }, [editTarget, addMaterial, updateMaterial]);

  const handleDelete = useCallback(() => {
    if (deleteTargetId !== null) {
      deleteMaterial(deleteTargetId);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, deleteMaterial]);

  const novelListForSelect = useMemo(() => {
    return novels.filter((n) => n.type === activeType).map((n) => ({ id: n.id, title: n.title, type: n.type }));
  }, [novels, activeType]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <main className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        {/* 顶部标题 + 类型切换 */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">资料库</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              共 {stats.novelCount} 条小说资料 / {stats.scriptCount} 条剧本资料
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 视图切换 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => { setViewMode('type'); setActiveType('novel'); setSelectedNovelId(null); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
                  viewMode === 'type' && activeType === 'novel' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Book className="w-3.5 h-3.5" /> 小说资料
              </button>
              <button onClick={() => { setViewMode('type'); setActiveType('script'); setSelectedNovelId(null); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
                  viewMode === 'type' && activeType === 'script' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <BookOpen className="w-3.5 h-3.5" /> 剧本资料
              </button>
              <button onClick={() => { setViewMode('all'); setSelectedNovelId(null); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
                  viewMode === 'all' ? 'text-white bg-brand font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <BookOpen className="w-3.5 h-3.5" /> 总资料库
              </button>
            </div>
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索资料..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand w-[200px]" />
            </div>
            {/* 新增 */}
            <button onClick={handleAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">
              <Plus className="w-4 h-4" /> 新增资料
            </button>
          </div>
        </div>

        {/* 主体区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧作品分类 */}
          <aside className="w-[200px] flex flex-col bg-white border-r border-gray-200 shrink-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">作品分类</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {/* 全部资料 */}
              <button onClick={() => setSelectedNovelId(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors ${
                  selectedNovelId === null
                    ? 'text-white bg-brand font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span className="truncate">全部资料</span>
                <span className={`text-xs ${selectedNovelId === null ? 'text-white/70' : 'text-gray-400'}`}>
                  {searchMaterials('', activeType, null).length}
                </span>
              </button>
              <div className="h-px bg-gray-100 my-1" />
              {/* 各作品分类 */}
              {novelGroups.map((group) => (
                <button key={group.id} onClick={() => setSelectedNovelId(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    selectedNovelId === group.id
                      ? 'text-white bg-brand font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span className="line-clamp-2 text-left break-all" style={{ maxWidth: '140px' }}>{group.title.length > 20 ? group.title.slice(0, 20) + '...' : group.title}</span>
                  <span className={`text-xs ${selectedNovelId === group.id ? 'text-white/70' : 'text-gray-400'}`}>
                    {materials.filter((m) => m.type === activeType && m.novelId === group.id).length}
                  </span>
                </button>
              ))}
              {novelGroups.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-2">暂无作品，请先创建{activeType === 'novel' ? '小说' : '剧本'}</p>
              )}
            </div>
          </aside>

          {/* 右侧资料列表 */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredMaterials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <BookOpen className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-sm text-gray-500 mb-1">
                  {searchQuery ? '未找到匹配的资料' : `暂无${activeType === 'novel' ? '小说' : '剧本'}资料`}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-gray-400 mb-4">点击右上角"新增资料"开始添加</p>
                )}
                {!searchQuery && (
                  <button onClick={handleAdd}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-brand border border-brand rounded-md hover:bg-brand-light transition-colors">
                    <Plus className="w-4 h-4" /> 新增资料
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {filteredMaterials.map((m) => {
                  const markers = parseContentMarkers(m.content);
                  return (
                    <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col h-full">
                      {/* 摘要（直接显示内容，不显示标记） */}
                      <div className="mb-2">
                        <span className="text-[10px] text-gray-400 font-medium">摘要：</span>
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 mt-0.5 whitespace-pre-wrap">{markers.abstract}</p>
                      </div>
                      {/* 书名（从 content 解析） */}
                      <div className="mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">书名：</span>
                        <span className="text-xs text-gray-700">《{markers.source || m.novelTitle}》</span>
                      </div>
                      {/* 章节（从 content 解析） */}
                      <div className="mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">章节：</span>
                        <span className="text-xs text-gray-700">{markers.chapter || `第${m.chapterSerial || '?'}章`}</span>
                      </div>
                      {/* 评分（从 content 解析） */}
                      <div className="mb-3">
                        <span className="text-[10px] text-gray-400 font-medium">评分：</span>
                        <span className="text-xs text-gray-700">{markers.rating || m.rating || 0}分</span>
                      </div>
                      {/* 底部：左日期 + 右编辑/删除文字按钮 */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400">{m.updatedAt}</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleEdit(m)}
                            className="text-[11px] text-brand hover:underline flex items-center gap-0.5">
                            <Pencil className="w-3 h-3" />
                            编辑
                          </button>
                          <button onClick={() => setDeleteTargetId(m.id)}
                            className="text-[11px] text-red-400 hover:text-red-600 hover:underline flex items-center gap-0.5">
                            <Trash2 className="w-3 h-3" />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 弹窗 */}
      <MaterialEditModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setEditTarget(null); }}
        onSave={handleSave} novels={novelListForSelect} defaultType={activeType} editMaterial={editTarget} />
      <DeleteConfirmModal isOpen={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete} />
    </div>
  );
}
