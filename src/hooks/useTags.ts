import { useState, useEffect, useCallback, useMemo } from 'react';

/* ─── 标签分类 ─── */
export interface TagCategory {
  name: string;
  description?: string;
  color: string;
}

/* ─── 标签项 ─── */
export interface TagItem {
  id: string;
  name: string;
  category: string;
  color: string;
  count: number;
  description?: string;
  catDescription?: string; // 分类说明，由导入时定义
}

/* ─── 分类说明 ─── */
const CAT_DESCRIPTIONS: Record<string, string> = {
  '主角设定': '界定主角的初始身份、阶层开局以及安身立命的核心外挂。决定了主角靠什么底牌在世界中立足、升级和降维打击，是整个故事的原动力与能力天花板。',
  '剧情推进': '涵盖主角在面对危机、解谜和对抗时的破局手段与战术谋略。包括各种阴谋阳谋、绝境逃生、算计布局以及推动故事向前发展的功能性套路。',
  '高潮爽点': '集中体现情绪释放与多巴胺分泌的爆发节点。包括花式虐渣、装逼打脸、绝地反杀、震撼全场的视觉奇观，以及让反派陷入极度绝望的终极制裁。',
  '地图场景': '界定事件发生的核心物理空间与特殊环境。包含各种用于换地图、下副本、生死试炼或捡漏淘宝的特定场域，为剧情提供背景舞台与互动规则。',
  '女性相关': '囊括故事中所有的情感羁绊、修罗场拉扯以及女性角色的宿命纠葛。不仅包含谈情说爱，还包括背叛反目、倒追火葬场、契约婚姻等极致的情感冲突。',
};

/* ─── 分类颜色 ─── */
const CAT_COLORS: Record<string, string> = {
  '默认分类': '#6B7280',
};

function getCatColor(name: string): string {
  if (CAT_COLORS[name]) return CAT_COLORS[name];
  // 随机分配颜色
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = colors[hash % colors.length];
  CAT_COLORS[name] = color;
  return color;
}

const TAGS_STORAGE_KEY = 'material_tags_v3';

/* ─── 加载标签 ─── */
function loadTags(): TagItem[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // 数据迁移：将"主角设定"分类的标签移到"剧情推进"
        let migrated = false;
        for (const t of parsed) {
          if (t.category === '主角设定') {
            t.category = '剧情推进';
            t.color = getCatColor('剧情推进');
            migrated = true;
          }
        }
        if (migrated) saveTags(parsed);

        // 用新的 CAT_DESCRIPTIONS 覆盖旧的 catDescription
        for (const t of parsed) {
          if (t.category && CAT_DESCRIPTIONS[t.category]) {
            t.catDescription = CAT_DESCRIPTIONS[t.category];
          }
        }
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return [];
}

/* ─── 保存标签 ─── */
function saveTags(tags: TagItem[]) {
  try { localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags)); } catch { /* ignore */ }
}

