import { useState, useCallback } from 'react';

export interface PlotLibraryItem {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  chapter: string;
  sourceFile: string;
  createdAt: string;
  tags?: string[];
}

const PLOT_LIBRARY_KEY = 'plot_library_v1';

function loadLibrary(): PlotLibraryItem[] {
  try {
    const raw = localStorage.getItem(PLOT_LIBRARY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return [];
}

function saveLibrary(items: PlotLibraryItem[]) {
  try {
    localStorage.setItem(PLOT_LIBRARY_KEY, JSON.stringify(items));
  } catch { /* */ }
}

/**
 * 剧情库数据管理
 */
/**
 * 纯函数：将剧情点导入剧情库（不依赖React hook）
 * @param points 要导入的剧情点（_raw 为 Markdown 内容，_chapter 为章节名）
 */
export function importToPlotLibrary(
  points: Array<{ _raw?: string; _chapter?: string }>,
  sourceFile: string = '未知文件'
): number {
  try {
    const existing = loadLibrary();
    const now = new Date().toISOString();
    const SKIP_KEYWORDS = ['无实质剧情点', '未达到提炼标准', '无可提炼剧情点', '跳过'];

    const validPoints = points.filter((p) => {
      const raw = ((p as any)._raw || '').trim();
      if (!raw) return false;
      const lower = raw.toLowerCase();
      return !SKIP_KEYWORDS.some((kw) => lower.includes(kw));
    });

    const toAdd: PlotLibraryItem[] = validPoints.map((p, i) => {
      const raw = ((p as any)._raw || '').trim();
      const chapter = ((p as any)._chapter || '').trim();
      // 提取第一个 #标题 作为剧情点标题
      const titleMatch = raw.match(/^#\s*(.+)/m);
      const title = titleMatch ? titleMatch[1].slice(0, 40) : `剧情点 ${existing.length + i + 1}`;
      return {
        id: `plot_${Date.now()}_${i}`,
        title,
        content: raw,
        wordCount: raw.length,
        chapter,
        sourceFile,
        createdAt: now,
      };
    });

    const next = [...existing, ...toAdd];
    saveLibrary(next);
    return toAdd.length;
  } catch {
    return 0;
  }
}

export function usePlotLibrary() {
  const [items, setItems] = useState<PlotLibraryItem[]>(() => loadLibrary());

  /** 添加剧情点 */
  const addItems = useCallback((newItems: Omit<PlotLibraryItem, 'id' | 'createdAt' | 'wordCount'>[]) => {
    const now = new Date().toISOString();
    const toAdd: PlotLibraryItem[] = newItems.map((item, i) => ({
      ...item,
      id: `plot_${Date.now()}_${i}`,
      createdAt: now,
      wordCount: item.content.length,
    }));
    setItems((prev) => {
      const next = [...prev, ...toAdd];
      saveLibrary(next);
      return next;
    });
  }, []);

  /** 删除剧情点 */
  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveLibrary(next);
      return next;
    });
  }, []);

  /** 清空剧情库 */
  const clearAll = useCallback(() => {
    setItems([]);
    saveLibrary([]);
  }, []);

  return { items, addItems, deleteItem, clearAll };
}
