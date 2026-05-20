import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Chapter, RecycledChapter, Volume, WorkbenchNovel } from '@/features/workbench/model/workbenchTypes';

const NOVELS_KEY = 'xinyuexia_novels_v1';
const CURRENT_ID_KEY = 'xinyuexia_current_novel_id';
const VOLUMES_KEY = 'xinyuexia_volumes_v1';
const RECYCLED_CHAPTERS_KEY = 'xinyuexia_recycled_chapters_v1';
const SORT_KEY = 'xinyuexia_workbench_sort_asc';

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

function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function getChapterContentKey(novelId: number, chapterId: number) {
  return `xinyuexia_novel_${novelId}_chapter_${chapterId}`;
}

export function readChapterContent(novelId: number, chapterId: number) {
  return localStorage.getItem(getChapterContentKey(novelId, chapterId)) ?? '';
}

function writeChapterContent(novelId: number, chapterId: number, content: string) {
  localStorage.setItem(getChapterContentKey(novelId, chapterId), content);
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('zh-CN');
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toChineseNumber(value: number) {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (value <= 10) return value === 10 ? '十' : digits[value];
  if (value < 20) return `十${digits[value - 10]}`;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones === 0 ? `${digits[tens]}十` : `${digits[tens]}十${digits[ones]}`;
}

function normalizeVolumeNames(volumesMap: Record<number, Volume[]>) {
  let changed = false;
  const next = Object.fromEntries(Object.entries(volumesMap).map(([novelId, volumes]) => [
    novelId,
    volumes.map((volume, index) => {
      if (volume.name === '集纲') return volume;
      if (/^第.+卷$/.test(volume.name)) return volume;
      if (/^第?\d+卷$/.test(volume.name)) {
        const number = Number(volume.name.replace(/\D/g, ''));
        changed = true;
        return { ...volume, name: `第${toChineseNumber(number)}卷` };
      }
      if (/^[\u4e00-\u9fff?]+$/.test(volume.name) && volume.name.includes('卷')) {
        return volume;
      }
      if (index === 0 && volume.chapters.some((chapter) => chapter.title.startsWith('集纲'))) {
        changed = true;
        return { ...volume, name: '集纲' };
      }
      return volume;
    }),
  ])) as Record<number, Volume[]>;

  if (changed) writeJson(VOLUMES_KEY, next);
  return next;
}

function countWords(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  const chineseChars = trimmed.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const englishWords = trimmed.match(/[a-zA-Z]+/g)?.length ?? 0;
  const numbers = trimmed.match(/\d+/g)?.length ?? 0;
  return chineseChars + englishWords + numbers;
}

function createDefaultVolumes(type: WorkbenchNovel['type'] = 'novel'): Volume[] {
  const chapterId = uid();
  if (type === 'script') {
    return [
      {
        id: uid(),
        name: '集纲',
        isExpanded: true,
        chapters: [
          {
            id: chapterId,
            title: '集纲1',
            serialNumber: 1,
            wordCount: 0,
            isSelected: true,
            isPublished: false,
          },
        ],
      },
      { id: uid(), name: '第一卷', isExpanded: true, chapters: [] },
      { id: uid(), name: '第二卷', isExpanded: true, chapters: [] },
      { id: uid(), name: '第三卷', isExpanded: true, chapters: [] },
    ];
  }

  return [
    {
      id: uid(),
      name: '第一卷',
      isExpanded: true,
      chapters: [
        {
          id: chapterId,
          title: '',
          serialNumber: 1,
          wordCount: 0,
          isSelected: true,
          isPublished: false,
        },
      ],
    },
  ];
}

function getSelectedChapter(volumes: Volume[]) {
  for (const volume of volumes) {
    const chapter = volume.chapters.find((item) => item.isSelected);
    if (chapter) return { volumeId: volume.id, volumeName: volume.name, chapter };
  }
  return null;
}

function ensureOneSelected(volumes: Volume[]): Volume[] {
  if (getSelectedChapter(volumes)) return volumes;
  const firstVolume = volumes.find((volume) => volume.chapters.length > 0);
  if (!firstVolume) return volumes;

  return volumes.map((volume) => ({
    ...volume,
    chapters: volume.chapters.map((chapter, index) => ({
      ...chapter,
      isSelected: volume.id === firstVolume.id && index === 0,
    })),
  }));
}

export function useWorkbenchData() {
  const [novels, setNovels] = useState<WorkbenchNovel[]>(() => readJson<WorkbenchNovel[]>(NOVELS_KEY, []));
  const [currentNovelId, setCurrentNovelIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(CURRENT_ID_KEY);
    return raw ? Number(raw) : null;
  });
  const [volumesMap, setVolumesMap] = useState<Record<number, Volume[]>>(() => normalizeVolumeNames(readJson(VOLUMES_KEY, {})));
  const [recycledMap, setRecycledMap] = useState<Record<number, RecycledChapter[]>>(() => readJson(RECYCLED_CHAPTERS_KEY, {}));
  const [sortAsc, setSortAsc] = useState(() => localStorage.getItem(SORT_KEY) !== 'false');
  const [editorContent, setEditorContent] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const currentNovel = useMemo(() => {
    if (!currentNovelId) return null;
    return novels.find((novel) => novel.id === currentNovelId) ?? null;
  }, [currentNovelId, novels]);

  const volumes = useMemo(() => {
    if (!currentNovelId) return [];
    return volumesMap[currentNovelId] ?? [];
  }, [currentNovelId, volumesMap]);

  const recycledChapters = useMemo(() => {
    if (!currentNovelId) return [];
    return recycledMap[currentNovelId] ?? [];
  }, [currentNovelId, recycledMap]);

  const selectedChapter = useMemo(() => getSelectedChapter(volumes), [volumes]);

  const setCurrentNovel = useCallback((novelId: number | null) => {
    setCurrentNovelIdState(novelId);
    if (novelId === null) {
      localStorage.removeItem(CURRENT_ID_KEY);
      return;
    }
    localStorage.setItem(CURRENT_ID_KEY, String(novelId));
  }, []);

  useEffect(() => {
    setNovels(readJson<WorkbenchNovel[]>(NOVELS_KEY, []));
    const raw = localStorage.getItem(CURRENT_ID_KEY);
    setCurrentNovelIdState(raw ? Number(raw) : null);
  }, []);

  useEffect(() => {
    if (!currentNovelId) return;
    if (volumesMap[currentNovelId]?.length) return;
    setVolumesMap((prev) => {
      const next = { ...prev, [currentNovelId]: createDefaultVolumes(currentNovel?.type ?? 'novel') };
      writeJson(VOLUMES_KEY, next);
      return next;
    });
  }, [currentNovel?.type, currentNovelId, volumesMap]);

  useEffect(() => {
    if (!currentNovelId || !selectedChapter) {
      setEditorContent('');
      return;
    }
    setEditorContent(readChapterContent(currentNovelId, selectedChapter.chapter.id));
  }, [currentNovelId, selectedChapter?.chapter.id]);

  const persistVolumes = useCallback((updater: (prev: Volume[]) => Volume[]) => {
    if (!currentNovelId) return;
    setVolumesMap((prevMap) => {
      const current = prevMap[currentNovelId] ?? createDefaultVolumes(currentNovel?.type ?? 'novel');
      const nextVolumes = ensureOneSelected(updater(current));
      const nextMap = { ...prevMap, [currentNovelId]: nextVolumes };
      writeJson(VOLUMES_KEY, nextMap);
      return nextMap;
    });
  }, [currentNovel?.type, currentNovelId]);

  const persistRecycled = useCallback((updater: (prev: RecycledChapter[]) => RecycledChapter[]) => {
    if (!currentNovelId) return;
    setRecycledMap((prevMap) => {
      const next = { ...prevMap, [currentNovelId]: updater(prevMap[currentNovelId] ?? []) };
      writeJson(RECYCLED_CHAPTERS_KEY, next);
      return next;
    });
  }, [currentNovelId]);

  const updateNovelWordCount = useCallback((nextVolumes: Volume[]) => {
    if (!currentNovelId) return;
    const wordCount = nextVolumes.reduce((sum, volume) => (
      sum + volume.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.wordCount, 0)
    ), 0);
    const nextNovels = novels.map((novel) => novel.id === currentNovelId
      ? { ...novel, wordCount, lastModifiedAt: formatDate() }
      : novel);
    setNovels(nextNovels);
    writeJson(NOVELS_KEY, nextNovels);
  }, [currentNovelId, novels]);

  const selectChapter = useCallback((volumeId: number, chapterId: number) => {
    persistVolumes((prev) => prev.map((volume) => ({
      ...volume,
      chapters: volume.chapters.map((chapter) => ({
        ...chapter,
        isSelected: volume.id === volumeId && chapter.id === chapterId,
      })),
    })));
  }, [persistVolumes]);

  const toggleVolume = useCallback((volumeId: number) => {
    persistVolumes((prev) => prev.map((volume) => volume.id === volumeId
      ? { ...volume, isExpanded: !volume.isExpanded }
      : volume));
  }, [persistVolumes]);

  const toggleSort = useCallback(() => {
    setSortAsc((prev) => {
      const next = !prev;
      localStorage.setItem(SORT_KEY, String(next));
      return next;
    });
  }, []);

  const addVolume = useCallback(() => {
    persistVolumes((prev) => {
      const nonOutlineCount = prev.filter((volume) => volume.name !== '集纲').length;
      return [
        ...prev,
        {
          id: uid(),
          name: `第${toChineseNumber(nonOutlineCount + 1)}卷`,
          isExpanded: true,
          chapters: [],
        },
      ];
    });
  }, [persistVolumes]);

  const addChapter = useCallback((volumeId: number) => {
    persistVolumes((prev) => {
      const targetVolume = prev.find((volume) => volume.id === volumeId);
      if (!targetVolume) return prev;

      const isOutline = targetVolume.name === '集纲';
      let serialNumber = 1;
      let title = '';

      if (isOutline) {
        const usedNumbers = new Set(targetVolume.chapters.map((chapter) => chapter.serialNumber));
        while (usedNumbers.has(serialNumber)) serialNumber += 1;
        title = `集纲${serialNumber}`;
      } else {
        const usedNumbers = new Set(
          prev
            .filter((volume) => volume.name !== '集纲')
            .flatMap((volume) => volume.chapters.map((chapter) => chapter.serialNumber)),
        );
        while (usedNumbers.has(serialNumber)) serialNumber += 1;
      }

      const newChapter: Chapter = {
        id: uid(),
        title,
        serialNumber,
        wordCount: 0,
        isSelected: true,
        isPublished: false,
      };

      return prev.map((volume) => ({
        ...volume,
        chapters: volume.id === volumeId
          ? [...volume.chapters.map((chapter) => ({ ...chapter, isSelected: false })), newChapter]
          : volume.chapters.map((chapter) => ({ ...chapter, isSelected: false })),
      }));
    });
  }, [persistVolumes]);

  const renameChapter = useCallback((chapterId: number, title: string) => {
    persistVolumes((prev) => prev.map((volume) => ({
      ...volume,
      chapters: volume.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, title } : chapter),
    })));
  }, [persistVolumes]);

  const deleteChapter = useCallback((volumeId: number, chapterId: number) => {
    if (!currentNovelId) return;
    let deleted: RecycledChapter | null = null;
    persistVolumes((prev) => {
      const volume = prev.find((item) => item.id === volumeId);
      const chapter = volume?.chapters.find((item) => item.id === chapterId);
      if (!volume || !chapter) return prev;

      const now = new Date();
      deleted = {
        ...chapter,
        volumeId,
        volumeName: volume.name,
        deletedAt: formatDate(now),
        expireAt: formatDate(addDays(now, 30)),
        content: readChapterContent(currentNovelId, chapterId),
      };

      return prev.map((item) => item.id === volumeId
        ? { ...item, chapters: item.chapters.filter((candidate) => candidate.id !== chapterId) }
        : item);
    });

    if (deleted) {
      persistRecycled((prev) => [deleted as RecycledChapter, ...prev]);
      localStorage.removeItem(getChapterContentKey(currentNovelId, chapterId));
    }
  }, [currentNovelId, persistRecycled, persistVolumes]);

  const restoreChapter = useCallback((chapterId: number) => {
    if (!currentNovelId) return;
    const target = recycledChapters.find((chapter) => chapter.id === chapterId);
    if (!target) return;

    persistRecycled((prev) => prev.filter((chapter) => chapter.id !== chapterId));
    persistVolumes((prev) => {
      const hasOriginalVolume = prev.some((volume) => volume.id === target.volumeId);
      const fallbackVolumeId = prev[0]?.id;
      const targetVolumeId = hasOriginalVolume ? target.volumeId : fallbackVolumeId;
      if (!targetVolumeId) return prev;

      const restored: Chapter = {
        id: target.id,
        title: target.title,
        serialNumber: target.serialNumber,
        wordCount: target.wordCount,
        isSelected: true,
        isPublished: target.isPublished,
      };
      writeChapterContent(currentNovelId, target.id, target.content);

      return prev.map((volume) => ({
        ...volume,
        chapters: volume.id === targetVolumeId
          ? [...volume.chapters.map((chapter) => ({ ...chapter, isSelected: false })), restored]
            .sort((a, b) => a.serialNumber - b.serialNumber)
          : volume.chapters.map((chapter) => ({ ...chapter, isSelected: false })),
      }));
    });
  }, [currentNovelId, persistRecycled, persistVolumes, recycledChapters]);

  const permanentDeleteChapter = useCallback((chapterId: number) => {
    persistRecycled((prev) => prev.filter((chapter) => chapter.id !== chapterId));
  }, [persistRecycled]);

  const saveContent = useCallback((content: string) => {
    setEditorContent(content);
    if (!currentNovelId || !selectedChapter) return;
    writeChapterContent(currentNovelId, selectedChapter.chapter.id, content);
    const wordCount = countWords(content);
    const nextVolumes = volumes.map((volume) => ({
      ...volume,
      chapters: volume.chapters.map((chapter) => chapter.id === selectedChapter.chapter.id
        ? { ...chapter, wordCount }
        : chapter),
    }));
    const nextMap = { ...volumesMap, [currentNovelId]: nextVolumes };
    setVolumesMap(nextMap);
    writeJson(VOLUMES_KEY, nextMap);
    updateNovelWordCount(nextVolumes);
    setLastSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [currentNovelId, selectedChapter, updateNovelWordCount, volumes, volumesMap]);

  return {
    novels,
    currentNovel,
    currentNovelId,
    volumesMap,
    volumes,
    recycledChapters,
    selectedChapter,
    editorContent,
    sortAsc,
    lastSavedAt,
    setCurrentNovel,
    selectChapter,
    toggleVolume,
    toggleSort,
    addVolume,
    addChapter,
    renameChapter,
    deleteChapter,
    restoreChapter,
    permanentDeleteChapter,
    saveContent,
  };
}