/* ─── 清空标签 ─── */
export function clearTags() {
  localStorage.removeItem(TAGS_STORAGE_KEY);
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

  // 提取所有分类
  const categories = useMemo(() => {
    const map = new Map<string, { color: string; catDescription?: string }>();
    for (const t of tags) {
      if (!map.has(t.category)) {
        map.set(t.category, { color: t.color, catDescription: t.catDescription });
      }
    }
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      // 优先使用标签数据中存储的分类说明，其次 fallback 到硬编码
      description: data.catDescription || CAT_DESCRIPTIONS[name] || undefined,
      color: data.color,
    }));
  }, [tags]);

  // 按分类分组
  const tagsByCategory = useMemo(() => {
    const map: Record<string, TagItem[]> = {};
    for (const t of tags) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return map;
  }, [tags]);

  // 添加单标签
  const addTag = useCallback((name: string, category: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    setTags(prev => {
      if (prev.some(t => t.name === trimmed)) return prev;
      return [...prev, {
        id: `user_${Date.now()}`,
        name: trimmed,
        category,
        color: getCatColor(category),
        count: 0,
        description,
      }];
    });
    return true;
  }, []);

  // ═══════════════════════════════════════
  // 批量导入标签（新格式）
  // ═══════════════════════════════════════
  // 分类格式：*分类名：分类说明*
  // 标签格式：【标签名：标签说明】
  // 支持指定 targetCategory：强制将所有标签归入该分类
  const importTags = useCallback((text: string, targetCategory?: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const imported: { name: string; category: string }[] = [];
    let currentCategory = targetCategory || '默认分类';
    let currentCatDesc = '';

    setTags(prev => {
      const next = [...prev];
      const existingNames = new Set(next.map(t => t.name));

      for (const line of lines) {
        // 如果指定了目标分类，跳过文本中的分类定义行，只读标签
        if (targetCategory) {
          // 只匹配标签：【标签名：标签说明】
          const tagMatch = line.match(/【([^【】]+?)\s*[：:]\s*(.+?)】/);
          if (tagMatch) {
            const tagName = tagMatch[1].trim();
            const tagDesc = tagMatch[2].trim();
            if (tagName && !existingNames.has(tagName)) {
              existingNames.add(tagName);
              next.push({
                id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: tagName,
                category: targetCategory,
                color: getCatColor(targetCategory),
                description: tagDesc || undefined,
                catDescription: '',
                count: 0,
              });
              imported.push({ name: tagName, category: targetCategory });
            }
            continue;
          }
          // 兼容旧格式
          const oldMatch = line.match(/\*\*([^\s*【】#]+)\*\*\s*[：:]\s*#?(.+)/);
          if (oldMatch) {
            const tagName = oldMatch[1].trim();
            const tagDesc = oldMatch[2].trim();
            if (tagName && !existingNames.has(tagName)) {
              existingNames.add(tagName);
              next.push({
                id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: `#${tagName}`,
                category: targetCategory,
                color: getCatColor(targetCategory),
                description: tagDesc || undefined,
                catDescription: '',
                count: 0,
              });
              imported.push({ name: `#${tagName}`, category: targetCategory });
            }
          }
          continue;
        }

        // 未指定目标分类：按文本中的分类定义解析
        // 1. 匹配分类：*分类名：分类说明*
        const catMatch = line.match(/\*([^*]+?)\s*[：:]\s*(.+?)\*$/);
        if (catMatch) {
          currentCategory = catMatch[1].trim();
          currentCatDesc = catMatch[2].trim();
          CAT_COLORS[currentCategory] = getCatColor(currentCategory);
          continue;
        }

        // 2. 匹配标签：【标签名：标签说明】
        const tagMatch = line.match(/【([^【】]+?)\s*[：:]\s*(.+?)】/);
        if (tagMatch) {
          const tagName = tagMatch[1].trim();
          const tagDesc = tagMatch[2].trim();

          if (tagName && !existingNames.has(tagName)) {
            existingNames.add(tagName);
            next.push({
              id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: tagName,
              category: currentCategory,
              color: getCatColor(currentCategory),
              description: tagDesc || undefined,
              catDescription: currentCatDesc || undefined,
              count: 0,
            });
            imported.push({ name: tagName, category: currentCategory });
          }
          continue;
        }

        // 3. 兼容旧格式：**标签名**：#说明
        const oldMatch = line.match(/\*\*([^\s*【】#]+)\*\*\s*[：:]\s*#?(.+)/);
        if (oldMatch) {
          const tagName = oldMatch[1].trim();
          const tagDesc = oldMatch[2].trim();

          if (tagName && !existingNames.has(tagName)) {
            existingNames.add(tagName);
            next.push({
              id: `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: `#${tagName}`,
              category: currentCategory,
              color: getCatColor(currentCategory),
              description: tagDesc || undefined,
              catDescription: currentCatDesc || undefined,
              count: 0,
            });
            imported.push({ name: `#${tagName}`, category: currentCategory });
          }
        }
      }
      // 立即保存到 localStorage，避免事件触发时读取到旧数据
      saveTags(next);
      return next;
    });

    return imported;
  }, []);

  // 删除标签
  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);

  // 移动标签到其他分类
  const moveTag = useCallback((id: string, newCategory: string) => {
    setTags(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        category: newCategory,
        color: getCatColor(newCategory),
      };
    }));
  }, []);

  // 重命名标签
  const renameTag = useCallback((id: string, newName: string) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, name: newName.trim() } : t));
  }, []);

  // 更新标签计数
  const updateCounts = useCallback((tagNames: string[]) => {
    const counts: Record<string, number> = {};
    for (const name of tagNames) {
      counts[name] = (counts[name] || 0) + 1;
    }
    setTags(prev => prev.map(t => ({ ...t, count: counts[t.name] || 0 })));
  }, []);

  // 清空
  const clear = useCallback(() => {
    setTags([]);
    saveTags([]);
  }, []);

  return {
    tags,
    tagsByCategory,
    categories,
    addTag,
    importTags,
    deleteTag,
    moveTag,
    renameTag,
    updateCounts,
    clear,
  };
}
