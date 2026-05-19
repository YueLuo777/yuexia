import { useMemo } from 'react';

import type { ExtractChapter, ExtractNovel } from '@/features/extract/model/extractTypes';
import type { Volume, WorkbenchNovel } from '@/features/workbench/model/workbenchTypes';

const NOVELS_KEY = 'xinyuexia_novels_v1';
const VOLUMES_KEY = 'xinyuexia_volumes_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function contentKey(novelId: number, chapterId: number) {
  return `xinyuexia_novel_${novelId}_chapter_${chapterId}`;
}

export function useExtractNovels() {
  return useMemo<ExtractNovel[]>(() => {
    const novels = readJson<WorkbenchNovel[]>(NOVELS_KEY, []);
    const volumesMap = readJson<Record<number, Volume[]>>(VOLUMES_KEY, {});

    return novels.map((novel) => {
      const chapters: ExtractChapter[] = (volumesMap[novel.id] ?? [])
        .flatMap((volume) => volume.chapters)
        .sort((a, b) => a.serialNumber - b.serialNumber)
        .map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          serialNumber: chapter.serialNumber,
          wordCount: chapter.wordCount,
          content: localStorage.getItem(contentKey(novel.id, chapter.id)) ?? '',
        }));

      return {
        id: novel.id,
        title: novel.title,
        type: novel.type,
        chapters,
      };
    });
  }, []);
}
