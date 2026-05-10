import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  X,
  Bot,
  User,
  Send,
  Square,
} from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';
import ModelManageModal from './ModelManageModal';

/* ─── 思考中省略号动画组件（1→2→3→1 循环） ─── */
function ThinkingDots({ className = '' }: { className?: string }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span>AI正在思考中</span>
      <span className="inline-flex ml-0.5 w-3">
        {dotCount >= 1 && <span className="w-0.5 h-0.5 rounded-full bg-current inline-block" />}
        {dotCount >= 2 && <span className="w-0.5 h-0.5 rounded-full bg-current inline-block ml-[2px]" />}
        {dotCount >= 3 && <span className="w-0.5 h-0.5 rounded-full bg-current inline-block ml-[2px]" />}
      </span>
    </span>
  );
}

type SettingsTab = '角色' | '设定' | '伏笔';

interface Category {
  id: string;
  name: string;
  isExpanded: boolean;
  isDefault: boolean;
}

interface RoleItem {
  id: string;
  name: string;
  type: string;
  background: string;
  status: string;
  categoryId: string;
}

interface SettingItem {
  id: string;
  name: string;
  content: string;
  categoryId: string;
}

interface ForeshadowItem {
  id: string;
  name: string;
  content: string;
  categoryId: string;
  chapter?: string;
}

// ─── AI 类型 ───
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}
interface Conversation {
  id: string;
  name: string;
  messages: ChatMessage[];
}
interface TabChatState {
  conversations: Conversation[];
  currentConvId: string;
  promptScope: 'public' | 'private';
  selectedPrompt: string;
  inputText: string;
  isGenerating: boolean;
}

const DEFAULT_CATEGORY_ID = 'default';
const STORAGE_KEY_CATEGORIES = 'settings_categories_v2';
const STORAGE_KEY_ITEMS = 'settings_items_v2';

// ─── 角色分类 → 分类ID 映射 ───
const typeToCategoryMap: Record<string, string> = {
  '主角': 'cat-男女主',
  '女主': 'cat-男女主',
  '正派配角': 'cat-正派配角',
  '重要反派': 'cat-重要反派',
  '反派配角': 'cat-反派配角',
  '龙套': 'cat-龙套',
};

function getDefaultCategories(tab: SettingsTab): Category[] {
  if (tab === '角色') {
    return [
      { id: 'cat-男女主', name: '男女主', isExpanded: true, isDefault: false },
      { id: 'cat-正派配角', name: '正派配角', isExpanded: true, isDefault: false },
      { id: 'cat-重要反派', name: '重要反派', isExpanded: true, isDefault: false },
      { id: 'cat-反派配角', name: '反派配角', isExpanded: true, isDefault: false },
      { id: 'cat-龙套', name: '龙套', isExpanded: true, isDefault: false },
      { id: DEFAULT_CATEGORY_ID, name: '未分类', isExpanded: true, isDefault: true },
    ];
  }
  if (tab === '设定') {
    return [
      { id: 'cat-核心设定', name: '核心设定', isExpanded: true, isDefault: false },
      { id: 'cat-境界体系', name: '境界体系', isExpanded: true, isDefault: false },
      { id: 'cat-其他设定', name: '其他设定', isExpanded: true, isDefault: false },
      { id: DEFAULT_CATEGORY_ID, name: '未分类', isExpanded: true, isDefault: true },
    ];
  }
  if (tab === '伏笔') {
    return [
      { id: 'cat-长期伏笔', name: '长期伏笔', isExpanded: true, isDefault: false },
      { id: 'cat-短期伏笔', name: '短期伏笔', isExpanded: true, isDefault: false },
    ];
  }
  return [{ id: DEFAULT_CATEGORY_ID, name: '未分类', isExpanded: true, isDefault: true }];
}

function loadCategories(novelId: number, tab: SettingsTab): Category[] {
  const defaults = getDefaultCategories(tab);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (raw) {
      const data = JSON.parse(raw);
      const key = `${novelId}_${tab}`;
      if (data[key] && data[key].length > 0) {
        const saved = data[key] as Category[];
        if (saved.length === 1 && saved[0].isDefault) return defaults;
        return saved;
      }
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveCategories(novelId: number, tab: SettingsTab, categories: Category[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    const data = raw ? JSON.parse(raw) : {};
    data[`${novelId}_${tab}`] = categories;
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(data));
  } catch { /* ignore */ }
}

function loadItems<T>(novelId: number, tab: SettingsTab): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (raw) {
      const data = JSON.parse(raw);
      const key = `${novelId}_${tab}`;
      if (data[key]) return data[key];
    }
  } catch { /* ignore */ }
  return [];
}

function saveItems<T>(novelId: number, tab: SettingsTab, items: T[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    const data = raw ? JSON.parse(raw) : {};
    data[`${novelId}_${tab}`] = items;
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(data));
  } catch { /* ignore */ }
}

