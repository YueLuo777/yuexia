import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { deleteChapterSnapshots, deleteNovelSnapshots } from '@/sections/HistoryModal';
import { applyFormat, defaultFormatOptions } from '@/sections/SmartFormatModal';
import { trpc } from '@/providers/trpc';

export interface Chapter {
  id: number;
  title: string;       // 用户自定义标题，可为空
  serialNumber: number; // 全局章节序号（跨卷递增，不可变）
  wordCount: number;
  isSelected: boolean;
  content?: string;     // 章节正文内容（导入时嵌入，优先从此读取）
  isPublished?: boolean;
}

export interface Volume {
  id: number;
  name: string;
  isExpanded: boolean;
  chapters: Chapter[];
}

export interface RecycledChapter {
  id: number;
  title: string;
  wordCount: number;
  volumeId: number;
  serialNumber: number;
  deletedAt: string;
  remainingDays: number;
}

export type WorkType = 'novel' | 'script';

export interface Novel {
  id: number;
  title: string;
  wordCount: number;
  createdAt: string;       // 作品创建时间
  lastModifiedAt?: string; // 最后修改时间（如重命名、改分类等）
  category: string;
  cover?: string;
  type: WorkType;          // 作品类型：小说 or 剧本
  synopsis?: string;       // 作品简介
}

export interface RecycledNovel extends Novel {
  deletedAt: string;
  expireAt: string;
  remainingDays: number;
}

