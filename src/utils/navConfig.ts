/**
 * 导航配置管理
 * 导航数据使用 iconName 字符串存储（可序列化），运行时映射为 LucideIcon 组件
 */

import {
  User, LayoutGrid, BookOpen, FileText, Film, Database, Users,
  Settings, FolderOpen, FlaskConical, Lightbulb, ListTree, Library,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── icon 名称到组件的映射 ──
export const iconMap: Record<string, LucideIcon> = {
  User, LayoutGrid, BookOpen, FileText, Film, Database, Users, Settings, FolderOpen, FlaskConical, Lightbulb, ListTree, Library, Activity,
};

export function getIconByName(name: string): LucideIcon {
  return iconMap[name] || LayoutGrid;
}

// ── 序列化的导航项 ──
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

// ── 默认导航配置（与用户截图对齐） ──
export const DEFAULT_NAV_CONFIG: NavGroupConfig[] = [
  {
    title: '用户专区',
    iconName: 'User',
    hidden: false,
    items: [
      { iconName: 'LayoutGrid', label: '首页', to: '/dashboard' },
    ],
  },
  {
    title: '创作专区',
    iconName: 'BookOpen',
    hidden: false,
    items: [
      { iconName: 'BookOpen', label: '我的小说', to: '/novels' },
      { iconName: 'Film', label: '我的剧本', to: '/scripts' },
      { iconName: 'Database', label: '资料库', to: '/materials' },
      { iconName: 'Database', label: '提示词管理', to: '/prompts' },
      { iconName: 'Settings', label: '模型管理', to: '/model-manage' },
      { iconName: 'Database', label: '数据库设置', to: '/db-settings' },
    ],
  },
  {
    title: '功能专区',
    iconName: 'Lightbulb',
    hidden: false,
    items: [
      { iconName: 'Lightbulb', label: '脑洞生成器', to: '/idea-generator' },
      { iconName: 'ListTree', label: '大纲生成器', to: '/outline-generator' },
      { iconName: 'Library', label: '脑洞库', to: '/idea-library' },
    ],
  },
  {
    title: '测试专区',
    iconName: 'FlaskConical',
    hidden: false,
    items: [
      { iconName: 'Activity', label: '调用数据', to: '/call-data' },
      { iconName: 'Settings', label: '按钮颜色', to: '/button-test' },
      { iconName: 'Settings', label: '测试1', to: '/test1' },
    ],
  },

];

// 修改 key 名称强制刷新（当默认导航结构变更时使用新 key）
const NAV_CONFIG_KEY = 'nav_config_v35';

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

// 当前默认配置中所有合法的导航标签（用于检测缓存是否过期）
const DEFAULT_LABELS = new Set(
  DEFAULT_NAV_CONFIG.flatMap((g) => g.items.map((i) => i.label))
);

export function loadNavConfig(): NavGroupConfig[] {
  try {
    const raw = localStorage.getItem(NAV_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidNavConfig(parsed)) {
        // 检测是否为旧格式：包含已废弃的导航组标题
        const hasOldZone = parsed.some((g: NavGroupConfig) =>
          ['作家专区', '编剧专区', '测试专区', '其他功能'].includes(g.title)
        );
        if (hasOldZone) {
          localStorage.removeItem(NAV_CONFIG_KEY);
          return JSON.parse(JSON.stringify(DEFAULT_NAV_CONFIG));
        }
        // 检测缓存中是否包含当前默认配置中不存在的导航项
        const hasStaleItem = parsed.some((g: NavGroupConfig) =>
          g.items?.some((item: NavItemConfig) => !DEFAULT_LABELS.has(item.label))
        );
        if (hasStaleItem) {
          localStorage.removeItem(NAV_CONFIG_KEY);
          return JSON.parse(JSON.stringify(DEFAULT_NAV_CONFIG));
        }
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