function createDefaultChatState(): TabChatState {
  return {
    conversations: [{ id: 'conv-1', name: '对话 1', messages: [] }],
    currentConvId: 'conv-1',
    promptScope: 'private',
    selectedPrompt: '',
    inputText: '',
    isGenerating: false,
  };
}

// ─── 角色编辑弹窗 ───
function RoleEditModal({ isOpen, onClose, onSave, initialData }: {
  isOpen: boolean; onClose: () => void; onSave: (role: RoleItem) => void; initialData?: RoleItem;
}) {
  const [form, setForm] = useState({ name: '', type: '', background: '', status: '' });
  useEffect(() => {
    if (initialData) setForm({ name: initialData.name, type: initialData.type, background: initialData.background, status: initialData.status });
    else setForm({ name: '', type: '', background: '', status: '' });
  }, [initialData, isOpen]);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      id: initialData?.id ?? Date.now().toString(),
      name: form.name.trim(),
      type: form.type.trim(),
      background: form.background.trim(),
      status: form.status.trim(),
      categoryId: initialData?.categoryId ?? DEFAULT_CATEGORY_ID,
    });
    setForm({ name: '', type: '', background: '', status: '' });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">{initialData ? '编辑角色' : '新增角色'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色名</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入角色名" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">角色分类</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['主角','女主','正派配角'].map((opt) => (
                <button key={opt} type="button" onClick={() => setForm({ ...form, type: opt })}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-all ${form.type === opt ? 'bg-brand text-white border-brand' : 'text-brand border-brand/30 hover:bg-brand-light'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {['重要反派','反派配角','龙套'].map((opt) => (
                <button key={opt} type="button" onClick={() => setForm({ ...form, type: opt })}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-all ${form.type === opt ? (opt === '龙套' ? 'bg-gray-500 text-white border-gray-500' : 'bg-red-500 text-white border-red-500') : (opt === '龙套' ? 'text-gray-500 border-gray-200 hover:bg-gray-50' : 'text-red-500 border-red-200 hover:bg-red-50')}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色背景</label>
            <textarea value={form.background} onChange={(e) => setForm({ ...form, background: e.target.value })} placeholder="请输入角色背景故事" rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色状态</label>
            <input type="text" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} placeholder="如：存活、死亡、失踪等" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.name.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">确认</button>
        </div>
      </div>
    </div>
  );
}

// ─── 伏笔编辑弹窗 ───
function ForeshadowEditModal({ isOpen, onClose, onSave, initialData }: {
  isOpen: boolean; onClose: () => void; onSave: (item: ForeshadowItem) => void; initialData?: ForeshadowItem;
}) {
  const [form, setForm] = useState({ name: '', content: '', categoryId: 'cat-长期伏笔', chapter: '' });
  useEffect(() => {
    if (initialData) setForm({ name: initialData.name, content: initialData.content, categoryId: initialData.categoryId, chapter: initialData.chapter ?? '' });
    else setForm({ name: '', content: '', categoryId: 'cat-长期伏笔', chapter: '' });
  }, [initialData, isOpen]);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      id: initialData?.id ?? Date.now().toString(),
      name: form.name.trim(),
      content: form.content.trim(),
      categoryId: form.categoryId,
      chapter: form.chapter.trim(),
    });
    setForm({ name: '', content: '', categoryId: 'cat-长期伏笔', chapter: '' });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">{initialData ? '编辑伏笔' : '新增伏笔'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">伏笔名称</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入伏笔名称" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">伏笔类型</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '长期伏笔', catId: 'cat-长期伏笔' },
                { label: '短期伏笔', catId: 'cat-短期伏笔' },
              ].map((opt) => (
                <button key={opt.catId} type="button"
                  onClick={() => setForm({ ...form, categoryId: opt.catId })}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                    form.categoryId === opt.catId
                      ? 'bg-brand text-white border-brand'
                      : 'text-brand border-brand/30 hover:bg-brand-light'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">出现章节</label>
            <input type="text" value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="如：第5章、第10章等" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">伏笔内容</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="请输入伏笔内容描述" rows={6} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.name.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">确认</button>
        </div>
      </div>
    </div>
  );
}

