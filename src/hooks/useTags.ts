import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_TAGS, TAG_CATEGORIES, getCategoryColor } from '@/data/defaultTags';

/* ─── 标签类型 ─── */
export interface TagItem {
  id: string;
  name: string;
  category: string;
  color: string;
  count: number;
}

const TAGS_STORAGE_KEY = 'material_tags_v2';

/* ─── 初始化默认标签 ─── */
function initDefaultTags(): TagItem[] {
  return DEFAULT_TAGS.map((t, i) => ({
    id: `default_${i}`,
    name: t.name,
    category: t.category,
    color: getCategoryColor(t.category),
    count: 0,
  }));
}

/* ─── 加载标签 ─── */
function loadTags(): TagItem[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 补充新增的系统默认标签
        const existingNames = new Set(parsed.map((t: TagItem) => t.name));
        const merged = [...parsed];
        for (const dt of initDefaultTags()) {
          if (!existingNames.has(dt.name)) merged.push(dt);
        }
        return merged;
      }
    }
  } catch { /* ignore */ }
  return initDefaultTags();
}

/* ─── 保存标签 ─── */
function saveTags(tags: TagItem[]) {
  try { localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags)); } catch { /* ignore */ }
}

/* ─── React Hook ─── */
export function useTags() {
  const [tags, setTags] = useState<TagItem[]>(loadTags);

  // 自动保存
  useEffect(() => { saveTags(tags); }, [tags]);

  // 同步
  useEffect(() => {
    const handler = () => setTags(loadTags());
    window.addEventListener('tags_updated', handler);
    return () => window.removeEventListener('tags_updated', handler);
  }, []);

  // 按分类分组
  const tagsByCategory = useMemo(() => {
    const map: Record<string, TagItem[]> = {};
    for (const cat of TAG_CATEGORIES) map[cat] = [];
    for (const tag of tags) {
      if (!map[tag.category]) map[tag.category] = [];
      map[tag.category].push(tag);
    }
    return map;
  }, [tags]);

  // 添加标签
  const addTag = useCallback((name: string, category: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setTags(prev => {
      if (prev.some(t => t.name === trimmed)) return prev;
      return [...prev, {
        id: `user_${Date.now()}`,
        name: trimmed,
        category,
        color: getCategoryColor(category),
        count: 0,
      }];
    });
    return true;
  }, []);

  // 批量导入标签
  const importTags = useCallback((text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const imported: string[] = [];
    let currentCategory = '主角设定与开局逻辑';

    setTags(prev => {
      const next = [...prev];
      const existingNames = new Set(next.map(t => t.name));

      for (const line of lines) {
        // 检测分类标题
        if (line.includes('主角设定') || line.includes('Identity')) {
          currentCategory = '主角设定与开局逻辑';
          continue;
        }
        if (line.includes('剧情推进') || line.includes('Action')) {
          currentCategory = '剧情推进与爽点逻辑';
          continue;
        }
        if (line.includes('社交交互') || line.includes('Relation')) {
          currentCategory = '社交交互与情感反馈';
          continue;
        }
        if (line.includes('场景') || line.includes('Context')) {
          currentCategory = '场景、结构与氛围锚点';
          continue;
        }

        // 提取 #标签
        const hashMatches = line.match(/#([^\s#【】]+)/g);
        if (hashMatches) {
          for (const match of hashMatches) {
            const name = match.startsWith('#') ? match : `#${match}`;
            if (!existingNames.has(name)) {
              existingNames.add(name);
              next.push({
                id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name,
                category: currentCategory,
                color: getCategoryColor(currentCategory),
                count: 0,
              });
              imported.push(name);
            }
          }
        }

        // 提取 **标签**
        const boldMatches = line.match(/\*\*#?([^\s*#【】]+)\*\*/g);
        if (boldMatches) {
          for (const match of boldMatches) {
            const name = match.replace(/\*\*/g, '');
            const finalName = name.startsWith('#') ? name : `#${name}`;
            if (!existingNames.has(finalName)) {
              existingNames.add(finalName);
              next.push({
                id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: finalName,
                category: currentCategory,
                color: getCategoryColor(currentCategory),
                count: 0,
              });
              imported.push(finalName);
            }
          }
        }
      }
      return next;
    });

    return imported;
  }, []);

  // 删除标签
  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);

  // 重命名标签
  const renameTag = useCallback((id: string, newName: string) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, name: newName.trim() } : t));
  }, []);

  // 更新标签计数（根据剧情点关联）
  const updateCounts = useCallback((tagNames: string[]) => {
    const counts: Record<string, number> = {};
    for (const name of tagNames) {
      counts[name] = (counts[name] || 0) + 1;
    }
    setTags(prev => prev.map(t => ({ ...t, count: counts[t.name] || 0 })));
  }, []);

  return {
    tags,
    tagsByCategory,
    categories: TAG_CATEGORIES,
    addTag,
    importTags,
    deleteTag,
    renameTag,
    updateCounts,
  };
}
