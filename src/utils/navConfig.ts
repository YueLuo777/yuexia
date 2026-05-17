/**
 * 导航配置管理
 */

import {
  User, LayoutGrid, BookOpen, FileText, Film, Database, Users,
  Settings, FolderOpen, FlaskConical, Lightbulb, ListTree, Library,
  Activity, Tag, Sparkles, Cloud, Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  User, LayoutGrid, BookOpen, FileText, Film, Database, Users, Settings, FolderOpen, FlaskConical, Lightbulb, ListTree, Library, Activity, Tag, Sparkles, Cloud, Palette,
};

export function getIconByName(name: string): LucideIcon {
  return iconMap[name] || LayoutGrid;
}

export interface NavItemConfig {
  iconName: string;
  label: string;
  to?: string;
  action?: string;
  hidden?: boolean;
}

export interface NavGroupConfig {
  title: string;
  iconName: string;
  hidden?: boolean;
  items: NavItemConfig[];
}

// ── 默认导航配置（优化布局：分布均匀） ──
export const DEFAULT_NAV_CONFIG: NavGroupConfig[] = [
  {
    title: '常用',
    iconName: 'LayoutGrid',
    hidden: false,
    items: [
      { iconName: 'LayoutGrid', label: '首页', to: '/dashboard' },
      { iconName: 'BookOpen', label: '我的小说', to: '/novels' },
      { iconName: 'Film', label: '我的剧本', to: '/scripts' },
      { iconName: 'Sparkles', label: '提炼剧情', to: '/extract' },
    ],
  },
  {
    title: '数据库',
    iconName: 'Database',
    hidden: false,
    items: [
      { iconName: 'Database', label: '资料库', to: '/materials' },
      { iconName: 'Tag', label: '提示词管理', to: '/prompts' },
      { iconName: 'Cloud', label: '云端设置', to: '/db-settings' },
      { iconName: 'Settings', label: '模型管理', to: '/model-manage' },
    ],
  },
  {
    title: '工具箱',
    iconName: 'Lightbulb',
    hidden: false,
    items: [
      { iconName: 'Lightbulb', label: '脑洞生成器', to: '/idea-generator' },
      { iconName: 'ListTree', label: '大纲生成器', to: '/outline-generator' },
      { iconName: 'Library', label: '脑洞库', to: '/idea-library' },
    ],
  },
  {
    title: '测试',
    iconName: 'FlaskConical',
    hidden: true,
    items: [
      { iconName: 'Activity', label: '调用数据', to: '/call-data' },
      { iconName: 'Palette', label: '按钮颜色', to: '/button-test' },
    ],
  },
];

// 递增版本号强制刷新旧缓存
const NAV_CONFIG_KEY = 'nav_config_v43';

function isValidNavConfig(config: unknown): config is NavGroupConfig[] {
  if (!Array.isArray(config)) return false;
  if (config.length === 0) return false;
  return config.every((g) =>
    g && typeof g === 'object' &&
    typeof g.title === 'string' && g.title.length > 0 &&
    typeof g.iconName === 'string' && g.iconName.length > 0 &&
    (g.hidden === undefined || typeof g.hidden === 'boolean') &&
    Array.isArray(g.items) &&
    g.items.every((item: NavItemConfig) =>
      item && typeof item === 'object' &&
      typeof item.iconName === 'string' && item.iconName.length > 0 &&
      typeof item.label === 'string' && item.label.length > 0
    )
  );
}

const NAV_CONFIG_VERSION_KEY = 'nav_config_version';
const CURRENT_NAV_VERSION = 'v43';

export function loadNavConfig(): NavGroupConfig[] {
  try {
    const savedVersion = localStorage.getItem(NAV_CONFIG_VERSION_KEY);
    const raw = localStorage.getItem(NAV_CONFIG_KEY);

    // 版本升级：保留用户的 hidden 设置，使用新的默认结构
    if (savedVersion !== CURRENT_NAV_VERSION) {
      localStorage.setItem(NAV_CONFIG_VERSION_KEY, CURRENT_NAV_VERSION);

      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidNavConfig(parsed)) {
          // 构建旧配置的 hidden 映射（按组标题）
          const oldHiddenMap: Record<string, boolean> = {};
          for (const g of parsed) {
            oldHiddenMap[g.title] = g.hidden || false;
            for (const item of g.items) {
              oldHiddenMap[g.title + '::' + item.label] = item.hidden || false;
            }
          }
          // 应用 hidden 设置到新默认结构
          const fresh = JSON.parse(JSON.stringify(DEFAULT_NAV_CONFIG)) as NavGroupConfig[];
          for (const g of fresh) {
            if (oldHiddenMap[g.title] !== undefined) {
              g.hidden = oldHiddenMap[g.title];
            }
            for (const item of g.items) {
              const key = g.title + '::' + item.label;
              if (oldHiddenMap[key] !== undefined) {
                item.hidden = oldHiddenMap[key];
              }
            }
          }
          saveNavConfig(fresh);
          return fresh;
        }
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidNavConfig(parsed)) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(DEFAULT_NAV_CONFIG));
}

export function saveNavConfig(config: NavGroupConfig[]) {
  try { localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

export function resetNavConfig(): NavGroupConfig[] {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_NAV_CONFIG));
  saveNavConfig(fresh);
  return fresh;
}