// ─── 设定编辑弹窗 ───
function SettingEditModal({ isOpen, onClose, onSave, initialData }: {
  isOpen: boolean; onClose: () => void; onSave: (item: SettingItem) => void; initialData?: SettingItem;
}) {
  const [form, setForm] = useState({ name: '', content: '', categoryId: DEFAULT_CATEGORY_ID });
  useEffect(() => {
    if (initialData) setForm({ name: initialData.name, content: initialData.content, categoryId: initialData.categoryId });
    else setForm({ name: '', content: '', categoryId: DEFAULT_CATEGORY_ID });
  }, [initialData, isOpen]);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      id: initialData?.id ?? Date.now().toString(),
      name: form.name.trim(),
      content: form.content.trim(),
      categoryId: form.categoryId,
    });
    setForm({ name: '', content: '', categoryId: DEFAULT_CATEGORY_ID });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[520px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">{initialData ? '编辑设定' : '新增设定'}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设定名称</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入设定名称" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">设定分类</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '核心设定', catId: 'cat-核心设定' },
                { label: '境界体系', catId: 'cat-境界体系' },
                { label: '其他设定', catId: 'cat-其他设定' },
                { label: '未分类', catId: DEFAULT_CATEGORY_ID },
              ].map((opt) => (
                <button key={opt.catId} type="button"
                  onClick={() => setForm({ ...form, categoryId: opt.catId })}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                    form.categoryId === opt.catId
                      ? 'bg-brand text-white border-brand'
                      : 'text-brand border-brand/30 hover:bg-brand-light'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设定内容</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="请输入设定内容" rows={8} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400 resize-y" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.name.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors">确认</button>
        </div>
      </div>
    </div>
  );
}

