import { useCallback, useMemo, useState } from 'react';

import type { Chapter, Volume, WorkbenchNovel } from '@/features/workbench/model/workbenchTypes';
import type { NewNovelInput, Novel, RecycledNovel, WorkType } from '@/features/novels/model/novelTypes';

const NOVELS_KEY = 'xinyuexia_novels_v1';
const RECYCLE_KEY = 'xinyuexia_recycled_novels_v1';
const CATEGORIES_KEY = 'xinyuexia_categories_v1';
const CURRENT_ID_KEY = 'xinyuexia_current_novel_id';
const VOLUMES_KEY = 'xinyuexia_volumes_v1';

const DEFAULT_CATEGORIES = ['未分类', '玄幻', '都市', '仙侠', '科幻', '历史', '游戏', '悬疑'];

export interface ImportedChapterInput {
  title: string;
  content: string;
  wordCount?: number;
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('zh-CN');
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createDefaultNovels(): Novel[] {
  const now = formatDate();
  return [
    {
      id: 1,
      title: '默认小说1',
      type: 'novel',
      category: '未分类',
      wordCount: 0,
      createdAt: now,
      lastModifiedAt: now,
    },
  ];
}

function nextNovelId(items: Array<{ id: number }>) {
  return Math.max(0, ...items.map((item) => item.id)) + 1;
}

function nextChapterId(volumesMap: Record<number, Volume[]>) {
  const allIds = Object.values(volumesMap)
    .flatMap((volumes) => volumes)
    .flatMap((volume) => volume.chapters.map((chapter) => chapter.id));
  return Math.max(0, ...allIds) + 1;
}

function countWords(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  const chineseChars = trimmed.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const englishWords = trimmed.match(/[a-zA-Z]+/g)?.length ?? 0;
  const numbers = trimmed.match(/\d+/g)?.length ?? 0;
  return chineseChars + englishWords + numbers;
}

function getContentKey(novelId: number, chapterId: number) {
  return `xinyuexia_novel_${novelId}_chapter_${chapterId}`;
}

function toWorkbenchNovel(novel: Novel): WorkbenchNovel {
  return {
    id: novel.id,
    title: novel.title,
    type: novel.type,
    category: novel.category,
    synopsis: novel.synopsis,
    wordCount: novel.wordCount,
    createdAt: novel.createdAt,
    lastModifiedAt: novel.lastModifiedAt,
  };
}

function createImportedVolumes(
  novelType: WorkType,
  chapters: ImportedChapterInput[],
  volumesMap: Record<number, Volume[]>,
): { volumes: Volume[]; contents: Array<{ chapterId: number; content: string }>; totalWordCount: number } {
  let chapterIdSeed = nextChapterId(volumesMap);
  const contents: Array<{ chapterId: number; content: string }> = [];
  let totalWordCount = 0;

  if (novelType === 'script') {
    const groupVolume: Volume = {
      id: Date.now(),
      name: '集纲',
      isExpanded: true,
      chapters: [],
    };
    const mainVolume: Volume = {
      id: Date.now() + 1,
      name: '第一卷',
      isExpanded: true,
      chapters: [],
    };

    chapters.forEach((item, index) => {
      const chapterId = chapterIdSeed++;
      const wordCount = item.wordCount ?? countWords(item.content);
      totalWordCount += wordCount;
      const chapter: Chapter = {
        id: chapterId,
        title: item.title.trim(),
        serialNumber: index + 1,
        wordCount,
        isSelected: index === 0,
        isPublished: false,
      };
      const targetVolume = index === 0 && item.title.includes('集纲') ? groupVolume : mainVolume;
      targetVolume.chapters.push(chapter);
      contents.push({ chapterId, content: item.content });
    });

    const volumes = [groupVolume, mainVolume].filter((volume) => volume.chapters.length > 0);
    return { volumes, contents, totalWordCount };
  }

  const volume: Volume = {
    id: Date.now(),
    name: '第一卷',
    isExpanded: true,
    chapters: chapters.map((item, index) => {
      const chapterId = chapterIdSeed++;
      const wordCount = item.wordCount ?? countWords(item.content);
      totalWordCount += wordCount;
      contents.push({ chapterId, content: item.content });
      return {
        id: chapterId,
        title: item.title.trim(),
        serialNumber: index + 1,
        wordCount,
        isSelected: index === 0,
        isPublished: false,
      };
    }),
  };

  return { volumes: [volume], contents, totalWordCount };
}

export function useNovelLibrary() {
  const [novels, setNovels] = useState<Novel[]>(() => readJson(NOVELS_KEY, createDefaultNovels()));
  const [recycledNovels, setRecycledNovels] = useState<RecycledNovel[]>(() => readJson(RECYCLE_KEY, []));
  const [categories, setCategories] = useState<string[]>(() => readJson(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [currentNovelId, setCurrentNovelId] = useState<number | null>(() => {
    const raw = localStorage.getItem(CURRENT_ID_KEY);
    return raw ? Number(raw) : null;
  });

  const persistNovels = useCallback((next: Novel[]) => {
    setNovels(next);
    writeJson(NOVELS_KEY, next);
  }, []);

  const persistRecycled = useCallback((next: RecycledNovel[]) => {
    setRecycledNovels(next);
    writeJson(RECYCLE_KEY, next);
  }, []);

  const persistCategories = useCallback((next: string[]) => {
    setCategories(next);
    writeJson(CATEGORIES_KEY, next);
  }, []);

  const getNovelsByType = useCallback((type: WorkType) => novels.filter((novel) => novel.type === type), [novels]);

  const createNovel = useCallback((input: NewNovelInput) => {
    const now = formatDate();
    const novel: Novel = {
      id: nextNovelId([...novels, ...recycledNovels]),
      title: input.title.trim(),
      type: input.type,
      category: input.category,
      synopsis: input.synopsis?.trim(),
      wordCount: 0,
      createdAt: now,
      lastModifiedAt: now,
    };

    const next = [...novels, novel];
    persistNovels(next);
    localStorage.setItem(CURRENT_ID_KEY, String(novel.id));
    setCurrentNovelId(novel.id);
    return novel.id;
  }, [novels, persistNovels, recycledNovels]);

  const renameNovel = useCallback((id: number, title: string) => {
    const next = novels.map((novel) => novel.id === id
      ? { ...novel, title: title.trim(), lastModifiedAt: formatDate() }
      : novel);
    persistNovels(next);
  }, [novels, persistNovels]);

  const updateCategory = useCallback((id: number, category: string) => {
    const next = novels.map((novel) => novel.id === id
      ? { ...novel, category, lastModifiedAt: formatDate() }
      : novel);
    persistNovels(next);
  }, [novels, persistNovels]);

  const updateCover = useCallback((id: number, cover?: string) => {
    const next = novels.map((novel) => novel.id === id
      ? { ...novel, cover, lastModifiedAt: formatDate() }
      : novel);
    persistNovels(next);
  }, [novels, persistNovels]);

  const addCategory = useCallback((category: string) => {
    const trimmed = category.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    persistCategories([...categories, trimmed]);
  }, [categories, persistCategories]);

  const moveToRecycle = useCallback((id: number) => {
    const target = novels.find((novel) => novel.id === id);
    if (!target) return;

    const now = new Date();
    const recycled: RecycledNovel = {
      ...target,
      deletedAt: formatDate(now),
      expireAt: formatDate(addDays(now, 30)),
    };

    persistNovels(novels.filter((novel) => novel.id !== id));
    persistRecycled([...recycledNovels, recycled]);
    if (currentNovelId === id) {
      localStorage.removeItem(CURRENT_ID_KEY);
      setCurrentNovelId(null);
    }
  }, [currentNovelId, novels, persistNovels, persistRecycled, recycledNovels]);

  const restoreNovel = useCallback((id: number) => {
    const target = recycledNovels.find((novel) => novel.id === id);
    if (!target) return;
    const { deletedAt: _deletedAt, expireAt: _expireAt, ...restored } = target;
    persistRecycled(recycledNovels.filter((novel) => novel.id !== id));
    persistNovels([...novels, { ...restored, lastModifiedAt: formatDate() }]);
  }, [novels, persistNovels, persistRecycled, recycledNovels]);

  const permanentDelete = useCallback((id: number) => {
    persistRecycled(recycledNovels.filter((novel) => novel.id !== id));
  }, [persistRecycled, recycledNovels]);

  const selectNovel = useCallback((id: number) => {
    localStorage.setItem(CURRENT_ID_KEY, String(id));
    setCurrentNovelId(id);
  }, []);

  const importNovels = useCallback((items: Novel[]) => {
    const merged = [...novels];
    for (const item of items) {
      merged.push({
        ...item,
        id: nextNovelId([...merged, ...recycledNovels]),
        createdAt: item.createdAt || formatDate(),
        lastModifiedAt: item.lastModifiedAt || formatDate(),
      });
    }
    persistNovels(merged);
  }, [novels, persistNovels, recycledNovels]);

  const importNovelWithChapters = useCallback((input: NewNovelInput, chapters: ImportedChapterInput[]) => {
    const now = formatDate();
    const volumesMap = readJson<Record<number, Volume[]>>(VOLUMES_KEY, {});
    const nextId = nextNovelId([...novels, ...recycledNovels]);
    const safeChapters = chapters.length > 0
      ? chapters
      : [{ title: '', content: '', wordCount: 0 }];
    const imported = createImportedVolumes(input.type, safeChapters, volumesMap);

    const novel: Novel = {
      id: nextId,
      title: input.title.trim(),
      type: input.type,
      category: input.category,
      synopsis: input.synopsis?.trim(),
      cover: undefined,
      wordCount: imported.totalWordCount,
      createdAt: now,
      lastModifiedAt: now,
    };

    const nextNovels = [...novels, novel];
    const nextVolumesMap = { ...volumesMap, [nextId]: imported.volumes };
    persistNovels(nextNovels);
    writeJson(VOLUMES_KEY, nextVolumesMap);
    imported.contents.forEach(({ chapterId, content }) => {
      localStorage.setItem(getContentKey(nextId, chapterId), content);
    });
    localStorage.setItem(CURRENT_ID_KEY, String(nextId));
    setCurrentNovelId(nextId);
    return nextId;
  }, [novels, persistNovels, recycledNovels]);

  const stats = useMemo(() => ({
    novelCount: getNovelsByType('novel').length,
    scriptCount: getNovelsByType('script').length,
    totalWords: novels.reduce((sum, novel) => sum + novel.wordCount, 0),
  }), [getNovelsByType, novels]);

  return {
    novels,
    recycledNovels,
    categories,
    currentNovelId,
    stats,
    getNovelsByType,
    createNovel,
    renameNovel,
    updateCategory,
    updateCover,
    addCategory,
    moveToRecycle,
    restoreNovel,
    permanentDelete,
    selectNovel,
    importNovels,
    importNovelWithChapters,
    toWorkbenchNovel,
  };
}
