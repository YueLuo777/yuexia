import { useState, useCallback } from 'react';

export interface PlotLibraryItem {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  chapter: string;
  sourceFile: string;
  createdAt: string;
}

const PLOT_LIBRARY_KEY = 'plot_library_v1';

/** 模块 key → 动态获取当前 label，解决改名兼容性问题 */
const MODULE_KEYS_TO_REMOVE = new Set(['jiazhipinggu', 'juqingleixing']);

/**
 * 从正文中删除指定 Markdown 模块（标题+内容）
 * 基于模块 key（如 jiazhipinggu）动态查找当前 label，避免硬编码中文名称
 * 保留 <fs> 和 <bq> 锚点（用于卡片左右结构提取）
 */
function removeModules(
  content: string,
  allModules?: Record<string, { label: string }>
): string {
  // 动态构建要移除的 label 集合（基于模块 key，不受改名影响）
  const labelsToRemove = new Set<string>();
  if (allModules) {
    for (const key of MODULE_KEYS_TO_REMOVE) {
      const mod = allModules[key];
      if (mod) labelsToRemove.add(mod.label);
    }
  } else {
    // fallback：如果未传入模块配置，尝试使用硬编码
    labelsToRemove.add('评分');
    labelsToRemove.add('主题标签');
  }

  const lines = content.split('\n');
  const result: string[] = [];
  let skipModule = false;
  let inAnchorBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (/^---+$/.test(trimmed)) {
      skipModule = false;
      inAnchorBlock = false;
      result.push(line);
      continue;
    }
    
    if (/^<(fs|bq)>/.test(trimmed)) {
      inAnchorBlock = true;
      result.push(line);
      continue;
    }
    
    if (/^<\/(fs|bq)>/.test(trimmed)) {
      inAnchorBlock = false;
      result.push(line);
      continue;
    }
    
    if (inAnchorBlock) {
      result.push(line);
      continue;
    }
    
    if (/^#\s/.test(trimmed)) {
      const title = trimmed.replace(/^#\s*/, '').trim();
      if (skipModule) {
        skipModule = false;
      }
      if (labelsToRemove.has(title)) {
        skipModule = true;
        continue;
      }
    }
    
    if (!skipModule) {
      result.push(line);
    }
  }
  
  let cleaned = result.join('\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

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

export type { PlotLibraryItem };

/**
 * 纯函数：将剧情点导入剧情库
 * @param allModules 当前模块配置（用于动态获取模块 label，支持改名后正确移除）
 */
export function importToPlotLibrary(
  points: Array<{ _raw?: string; _chapter?: string }>,
  sourceFile: string = '未知文件',
  allModules?: Record<string, { label: string }>
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
      // 存储前删除评分和主题标签模块（基于key动态匹配当前label，支持改名）
      const cleaned = removeModules(raw, allModules);
      const titleMatch = cleaned.match(/^#\s*(.+)/m);
      const title = titleMatch ? titleMatch[1].slice(0, 40) : `剧情点 ${existing.length + i + 1}`;
      return {
        id: `plot_${Date.now()}_${i}`,
        title,
        content: cleaned,
        wordCount: cleaned.length,
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

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveLibrary(next);
      return next;
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<Pick<PlotLibraryItem, 'title' | 'content' | 'chapter'>>) => {
    setItems((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.content !== undefined) {
          updated.wordCount = updates.content.length;
        }
        return updated;
      });
      saveLibrary(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    saveLibrary([]);
  }, []);

  return { items, addItems, deleteItem, updateItem, clearAll };
}