// ─── 主组件 ───
export default function SettingsData({ activeTab }: { activeTab: SettingsTab }) {
  const { currentNovelId } = useNovelsContext();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isForeshadowModalOpen, setIsForeshadowModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isModelManageOpen, setIsModelManageOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedSettingId, setSelectedSettingId] = useState<string | null>(null);
  const [selectedForeshadowId, setSelectedForeshadowId] = useState<string | null>(null);
  const [isAssociated, setIsAssociated] = useState(false);

  // 分类数据
  const [roleCategories, setRoleCategories] = useState<Category[]>(() => loadCategories(currentNovelId, '角色'));
  const [settingCategories, setSettingCategories] = useState<Category[]>(() => loadCategories(currentNovelId, '设定'));
  const [foreshadowCategories, setForeshadowCategories] = useState<Category[]>(() => loadCategories(currentNovelId, '伏笔'));

  // 条目数据
  const [roles, setRoles] = useState<RoleItem[]>(() => loadItems<RoleItem>(currentNovelId, '角色'));
  const [settings, setSettings] = useState<SettingItem[]>(() => loadItems<SettingItem>(currentNovelId, '设定'));
  const [foreshadows, setForeshadows] = useState<ForeshadowItem[]>(() => loadItems<ForeshadowItem>(currentNovelId, '伏笔'));

  // ─── 每个标签独立的AI对话状态 ───
  const [chatStates, setChatStates] = useState<Record<SettingsTab, TabChatState>>({
    '角色': createDefaultChatState(),
    '设定': createDefaultChatState(),
    '伏笔': createDefaultChatState(),
  });

  // 模型选择
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const loadModels = () => {
      try {
        const raw = localStorage.getItem('api_settings_v2');
        if (raw) {
          const data = JSON.parse(raw);
          const list = (data.models || [])
            .filter((m: { enabled?: boolean }) => m.enabled !== false)
            .map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }));
          setModels(list);
          if (list.length > 0 && !selectedModel) setSelectedModel(list[0].id);
        }
      } catch { /* ignore */ }
    };
    loadModels();
    window.addEventListener('api_settings_updated', loadModels);
    return () => window.removeEventListener('api_settings_updated', loadModels);
  }, []);

  // 自动保存
  useEffect(() => { saveCategories(currentNovelId, '角色', roleCategories); }, [roleCategories, currentNovelId]);
  useEffect(() => { saveCategories(currentNovelId, '设定', settingCategories); }, [settingCategories, currentNovelId]);
  useEffect(() => { saveCategories(currentNovelId, '伏笔', foreshadowCategories); }, [foreshadowCategories, currentNovelId]);
  useEffect(() => { saveItems(currentNovelId, '角色', roles); }, [roles, currentNovelId]);
  useEffect(() => { saveItems(currentNovelId, '设定', settings); }, [settings, currentNovelId]);
  useEffect(() => { saveItems(currentNovelId, '伏笔', foreshadows); }, [foreshadows, currentNovelId]);

  // 从 localStorage 恢复选中的条目ID
  useEffect(() => {
    try {
      const key = `settings_selected_${currentNovelId}_${activeTab}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        if (activeTab === '角色') setSelectedRoleId(saved);
        else if (activeTab === '设定') setSelectedSettingId(saved);
        else setSelectedForeshadowId(saved);
      } else {
        setSelectedRoleId(null); setSelectedSettingId(null); setSelectedForeshadowId(null);
      }
    } catch { setSelectedRoleId(null); setSelectedSettingId(null); setSelectedForeshadowId(null); }
    setIsAssociated(false);
  }, [activeTab, currentNovelId]);

  // 选中条目时持久化
  useEffect(() => {
    try {
      const key = `settings_selected_${currentNovelId}_${activeTab}`;
      const id = activeTab === '角色' ? selectedRoleId : activeTab === '设定' ? selectedSettingId : selectedForeshadowId;
      if (id) localStorage.setItem(key, id);
      else localStorage.removeItem(key);
    } catch { /* ignore */ }
  }, [selectedRoleId, selectedSettingId, selectedForeshadowId, activeTab, currentNovelId]);

  // 当前标签的AI状态
  const cs = chatStates[activeTab];
  const currentConv = cs.conversations.find((c) => c.id === cs.currentConvId) ?? cs.conversations[0];
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const updateChatState = (partial: Partial<TabChatState>) => {
    setChatStates((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], ...partial } }));
  };

  const getCategories = (): Category[] => {
    if (activeTab === '角色') return roleCategories;
    if (activeTab === '设定') return settingCategories;
    return foreshadowCategories;
  };
  const setCats = (fn: React.SetStateAction<Category[]>) => {
    if (activeTab === '角色') setRoleCategories(fn);
    else if (activeTab === '设定') setSettingCategories(fn);
    else setForeshadowCategories(fn);
  };
  const toggleCategory = (catId: string) => {
    setCats((prev) => prev.map((c) => c.id === catId ? { ...c, isExpanded: !c.isExpanded } : c));
  };
  const getItemsForCategory = (catId: string) => {
    if (activeTab === '角色') return roles.filter((r) => r.categoryId === catId);
    if (activeTab === '设定') return settings.filter((s) => s.categoryId === catId);
    return foreshadows.filter((f) => f.categoryId === catId);
  };

  const handleAddRole = (role: RoleItem) => { setRoles((prev) => [...prev, role]); };
  const handleAddSetting = (item: SettingItem) => { setSettings((prev) => [...prev, item]); };

  const handleAdd = () => {
    if (activeTab === '角色') setIsRoleModalOpen(true);
    else if (activeTab === '设定') setIsSettingModalOpen(true);
    else if (activeTab === '伏笔') setIsForeshadowModalOpen(true);
  };
  const handleAddForeshadow = (item: ForeshadowItem) => { setForeshadows((prev) => [...prev, item]); };
  const handleDeleteItem = () => {
    if (activeTab === '角色' && selectedRoleId) {
      setRoles((prev) => prev.filter((r) => r.id !== selectedRoleId));
      setSelectedRoleId(null);
    } else if (activeTab === '设定' && selectedSettingId) {
      setSettings((prev) => prev.filter((s) => s.id !== selectedSettingId));
      setSelectedSettingId(null);
    } else if (activeTab === '伏笔' && selectedForeshadowId) {
      setForeshadows((prev) => prev.filter((f) => f.id !== selectedForeshadowId));
      setSelectedForeshadowId(null);
    }
  };

  const hasSelectedItem = activeTab === '角色'
    ? !!selectedRoleId
    : activeTab === '设定'
      ? !!selectedSettingId
      : !!selectedForeshadowId;

  const handleAddCategory = () => {
    if (!newTypeName.trim()) return;
    const newCat: Category = { id: Date.now().toString(), name: newTypeName.trim(), isExpanded: true, isDefault: false };
    setCats((prev) => {
      const defaultIdx = prev.findIndex((c) => c.isDefault);
      if (defaultIdx === -1) return [...prev, newCat];
      const next = [...prev]; next.splice(defaultIdx, 0, newCat); return next;
    });
    setNewTypeName(''); setIsTypeModalOpen(false);
  };
  const handleDeleteCategory = (catId: string) => {
    const cat = getCategories().find((c) => c.id === catId);
    if (cat?.isDefault) return;
    if (activeTab === '角色') setRoles((prev) => prev.filter((r) => r.categoryId !== catId));
    else if (activeTab === '设定') setSettings((prev) => prev.filter((s) => s.categoryId !== catId));
    else setForeshadows((prev) => prev.filter((f) => f.categoryId !== catId));
    setCats((prev) => prev.filter((c) => c.id !== catId));
  };

  const handleUpdateRole = (updated: RoleItem) => {
    if (updated.type && typeToCategoryMap[updated.type]) {
      updated = { ...updated, categoryId: typeToCategoryMap[updated.type] };
    }
    setRoles((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };
  // 设定分类 → 分类ID 映射
  const settingTypeToCategoryMap: Record<string, string> = {
    '核心设定': 'cat-核心设定',
    '境界体系': 'cat-境界体系',
    '其他设定': 'cat-其他设定',
  };

  const handleUpdateSetting = (updated: SettingItem) => {
    if (updated.categoryId && settingTypeToCategoryMap[updated.categoryId]) {
      // categoryId 已经是分类ID，无需映射
    }
    setSettings((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  };

  const handleUpdateForeshadow = (updated: ForeshadowItem) => {
    setForeshadows((prev) => prev.map((f) => f.id === updated.id ? updated : f));
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;
  const selectedSetting = settings.find((s) => s.id === selectedSettingId) ?? null;
  const selectedForeshadow = foreshadows.find((f) => f.id === selectedForeshadowId) ?? null;
  const promptOptions = ['角色生成', '世界观构建', '剧情辅助', '我的角色提示1', '我的角色提示2', '我的角色提示3'];

  // ─── AI 操作 ───
  const handleNewConversation = () => {
    const s = chatStates[activeTab];
    if (s.conversations.length >= 20) return; // 上限20个
    const newConv: Conversation = { id: `conv-${Date.now()}`, name: `对话 ${s.conversations.length + 1}`, messages: [] };
    updateChatState({ conversations: [...s.conversations, newConv], currentConvId: newConv.id });
  };
  const handleDeleteCurrentConversation = () => {
    const s = chatStates[activeTab];
    if (s.conversations.length <= 1) return; // 至少保留1个
    const nextConvs = s.conversations.filter((c) => c.id !== s.currentConvId);
    updateChatState({ conversations: nextConvs, currentConvId: nextConvs[0].id });
  };
  const handleResetConversations = () => {
    const defaultConv: Conversation = { id: 'conv-1', name: '对话 1', messages: [] };
    updateChatState({ conversations: [defaultConv], currentConvId: 'conv-1' });
  };
  // 调用真实模型 API
  const callModelAPI = async (content: string, modelId: string): Promise<string> => {
    try {
      const raw = localStorage.getItem('api_settings_v2');
      if (!raw) return '【错误】未配置模型，请先在模型管理中配置。';
      const data = JSON.parse(raw);
      const model = data.models?.find((m: any) => m.id === modelId && m.enabled);
      if (!model) return '【错误】选中的模型未找到或未启用。';
      if (!model.baseUrl || !model.apiKey) return '【错误】模型配置不完整，缺少 Base URL 或 API Key。';

      const baseUrl = model.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [{ role: 'user', content }],
          stream: false,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return `【错误】模型请求失败 (${response.status}): ${err.slice(0, 200)}`;
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || '【错误】模型返回内容为空。';
    } catch (err: any) {
      return `【错误】请求异常: ${err.message || String(err)}`;
    }
  };

  const handleSend = async () => {
    if (!cs.inputText.trim()) return;
    const displayText = cs.inputText.trim();
    // API调用时携带隐藏的上下文
    let apiContent = displayText;
    if (isAssociated) {
      if (activeTab === '角色' && selectedRole) {
        const info = `【当前角色信息】\n角色名：${selectedRole.name}\n角色分类：${selectedRole.type || '未设置'}\n角色背景：${selectedRole.background || '未设置'}\n角色状态：${selectedRole.status || '未设置'}`;
        apiContent = `${info}\n\n【用户问题】${displayText}`;
      } else if (activeTab === '设定' && selectedSetting) {
        const info = `【当前设定信息】\n设定名称：${selectedSetting.name}\n设定分类：${selectedSetting.categoryId || '未分类'}\n设定内容：${selectedSetting.content || '无'}`;
        apiContent = `${info}\n\n【用户问题】${displayText}`;
      } else if (activeTab === '伏笔' && selectedForeshadow) {
        const info = `【当前伏笔信息】\n伏笔名称：${selectedForeshadow.name}\n出现章节：${selectedForeshadow.chapter || '未设置'}\n伏笔内容：${selectedForeshadow.content || '无'}`;
        apiContent = `${info}\n\n【用户问题】${displayText}`;
      }
    }
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: displayText };
    const assistantId = `a-${Date.now()}`;
    updateChatState({
      conversations: cs.conversations.map((c) => c.id === cs.currentConvId ? { ...c, messages: [...c.messages, userMsg, { id: assistantId, role: 'assistant', content: '__THINKING__', isStreaming: true }] } : c),
      inputText: '', isGenerating: true,
    });

    const reply = await callModelAPI(apiContent, selectedModel);

    setChatStates((prev) => {
      const tabState = prev[activeTab];
      return {
        ...prev,
        [activeTab]: {
          ...tabState,
          conversations: tabState.conversations.map((c) =>
            c.id === tabState.currentConvId ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: reply, isStreaming: false } : m
              ),
            } : c
          ),
          isGenerating: false,
        },
      };
    });
  };
  const handleStop = () => updateChatState({ isGenerating: false });
  const handleDeleteMessage = (msgId: string) => updateChatState({ conversations: cs.conversations.map((c) => c.id === cs.currentConvId ? { ...c, messages: c.messages.filter((m) => m.id !== msgId) } : c) });

  // 消息变化时自动滚动到底部
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentConv.messages]);

  const handleAssociate = () => {
    if (activeTab === '角色' && selectedRole) {
      setIsAssociated((prev) => !prev);
    } else if (activeTab === '设定' && selectedSetting) {
      setIsAssociated((prev) => !prev);
    } else if (activeTab === '伏笔' && selectedForeshadow) {
      setIsAssociated((prev) => !prev);
    }
  };

  const renderCategoryList = () => {
    // 伏笔直接平铺，不按分类显示
    if (activeTab === '伏笔') {
      if (foreshadows.length === 0) return <div className="px-3 py-2 text-xs text-gray-400">暂无伏笔</div>;
      return foreshadows.map((f) => (
        <button key={f.id} onClick={() => setSelectedForeshadowId(f.id)}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors text-sm ${selectedForeshadowId === f.id ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
          <span className="truncate">{f.name}</span>
        </button>
      ));
    }
    return getCategories().map((cat) => (
      <div key={cat.id} className="mb-0.5">
        <div className="flex items-center gap-1 rounded-md bg-brand-light hover:bg-brand/10 transition-colors px-2 py-1.5">
          <button onClick={() => toggleCategory(cat.id)} className="flex items-center gap-1.5 flex-1 text-left">
            {cat.isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-brand-dark" /> : <ChevronRight className="w-3.5 h-3.5 text-brand-dark" />}
            <span className="text-sm font-medium text-brand-dark">{cat.name}</span>
            <span className="text-xs text-gray-400 ml-1">{getItemsForCategory(cat.id).length}{activeTab === '角色' ? '人' : '条'}</span>
          </button>
          {!cat.isDefault && (
            <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="删除分类">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {cat.isExpanded && (
          <div className="mt-0.5 ml-1 space-y-0.5">
            {(() => {
              const items = getItemsForCategory(cat.id);
              if (activeTab === '角色') {
                const ri = items as RoleItem[];
                if (ri.length === 0) return <div className="px-3 py-2 text-xs text-gray-400">暂无角色</div>;
                return ri.map((role) => (
                  <button key={role.id} onClick={() => setSelectedRoleId(role.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors ${selectedRoleId === role.id ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span className="text-sm truncate">{role.name}</span>
                  </button>
                ));
              }
              if (activeTab === '设定') {
                const si = items as SettingItem[];
                if (si.length === 0) return <div className="px-3 py-2 text-xs text-gray-400">暂无设定</div>;
                return si.map((s) => (
                  <button key={s.id} onClick={() => setSelectedSettingId(s.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors text-sm ${selectedSettingId === s.id ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                    <span className="truncate">{s.name}</span>
                  </button>
                ));
              }
              const fi = items as ForeshadowItem[];
              if (fi.length === 0) return <div className="px-3 py-2 text-xs text-gray-400">暂无伏笔</div>;
              return fi.map((f) => (
                <button key={f.id} onClick={() => setSelectedForeshadowId(f.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors text-sm ${selectedForeshadowId === f.id ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <span className="truncate">{f.name}</span>
                </button>
              ));
            })()}
          </div>
        )}
      </div>
    ));
  };

  return (
    <main className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* 弹窗 */}
      <RoleEditModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} onSave={handleAddRole} />
      <SettingEditModal isOpen={isSettingModalOpen} onClose={() => setIsSettingModalOpen(false)} onSave={handleAddSetting} />
      <ForeshadowEditModal isOpen={isForeshadowModalOpen} onClose={() => setIsForeshadowModalOpen(false)} onSave={handleAddForeshadow} />
      {isModelManageOpen && <ModelManageModal onClose={() => setIsModelManageOpen(false)} />}
      {/* 删除确认弹窗 */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setIsDeleteConfirmOpen(false)}>
          <div className="w-[360px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              <h3 className="text-base font-bold text-gray-900">删除确认</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">确定要删除{activeTab === '角色' ? '角色' : activeTab === '设定' ? '设定' : '伏笔'}「{(selectedRole || selectedSetting || selectedForeshadow)?.name || ''}」吗？此操作不可恢复。</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={() => { handleDeleteItem(); setIsDeleteConfirmOpen(false); }} className="px-5 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">确认删除</button>
            </div>
          </div>
        </div>
      )}
      {/* 新增分类弹窗 */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setIsTypeModalOpen(false)}>
          <div className="w-[360px] bg-white rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">新增分类</h3>
              <button onClick={() => { setIsTypeModalOpen(false); setNewTypeName(''); }} className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型名称</label>
              <input type="text" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }} placeholder="请输入类型名称" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand placeholder:text-gray-400" />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => { setIsTypeModalOpen(false); setNewTypeName(''); }} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
              <button onClick={handleAddCategory} disabled={!newTypeName.trim()} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 内容区 - 三栏布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧设定库 */}
        <div className="w-[210px] flex flex-col border-r border-gray-200 shrink-0">
          {/* 标题 */}
          <div className="flex items-center px-3 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">
              {activeTab === '角色' ? '角色分类' : activeTab === '伏笔' ? '伏笔列表' : activeTab}
            </h3>
          </div>
          {/* 分类列表 */}
          <div className="flex-1 overflow-y-auto px-2 py-2">{renderCategoryList()}</div>
          {/* 底部操作 — 两行 */}
          <div className="flex flex-col gap-2 p-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <button onClick={handleAdd} className="flex-1 px-2 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap">
              {activeTab === '角色' ? '新增角色' : activeTab === '设定' ? '新增设定' : '新增'}
            </button>
              {activeTab !== '伏笔' && (
                <button onClick={() => setIsTypeModalOpen(true)} className="flex-1 px-2 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap">新增分类</button>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { if (hasSelectedItem) setIsDeleteConfirmOpen(true); }}
                disabled={!hasSelectedItem}
                className="w-[calc(50%-4px)] px-2 py-2 text-sm text-red-400 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                删除卡片
              </button>
            </div>
          </div>
        </div>

        {/* 中间编辑区 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">
              {activeTab === '角色' ? '角色编辑' : activeTab === '设定' ? '设定编辑' : '编辑'}
            </h3>
          </div>
          {/* 编辑内容区 */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* ─── 角色编辑（固定显示） ─── */}
            {activeTab === '角色' && (
              <div className="max-w-[520px] border border-gray-200 rounded-lg p-5 space-y-5">
                {/* 角色名 */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 shrink-0">角色名</label>
                  <input
                    type="text"
                    value={selectedRole?.name ?? ''}
                    onChange={(e) => {
                      if (selectedRole) handleUpdateRole({ ...selectedRole, name: e.target.value });
                    }}
                    placeholder="请输入角色名"
                    className="w-1/3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  />
                </div>
                {/* 角色分类 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">角色分类</label>
                  <div className="flex flex-wrap gap-2">
                    {['主角','女主','正派配角'].map((opt) => (
                      <button key={opt} type="button"
                        onClick={() => {
                          if (selectedRole) handleUpdateRole({ ...selectedRole, type: opt });
                        }}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-all ${selectedRole?.type === opt ? 'bg-brand text-white border-brand' : 'text-brand border-brand/30 hover:bg-brand-light'}`}>
                        {opt}
                      </button>
                    ))}
                    {['重要反派','反派配角','龙套'].map((opt) => (
                      <button key={opt} type="button"
                        onClick={() => {
                          if (selectedRole) handleUpdateRole({ ...selectedRole, type: opt });
                        }}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-all ${selectedRole?.type === opt ? (opt === '龙套' ? 'bg-gray-500 text-white border-gray-500' : 'bg-red-500 text-white border-red-500') : (opt === '龙套' ? 'text-gray-500 border-gray-200 hover:bg-gray-50' : 'text-red-500 border-red-200 hover:bg-red-50')}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 角色状态 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色状态</label>
                  <input type="text"
                    value={selectedRole?.status ?? ''}
                    onChange={(e) => {
                      if (selectedRole) handleUpdateRole({ ...selectedRole, status: e.target.value });
                    }}
                    placeholder="如：存活、死亡、失踪等"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  />
                </div>
                {/* 角色背景 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色背景</label>
                  <textarea
                    value={selectedRole?.background ?? ''}
                    onChange={(e) => {
                      if (selectedRole) handleUpdateRole({ ...selectedRole, background: e.target.value });
                    }}
                    placeholder="请输入角色背景故事"
                    className="w-full h-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand resize-none"
                  />
                </div>
              </div>
            )}
            {/* ─── 设定编辑（固定显示） ─── */}
            {activeTab === '设定' && (
              <div className="max-w-[520px] border border-gray-200 rounded-lg p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设定名称</label>
                  <input type="text"
                    value={selectedSetting?.name ?? ''}
                    onChange={(e) => {
                      if (selectedSetting) handleUpdateSetting({ ...selectedSetting, name: e.target.value });
                    }}
                    placeholder="请输入设定名称"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  />
                </div>
                {/* 设定分类 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">设定分类</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '核心设定', catId: 'cat-核心设定' },
                      { label: '境界体系', catId: 'cat-境界体系' },
                      { label: '其他设定', catId: 'cat-其他设定' },
                      { label: '未分类', catId: DEFAULT_CATEGORY_ID },
                    ].map((opt) => (
                      <button key={opt.catId} type="button"
                        onClick={() => {
                          if (selectedSetting) handleUpdateSetting({ ...selectedSetting, categoryId: opt.catId });
                        }}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                          selectedSetting?.categoryId === opt.catId
                            ? 'bg-brand text-white border-brand'
                            : 'text-brand border-brand/30 hover:bg-brand-light'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设定内容</label>
                  <textarea
                    value={selectedSetting?.content ?? ''}
                    onChange={(e) => {
                      if (selectedSetting) handleUpdateSetting({ ...selectedSetting, content: e.target.value });
                    }}
                    placeholder="请输入设定内容"
                    className="w-full h-[300px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand resize-y"
                  />
                </div>
              </div>
            )}
            {/* ─── 伏笔编辑（固定显示） ─── */}
            {activeTab === '伏笔' && (
              <div className="max-w-[520px] border border-gray-200 rounded-lg p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">伏笔名称</label>
                  <input type="text"
                    value={selectedForeshadow?.name ?? ''}
                    onChange={(e) => {
                      if (selectedForeshadow) handleUpdateForeshadow({ ...selectedForeshadow, name: e.target.value });
                    }}
                    placeholder="请输入伏笔名称"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  />
                </div>
                {/* 出现章节 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出现章节</label>
                  <input type="text"
                    value={selectedForeshadow?.chapter ?? ''}
                    onChange={(e) => {
                      if (selectedForeshadow) handleUpdateForeshadow({ ...selectedForeshadow, chapter: e.target.value });
                    }}
                    placeholder="如：第5章、第10章等"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">伏笔内容</label>
                  <textarea
                    value={selectedForeshadow?.content ?? ''}
                    onChange={(e) => {
                      if (selectedForeshadow) handleUpdateForeshadow({ ...selectedForeshadow, content: e.target.value });
                    }}
                    placeholder="请输入伏笔内容描述"
                    className="w-full h-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：AI对话框（light主题） */}
        <div className="w-[270px] flex flex-col bg-gray-50 border-l border-gray-200 shrink-0 overflow-hidden">
          {/* 标题行 */}
          <div className="flex items-center px-3 py-3 border-b border-gray-100 bg-white shrink-0">
            <h3 className="text-sm font-bold text-gray-900">模型配置</h3>
          </div>
          {/* 模型选择行 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white shrink-0">
            <span className="text-xs text-gray-500 shrink-0">模型</span>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
              className="w-[40%] px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:border-brand">
              {models.length === 0 && <option value="">暂无模型</option>}
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={() => setIsModelManageOpen(true)} className="px-2 py-1 text-[10px] text-brand border border-brand/30 rounded hover:bg-brand-light transition-colors shrink-0">
              模型管理
            </button>
          </div>
          {/* 对话选择行 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white shrink-0">
            <span className="text-xs text-gray-500 shrink-0">对话</span>
            <select value={cs.currentConvId} onChange={(e) => updateChatState({ currentConvId: e.target.value })}
              className="w-[60%] px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:border-brand">
              {cs.conversations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={handleNewConversation} className="px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-colors shrink-0">
              新建
            </button>
            <button onClick={handleDeleteCurrentConversation} className="px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-colors shrink-0">
              删除
            </button>
            <button onClick={handleResetConversations} className="px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-colors shrink-0">
              清空
            </button>
          </div>
          {/* 提示词选择行 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white shrink-0">
            <span className="text-xs text-gray-500 shrink-0">提示词</span>
            <select value={cs.selectedPrompt} onChange={(e) => updateChatState({ selectedPrompt: e.target.value })}
              className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:border-brand">
              <option value="">选择提示词...</option>
              {promptOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {/* AI对话内容区 */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-white" ref={chatScrollRef}>
            {currentConv.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Bot className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-xs">在下方输入框发送消息开始对话</p>
              </div>
            )}
            {currentConv.messages.map((msg) => (
              <div key={msg.id} className={`group flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand' : 'bg-emerald-50'}`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <div className={`relative max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {msg.content === '__THINKING__' ? (
                    <ThinkingDots />
                  ) : msg.content}
                  {msg.isStreaming && msg.content !== '__THINKING__' && <span className="inline-block w-1.5 h-3 ml-0.5 bg-current animate-pulse" />}
                  <button onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* 底部输入区 */}
          <div className="px-3 py-2 border-t border-gray-200 bg-white shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAssociate}
                className={`px-2 py-1 text-[10px] rounded transition-colors border ${
                  isAssociated && (selectedRole || selectedSetting || selectedForeshadow)
                    ? 'bg-brand text-white border-brand'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-700'
                }`}
              >
                {isAssociated && selectedRole ? `已关联：${selectedRole.name}` : isAssociated && selectedSetting ? `已关联：${selectedSetting.name}` : isAssociated && selectedForeshadow ? `已关联：${selectedForeshadow.name}` : activeTab === '角色' ? '关联当前角色' : activeTab === '设定' ? '关联当前设定' : '关联当前伏笔'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={cs.inputText} onChange={(e) => updateChatState({ inputText: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }} placeholder="输入消息..."
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-brand" />
              <button onClick={handleSend} className="p-2 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors" title="发送"><Send className="w-4 h-4" /></button>
              <button onClick={handleStop} disabled={!cs.isGenerating} className={`p-2 rounded-md transition-colors ${cs.isGenerating ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} title="停止"><Square className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