const DEFAULT_CATEGORIES = ['未分类', '玄幻', '都市', '仙侠', '科幻', '历史', '游戏', '悬疑'];
const SCRIPT_DEFAULT_CARDS = ['第一卷', '第二卷', '第三卷'];
const CHINESE_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
export function toChineseNumber(n: number): string {
  if (n <= 10) return CHINESE_NUMBERS[n];
  if (n < 20) return `十${CHINESE_NUMBERS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return `${CHINESE_NUMBERS[tens]}十`;
  return `${CHINESE_NUMBERS[tens]}十${CHINESE_NUMBERS[ones]}`;
}

// 2. 每个作品独立的 volumes 存储
export interface VolumesMap {
  [novelId: number]: Volume[];
}

interface NovelsContextValue {
  novels: Novel[];
  recycleBin: RecycledNovel[];
  categories: string[];
  volumes: Volume[]; // 当前作品的 volumes
  recycledChapters: RecycledChapter[];
  currentNovelId: number;
  setCurrentNovel: (id: number) => void;
  addNovel: (novel: Omit<Novel, 'id' | 'createdAt' | 'lastModifiedAt'>) => number;
  importNovelWithChapters: (novelData: Omit<Novel, 'id' | 'createdAt' | 'lastModifiedAt' | 'wordCount'>, chapters: { title: string; content: string; wordCount: number }[]) => number;
  mergeNovelChapters: (novelId: number, chapters: { title: string; content: string; wordCount: number }[]) => { added: number; skipped: number };
  deleteNovel: (id: number) => void;
  restoreNovel: (id: number) => void;
  permanentDelete: (id: number) => void;
  updateNovelCategory: (id: number, category: string) => void;
  renameNovel: (id: number, title: string) => void;
  updateNovelSynopsis: (id: number, synopsis: string) => void;
  updateNovelCover: (id: number, cover: string) => void;
  addCategory: (category: string) => void;
  totalWordCount: number;
  totalDays: number;
  toast: { id: number; title: string; message: string } | null;
  showToast: (title: string, message: string) => void;
  clearToast: () => void;
  addVolume: () => void;
  toggleVolume: (id: number) => void;
  addChapter: (volumeId?: number) => void;
  deleteChapter: (volumeId: number, chapterId: number) => void;
  restoreChapter: (id: number) => void;
  permanentDeleteChapter: (id: number) => void;
  selectChapter: (volumeId: number, chapterId: number) => void;
  updateChapterTitle: (chapterId: number, title: string) => void;
  updateChapterSerialNumber: (chapterId: number, serialNumber: number) => void;
  toggleSort: () => void;
  sortAsc: boolean;
  undo: () => void;
  saveChapterContent: (chapterId: number, content: string) => void;
  loadChapterContent: (chapterId: number) => string | null;
  getLastEditedChapterId: () => number | null;
  getChapterWordCount: (chapterId: number) => number;
  getNovelWordCount: (novelId: number) => number;
  getNovelsByType: (type: WorkType) => Novel[];
  getDefaultTitle: (type: WorkType) => string;
  volumesMap: VolumesMap;
  setVolumesMap: React.Dispatch<React.SetStateAction<VolumesMap>>;
}

const NovelsContext = createContext<NovelsContextValue | null>(null);

// 生成唯一ID（带递增计数器防止同一毫秒内冲突）
let uidCounter = 0;
const uid = () => {
  const n = uidCounter++;
  return Date.now() + n;
};

const getDefaultVolumes = (type: WorkType = 'novel'): Volume[] => {
  if (type === 'script') {
    return [
      { id: uid(), name: '集纲', isExpanded: true, chapters: [{ id: uid(), title: '集纲1', serialNumber: 1, wordCount: 0, isSelected: true, isPublished: false }] },
      { id: uid(), name: '第一卷', isExpanded: true, chapters: [] },
      { id: uid(), name: '第二卷', isExpanded: true, chapters: [] },
      { id: uid(), name: '第三卷', isExpanded: true, chapters: [] },
    ];
  }
  return [
    { id: uid(), name: '第一卷', isExpanded: true, chapters: [{ id: uid(), title: '', serialNumber: 1, wordCount: 0, isSelected: true, isPublished: false }] },
  ];
};

// ── localStorage 持久化 ──
const NOVELS_KEY = 'novels_data_v1';
const RECYCLE_BIN_KEY = 'recycle_bin_v1';
const VOLUMES_MAP_KEY = 'volumes_map_v2';
const NEXT_NOVEL_ID_KEY = 'next_novel_id_v1';
const CURRENT_NOVEL_ID_KEY = 'current_novel_id_v1';

function loadCurrentNovelId(): number {
  try {
    const raw = localStorage.getItem(CURRENT_NOVEL_ID_KEY);
    if (raw) return parseInt(raw, 10);
  } catch { /* ignore */ }
  return 1;
}

function loadNovels(): Novel[] {
  try {
    const raw = localStorage.getItem(NOVELS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [
    { id: 1, title: '默认小说1', wordCount: 0, createdAt: '2026/4/27', lastModifiedAt: '2026/4/27', category: '未分类', type: 'novel' },
  ];
}

function loadRecycleBin(): RecycledNovel[] {
  try {
    const raw = localStorage.getItem(RECYCLE_BIN_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function loadVolumesMap(): VolumesMap {
  try {
    const raw = localStorage.getItem(VOLUMES_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VolumesMap;
      // 迁移：旧数据没有 isPublished 字段，默认设为 false
      Object.values(parsed).forEach((vols: Volume[]) => {
        vols.forEach((vol: Volume) => {
          vol.chapters.forEach((ch: Chapter) => {
            if (ch.isPublished === undefined) ch.isPublished = false;
          });
        });
      });
      // 迁移：剧本旧默认结构（5卷含第四卷 / 旧卡格式）→ 新结构
      Object.values(parsed).forEach((vols: Volume[]) => {
        if (vols.length !== 5) return;
        const names = vols.map((v) => v.name);
        const isOldScriptDefault =
          names[0] === '集纲' &&
          (names[1] === '第一卷' || names[1] === '第一卷（1卡，5-10集）') &&
          (names[2] === '第二卷' || names[2] === '第二卷（2卡，15-20集）') &&
          (names[3] === '第三卷' || names[3] === '第三卷（3卡，20-30集）') &&
          (names[4] === '第四卷' || names[4] === '第四卷（4卡，30-40集）');
        if (isOldScriptDefault) {
          vols.pop(); // 删除第四卷
          if (vols[1].name.includes('卡')) vols[1].name = '第一卷';
          if (vols[2].name.includes('卡')) vols[2].name = '第二卷';
          if (vols[3].name.includes('卡')) vols[3].name = '第三卷';
        }
      });
      // 修复：集纲卷章节标题统一为"集纲N"格式（处理旧数据残留）
      Object.values(parsed).forEach((vols: Volume[]) => {
        const jigangVol = vols.find((v) => v.name === '集纲');
        if (jigangVol) {
          jigangVol.chapters.forEach((ch) => {
            if (!ch.title || /^第\d+集/.test(ch.title)) {
              ch.title = `集纲${ch.serialNumber}`;
            }
          });
        }
      });
      return parsed;
    }
  } catch { /* ignore */ }
  return { 1: getDefaultVolumes('novel') };
}

function loadNextNovelId(): number {
  try {
    const raw = localStorage.getItem(NEXT_NOVEL_ID_KEY);
    if (raw) return parseInt(raw, 10);
  } catch { /* ignore */ }
  return 2;
}

// 全局 nextNovelId，从 localStorage 恢复
let nextNovelId = loadNextNovelId();

export function NovelsProvider({ children }: { children: ReactNode }) {
  const [novels, setNovels] = useState<Novel[]>(loadNovels);
  const [recycleBin, setRecycleBin] = useState<RecycledNovel[]>(loadRecycleBin);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // 2. 每个作品独立的 volumes
  const [volumesMap, setVolumesMap] = useState<VolumesMap>(loadVolumesMap);

  const [currentNovelId, setCurrentNovelId] = useState(loadCurrentNovelId);
  // 内容版本计数器：每次保存章节内容时递增，用于触发 totalWordCount 重新计算
  const [contentVersion, setContentVersion] = useState(0);

  // 当前作品的 volumes
  const volumes = volumesMap[currentNovelId] || [];

  // 初始化：为没有 volumes 的作品补全默认结构（key 升级后需要）
  useEffect(() => {
    setVolumesMap((prev) => {
      let changed = false;
      const next = { ...prev };
      novels.forEach((novel) => {
        if (!next[novel.id] || next[novel.id].length === 0) {
          next[novel.id] = getDefaultVolumes(novel.type);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [novels]);

  const setCurrentNovel = useCallback((id: number) => {
    setCurrentNovelId(id);
    try { localStorage.setItem(CURRENT_NOVEL_ID_KEY, String(id)); } catch {}
  }, []);

  const [recycledChapters, setRecycledChapters] = useState<RecycledChapter[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(null);

  const showToast = useCallback((title: string, message: string) => {
    const id = Date.now();
    setToast({ id, title, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // localStorage key 前缀（按作品隔离）
  const contentKey = (chapterId: number) => `novel_${currentNovelId}_chapter_${chapterId}`;

  // tRPC mutations for cloud sync
  const novelCreateMutation = trpc.novel.create.useMutation();
  const novelUpdateMutation = trpc.novel.update.useMutation();
  const novelDeleteMutation = trpc.novel.delete.useMutation();

  // 按类型筛选作品
  const getNovelsByType = useCallback((type: WorkType) => {
    return novels.filter((n) => n.type === type);
  }, [novels]);

  // 生成默认标题
  const getDefaultTitle = useCallback((type: WorkType) => {
    const prefix = type === 'novel' ? '默认小说' : '默认剧本';
    const existing = novels.filter((n) => n.type === type && n.title.startsWith(prefix));
    const nums = existing.map((n) => {
      const match = n.title.match(/(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${prefix}${nextNum}`;
  }, [novels]);

  const addNovel = useCallback((novelData: Omit<Novel, 'id' | 'createdAt' | 'lastModifiedAt'>) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    const newId = nextNovelId++;
    const newNovel: Novel = { ...novelData, id: newId, createdAt: dateStr, lastModifiedAt: dateStr };
    setNovels((prev) => [...prev, newNovel]);
    // 持久化 nextNovelId
    try { localStorage.setItem(NEXT_NOVEL_ID_KEY, String(nextNovelId)); } catch {}
    // 为新作品创建独立的 volumes 和章节计数器
    const type = novelData.type || 'novel';
    setVolumesMap((prev) => ({
      ...prev,
      [newId]: getDefaultVolumes(type),
    }));
    // 自动切换到新作品，确保内容保存到正确的 key 前缀
    setCurrentNovelId(newId);
    showToast('创建成功', `${newNovel.type === 'script' ? '剧本' : '小说'}「${newNovel.title}」已创建`);
    return newId;
  }, [showToast]);

  const importNovelWithChapters = useCallback((novelData: Omit<Novel, 'id' | 'createdAt' | 'lastModifiedAt' | 'wordCount'>, chapterList: { title: string; content: string; wordCount: number }[]) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    const newId = nextNovelId++;
    
    // 对所有章节内容进行自动排版
    const formattedChapters = chapterList.map((ch) => ({
      ...ch,
      content: applyFormat(ch.content, defaultFormatOptions),
    }));
    
    const totalWordCount = formattedChapters.reduce((sum, c) => sum + (c.content.trim() ? c.content.trim().length : 0), 0);
    const newNovel: Novel = { ...novelData, id: newId, wordCount: totalWordCount, createdAt: dateStr, lastModifiedAt: dateStr };
    setNovels((prev) => [...prev, newNovel]);
    try { localStorage.setItem(NEXT_NOVEL_ID_KEY, String(nextNovelId)); } catch {}

    // 创建 volumes，按类型分配
    const type = novelData.type || 'novel';
    let allChapters: { id: number; title: string; serialNumber: number; wordCount: number; isSelected: boolean; content: string }[] = [];
    
    if (type === 'script') {
      // 剧本：章节放入第一个卡（一卡）
      allChapters = formattedChapters.map((ch, idx) => ({
        id: uid(),
        title: ch.title,
        serialNumber: idx + 1,
        wordCount: ch.content.trim() ? ch.content.trim().length : 0,
        isSelected: idx === 0,
        content: ch.content,
      }));
      setVolumesMap((prev) => ({
        ...prev,
        [newId]: [
          { id: uid(), name: '集纲', isExpanded: true, chapters: [] },
          { id: uid(), name: '第一卷', isExpanded: true, chapters: allChapters },
          { id: uid(), name: '第二卷', isExpanded: true, chapters: [] },
          { id: uid(), name: '第三卷', isExpanded: true, chapters: [] },
        ],
      }));
    } else {
      // 小说：章节放入第一卷
      const volId = uid();
      allChapters = formattedChapters.map((ch, idx) => ({
        id: uid(),
        title: ch.title,
        serialNumber: idx + 1,
        wordCount: ch.content.trim() ? ch.content.trim().length : 0,
        isSelected: idx === 0,
        content: ch.content,
      }));
      setVolumesMap((prev) => ({
        ...prev,
        [newId]: [{ id: volId, name: '第一卷', isExpanded: true, chapters: allChapters }],
      }));
    }

    // 同时保存到 localStorage
    allChapters.forEach((ch) => {
      try {
        localStorage.setItem(`novel_${newId}_chapter_${ch.id}`, ch.content || '');
      } catch { /* ignore */ }
    });

    setCurrentNovelId(newId);

    // 同步到云端
    try {
      novelCreateMutation.mutate({
        title: newNovel.title,
        type: newNovel.type,
        category: newNovel.category,
      });
    } catch { /* 静默失败，不影响本地使用 */ }

    showToast('导入成功', `${newNovel.type === 'script' ? '剧本' : '小说'}「${newNovel.title}」已导入 ${chapterList.length} 章`);
    return newId;
  }, [showToast, novelCreateMutation]);

  /* ─── 智能导入2：合并章节到已有作品，跳过已存在的章节 ─── */
  const mergeNovelChapters = useCallback((novelId: number, chapterList: { title: string; content: string; wordCount: number }[]): { added: number; skipped: number } => {
    // 获取该作品现有的所有章节标题（用于匹配）
    const existingVolumes = volumesMap[novelId] || [];
    const existingTitles = new Set<string>();
    existingVolumes.forEach((vol) => {
      vol.chapters.forEach((ch) => {
        const normalized = ch.title.trim();
        if (normalized) existingTitles.add(normalized);
      });
    });

    // 过滤：只保留不存在的章节
    const newChapters = chapterList.filter((ch) => !existingTitles.has(ch.title.trim()));
    const skipped = chapterList.length - newChapters.length;

    if (newChapters.length === 0) {
      showToast('无新章节', `所有章节已存在，共跳过 ${skipped} 章`);
      return { added: 0, skipped };
    }

    // 收集所有现有的 serialNumber
    const existingSerials = new Set<number>();
    existingVolumes.forEach((vol) => {
      vol.chapters.forEach((ch) => existingSerials.add(ch.serialNumber));
    });

    // 生成新章节对象：serialNumber 按原始列表位置分配
    const chaptersToAdd = newChapters.map((ch) => {
      const newId = uid();
      const content = applyFormat(ch.content, defaultFormatOptions);
      // 找到在原始 chapterList 中的位置（1-based）
      const originalIndex = chapterList.findIndex((orig) => orig.title === ch.title);
      let serial = originalIndex >= 0 ? originalIndex + 1 : 1;
      // 如果该序号已被占用，找下一个可用的
      while (existingSerials.has(serial)) {
        serial++;
      }
      existingSerials.add(serial); // 标记为已占用，防止后续冲突
      return {
        id: newId,
        title: ch.title,
        serialNumber: serial,
        wordCount: content.trim() ? content.trim().length : 0,
        isSelected: false,
        isPublished: false,
        content,
      };
    });

    // 追加到第一卷
    setVolumesMap((prev) => {
      const vols = prev[novelId] ? [...prev[novelId]] : [];
      if (vols.length === 0) {
        vols.push({ id: uid(), name: '第一卷', isExpanded: true, chapters: chaptersToAdd });
      } else {
        vols[0] = { ...vols[0], chapters: [...vols[0].chapters, ...chaptersToAdd].sort((a, b) => a.serialNumber - b.serialNumber) };
      }
      return { ...prev, [novelId]: vols };
    });

    // 保存新章节内容到 localStorage
    chaptersToAdd.forEach((ch) => {
      try { localStorage.setItem(`novel_${novelId}_chapter_${ch.id}`, ch.content || ''); } catch {}
    });

    // 更新作品字数
    const addedWordCount = chaptersToAdd.reduce((sum, c) => sum + c.wordCount, 0);
    setNovels((prev) => prev.map((n) => {
      if (n.id === novelId) {
        return { ...n, wordCount: (n.wordCount || 0) + addedWordCount, lastModifiedAt: new Date().toLocaleDateString('zh-CN') };
      }
      return n;
    }));

    setCurrentNovelId(novelId);
    showToast('追加成功', `新增 ${newChapters.length} 章，跳过 ${skipped} 章`);
    return { added: newChapters.length, skipped };
  }, [volumesMap, showToast]);

  const deleteNovel = useCallback((id: number) => {
    const novel = novels.find((n) => n.id === id);
    if (!novel) return;
    const now = new Date();
    const expire = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatDate = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const recycled: RecycledNovel = { ...novel, deletedAt: formatDate(now), expireAt: formatDate(expire), remainingDays: 31 };
    setRecycleBin((prev) => [...prev, recycled]);
    setNovels((prev) => prev.filter((n) => n.id !== id));
    // 删除该作品的 volumes 数据
    setVolumesMap((prev) => {
      const chapterIds: number[] = [];
      (prev[id] || []).forEach((v) => v.chapters.forEach((c) => chapterIds.push(c.id)));
      deleteNovelSnapshots(chapterIds);
      const n = { ...prev }; delete n[id]; return n;
    });
    // 同步到云端
    try {
      novelDeleteMutation.mutate({ id });
    } catch { /* 静默失败 */ }

    showToast('已移入回收站', `${novel.title} 已移入回收站，30 天内可恢复。`);
  }, [novels, showToast, novelDeleteMutation]);

  const restoreNovel = useCallback((id: number) => {
    const recycled = recycleBin.find((n) => n.id === id);
    if (!recycled) return;
    const restored: Novel = { id: recycled.id, title: recycled.title, wordCount: recycled.wordCount, createdAt: recycled.createdAt, lastModifiedAt: recycled.lastModifiedAt, category: recycled.category, cover: recycled.cover, type: recycled.type || 'novel' };
    setNovels((prev) => [...prev, restored]);
    setRecycleBin((prev) => prev.filter((n) => n.id !== id));
    // 恢复默认 volumes 和计数器
    setVolumesMap((prev) => ({ ...prev, [id]: getDefaultVolumes(restored.type) }));
    showToast('已恢复', '作品已从回收站恢复');
  }, [recycleBin, showToast]);

  const permanentDelete = useCallback((id: number) => {
    setRecycleBin((prev) => prev.filter((n) => n.id !== id));
    showToast('已彻底删除', '作品已被永久删除');
  }, [showToast]);

  const updateNovelCategory = useCallback((id: number, category: string) => {
    const dateStr = new Date().toLocaleDateString('zh-CN');
    setNovels((prev) => prev.map((n) => n.id === id ? { ...n, category, lastModifiedAt: dateStr } : n));
  }, []);

  const renameNovel = useCallback((id: number, title: string) => {
    const dateStr = new Date().toLocaleDateString('zh-CN');
    setNovels((prev) => prev.map((n) => n.id === id ? { ...n, title, lastModifiedAt: dateStr } : n));
    // 同步到云端
    try {
      novelUpdateMutation.mutate({ id, title });
    } catch { /* 静默失败 */ }
  }, [novelUpdateMutation]);

  const updateNovelSynopsis = useCallback((id: number, synopsis: string) => {
    const dateStr = new Date().toLocaleDateString('zh-CN');
    setNovels((prev) => prev.map((n) => n.id === id ? { ...n, synopsis, lastModifiedAt: dateStr } : n));
  }, []);

  const updateNovelCover = useCallback((id: number, cover: string) => {
    const dateStr = new Date().toLocaleDateString('zh-CN');
    setNovels((prev) => prev.map((n) => n.id === id ? { ...n, cover, lastModifiedAt: dateStr } : n));
  }, []);

  const addCategory = useCallback((category: string) => {
    if (!category.trim()) return;
    const trimmed = category.trim();
    setCategories((prev) => prev.includes(trimmed) ? prev : [...prev, trimmed]);
  }, []);

  const [undoStack] = useState<VolumesMap[]>([]);
  const undo = useCallback(() => { if (undoStack.length === 0) return; }, [undoStack]);

  // --- Auto Save Chapter Content（按作品隔离）---
  const saveChapterContent = useCallback((chapterId: number, content: string) => {
    try {
      localStorage.setItem(contentKey(chapterId), content);
      localStorage.setItem(`novel_${currentNovelId}_last_chapter`, String(chapterId));
      // 递增内容版本，触发 totalWordCount 重新计算
      setContentVersion((v) => v + 1);
    } catch {}
  }, [currentNovelId]);

  const loadChapterContent = useCallback((chapterId: number): string | null => {
    try { return localStorage.getItem(contentKey(chapterId)); } catch { return null; }
  }, [currentNovelId]);

  const getChapterWordCount = useCallback((chapterId: number): number => {
    const content = loadChapterContent(chapterId) || '';
    const trimmed = content.trim();
    if (!trimmed) return 0;
    const chineseChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (trimmed.match(/[a-zA-Z]+/g) || []).length;
    const numbers = (trimmed.match(/\d+/g) || []).length;
    const punctuations = (trimmed.match(/[\u3000-\u303f\uff00-\uffef!-/@\[-`{-~]/g) || []).length;
    return chineseChars + englishWords + numbers + punctuations;
  }, [loadChapterContent]);

  // 按作品ID计算该作品的总字数（遍历该作品的所有章节）
  const getNovelWordCount = useCallback((novelId: number): number => {
    const novelVolumes = volumesMap[novelId] || [];
    let total = 0;
    novelVolumes.forEach((vol: Volume) => {
      vol.chapters.forEach((ch: Chapter) => {
        try {
          const content = localStorage.getItem(`novel_${novelId}_chapter_${ch.id}`) || '';
          const trimmed = content.trim();
          if (trimmed) {
            const chineseChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
            const englishWords = (trimmed.match(/[a-zA-Z]+/g) || []).length;
            total += chineseChars + englishWords;
          }
        } catch {}
      });
    });
    return total;
  }, [volumesMap]);

  const getLastEditedChapterId = useCallback((): number | null => {
    try {
      const id = localStorage.getItem(`novel_${currentNovelId}_last_chapter`);
      return id ? Number(id) : null;
    } catch { return null; }
  }, [currentNovelId]);

  // --- Volume & Chapter（操作当前作品的 volumes）---
  const updateCurrentVolumes = useCallback((updater: (prev: Volume[]) => Volume[]) => {
    setVolumesMap((map) => ({ ...map, [currentNovelId]: updater(map[currentNovelId] || []) }));
  }, [currentNovelId]);

  const addVolume = useCallback(() => {
    const currentNovel = novels.find((n) => n.id === currentNovelId);
    const type = currentNovel?.type || 'novel';
    updateCurrentVolumes((prev) => {
      const nextNum = prev.length + 1;
      const volName = type === 'script'
        ? (SCRIPT_DEFAULT_CARDS[nextNum - 1] || '空')
        : `第${toChineseNumber(nextNum)}卷`;
      return [...prev, { id: uid(), name: volName, isExpanded: true, chapters: [] }];
    });
    showToast('卷创建成功', `新卷已创建`);
  }, [updateCurrentVolumes, showToast, novels, currentNovelId]);

  const toggleVolume = useCallback((id: number) => {
    updateCurrentVolumes((prev) => prev.map((v) => v.id === id ? { ...v, isExpanded: !v.isExpanded } : v));
  }, [updateCurrentVolumes]);

  // 1. 新增章节：填补最小缺失序号，无缺失则继续递增
  const addChapter = useCallback((volumeId?: number) => {
    updateCurrentVolumes((prev) => {
      if (prev.length === 0) return prev;
      let targetVol;
      if (volumeId !== undefined) {
        targetVol = prev.find((v) => v.id === volumeId);
      } else {
        targetVol = prev[prev.length - 1];
      }
      if (!targetVol) return prev;

      // 收集所有现有章节的 serialNumber
      const existingNums = new Set<number>();
      prev.forEach((v) => v.chapters.forEach((c) => existingNums.add(c.serialNumber)));

      // 找到从1开始的最小缺失序号
      let nextNum = 1;
      while (existingNums.has(nextNum)) {
        nextNum++;
      }

      const newId = uid();
      const isJigang = targetVol.name === '集纲';
      const newChapter: Chapter = { id: newId, title: isJigang ? `集纲${nextNum}` : '', serialNumber: nextNum, wordCount: 0, isSelected: true, isPublished: false };
      try { localStorage.removeItem(contentKey(newId)); } catch {}

      return prev.map((v) => {
        if (v.id === targetVol!.id) {
          const newChapters = [...v.chapters.map((c) => ({ ...c, isSelected: false })), newChapter]
            .sort((a, b) => a.serialNumber - b.serialNumber);
          return { ...v, chapters: newChapters };
        }
        return { ...v, chapters: v.chapters.map((c) => ({ ...c, isSelected: false })) };
      });
    });
  }, [updateCurrentVolumes]);

  const deleteChapter = useCallback((volumeId: number, chapterId: number) => {
    deleteChapterSnapshots(chapterId);
    updateCurrentVolumes((prev) => {
      const vol = prev.find((v) => v.id === volumeId);
      if (!vol) return prev;
      const chapter = vol.chapters.find((c) => c.id === chapterId);
      if (!chapter) return prev;
      // 备份章节内容到回收站key
      const content = localStorage.getItem(contentKey(chapterId)) || '';
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatDate = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      const recycled: RecycledChapter = { ...chapter, volumeId, deletedAt: formatDate(now), remainingDays: 30 };
      if (content) {
        try { localStorage.setItem(`recycled_content_${recycled.id}`, content); } catch {}
      }
      setRecycledChapters((rp) => [...rp, recycled]);
      return prev.map((v) => v.id === volumeId ? { ...v, chapters: v.chapters.filter((c) => c.id !== chapterId) } : v);
    });

    // 通知编辑器清空（如果删除的是当前正在编辑的章节）
    window.dispatchEvent(new CustomEvent('chapter_deleted', { detail: { chapterId } }));
  }, [updateCurrentVolumes]);

  const restoreChapter = useCallback((id: number) => {
    const recycled = recycledChapters.find((c) => c.id === id);
    if (!recycled) return;

    const backupContent = localStorage.getItem(`recycled_content_${id}`);

    updateCurrentVolumes((prev) => {
      // 找原来的卷（如果存在），否则放到最后一个卷
      const targetVolId = prev.some((v) => v.id === recycled.volumeId)
        ? recycled.volumeId
        : prev[prev.length - 1]?.id;
      if (!targetVolId) return prev;

      // 如果原来的序号已被占用，递增找到可用序号
      let newSerial = recycled.serialNumber;
      const existingNums = new Set<number>();
      prev.forEach((v) => v.chapters.forEach((c) => existingNums.add(c.serialNumber)));
      while (existingNums.has(newSerial)) {
        newSerial++;
      }

      const chapter: Chapter = {
        id: recycled.id,
        title: recycled.title,
        serialNumber: newSerial,
        wordCount: recycled.wordCount || 0,
        isSelected: false,
      };

      if (backupContent) {
        try { localStorage.setItem(contentKey(recycled.id), backupContent); } catch {}
      }

      const newVolumes = prev.map((v) =>
        v.id === targetVolId
          ? { ...v, chapters: [...v.chapters, chapter].sort((a, b) => a.serialNumber - b.serialNumber) }
          : v
      );
      return newVolumes;
    });

    try { localStorage.removeItem(`recycled_content_${id}`); } catch {}

    setRecycledChapters((prev) => prev.filter((c) => c.id !== id));
    showToast('已恢复', `章节「${recycled.title}」已恢复`);
  }, [recycledChapters, updateCurrentVolumes, showToast]);

  const permanentDeleteChapter = useCallback((id: number) => {
    setRecycledChapters((prev) => prev.filter((c) => c.id !== id));
    showToast('已彻底删除', '章节已被永久删除');
  }, [showToast]);

  const updateChapterTitle = useCallback((chapterId: number, title: string) => {
    updateCurrentVolumes((prev) =>
      prev.map((v) => ({ ...v, chapters: v.chapters.map((c) => c.id === chapterId ? { ...c, title } : c) }))
    );
  }, [updateCurrentVolumes]);

  const updateChapterSerialNumber = useCallback((chapterId: number, serialNumber: number) => {
    updateCurrentVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.map((c) => c.id === chapterId ? { ...c, serialNumber } : c).sort((a, b) => a.serialNumber - b.serialNumber),
      }))
    );
  }, [updateCurrentVolumes]);

  const selectChapter = useCallback((volumeId: number, chapterId: number) => {
    updateCurrentVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.map((c) => ({ ...c, isSelected: v.id === volumeId && c.id === chapterId })),
      }))
    );
  }, [updateCurrentVolumes]);

  const toggleSort = useCallback(() => { setSortAsc((prev) => !prev); }, []);

  // 累积创作字数：遍历所有作品的所有章节，按 localStorage 正文内容统计（不含已删除）
  const totalWordCount = useMemo(() => {
    let total = 0;
    Object.entries(volumesMap).forEach(([novelIdStr, vols]) => {
      const novelId = Number(novelIdStr);
      vols.forEach((vol: Volume) => {
        vol.chapters.forEach((ch: Chapter) => {
          try {
            const content = localStorage.getItem(`novel_${novelId}_chapter_${ch.id}`) || '';
            const trimmed = content.trim();
            if (trimmed) {
              const chineseChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
              const englishWords = (trimmed.match(/[a-zA-Z]+/g) || []).length;
              const numbers = (trimmed.match(/\d+/g) || []).length;
              const punctuations = (trimmed.match(/[\u3000-\u303f\uff00-\uffef!-/@\[-`{-~]/g) || []).length;
              total += chineseChars + englishWords + numbers + punctuations;
            }
          } catch {}
        });
      });
    });
    return total;
  }, [volumesMap, contentVersion]);
  const totalDays = useMemo(() => { const dates = new Set(novels.map((n) => n.lastModifiedAt || n.createdAt)); return Math.max(dates.size, 1); }, [novels]);

  // 持久化到 localStorage（本地缓存）
  useEffect(() => { try { localStorage.setItem(NOVELS_KEY, JSON.stringify(novels)); } catch {} }, [novels]);
  useEffect(() => { try { localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycleBin)); } catch {} }, [recycleBin]);
  useEffect(() => { try { localStorage.setItem(VOLUMES_MAP_KEY, JSON.stringify(volumesMap)); } catch {} }, [volumesMap]);

  return (
    <NovelsContext.Provider value={{
      novels, recycleBin, categories, volumes, recycledChapters, volumesMap, setVolumesMap,
      currentNovelId, setCurrentNovel,
      addNovel, importNovelWithChapters, mergeNovelChapters, deleteNovel, restoreNovel, permanentDelete,
      updateNovelCategory, renameNovel, updateNovelSynopsis, updateNovelCover, addCategory,
      totalWordCount, totalDays, toast, showToast, clearToast: () => setToast(null),
      addVolume, toggleVolume, addChapter, deleteChapter, restoreChapter, permanentDeleteChapter,
      selectChapter, updateChapterTitle, updateChapterSerialNumber, toggleSort, sortAsc, undo,
      saveChapterContent, loadChapterContent, getLastEditedChapterId, getChapterWordCount, getNovelWordCount,
      getNovelsByType, getDefaultTitle,
    }}>
      {children}
    </NovelsContext.Provider>
  );
}

export function useNovelsContext() {
  const ctx = useContext(NovelsContext);
  if (!ctx) throw new Error('useNovelsContext must be used within NovelsProvider');
  return ctx;
}