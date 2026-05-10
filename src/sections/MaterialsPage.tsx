import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Search, X, Edit3, Trash2, BookOpen, Book, AlertTriangle,
} from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import { useNovelsContext } from '@/hooks/useNovels';
import type { Material } from '@/hooks/useMaterials';
// Layout removed - local app mode

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
                  // 去掉内容开头的来源标记，只保留正文
                  const cleanContent = m.content.replace(/^【来源：[^】]+】\n\n/, '');
                  return (
                    <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow flex flex-col h-full">
                      {/* 第一行：书名 */}
                      <div className="text-xs text-gray-500 mb-0.5">
                        <span className="text-gray-400">书名：</span>
                        <span className="text-gray-700 font-medium">{m.novelTitle}</span>
                      </div>
                      {/* 第二行：章节 */}
                      <div className="text-xs text-gray-500 mb-1.5">
                        <span className="text-gray-400">章节：</span>
                        <span className="text-gray-700">
                          第{m.chapterSerial || '?'}章{m.chapterName ? ` ${m.chapterName}` : ''}
                        </span>
                      </div>
                      {/* 第三行：剧情点标签 */}
                      <div className="text-xs text-gray-500 mb-0.5">
                        <span className="text-gray-400">剧情点：</span>
                      </div>
                      {/* 提炼正文 */}
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-6 mb-2 whitespace-pre-wrap flex-1">{cleanContent}</p>
                      {/* 底部：操作按钮 + 时间 */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => handleEdit(m)}
                            className="p-1 text-gray-400 hover:text-brand hover:bg-brand-light rounded transition-colors">
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button onClick={() => setDeleteTargetId(m.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-400">{m.updatedAt}</span>
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
