import {
  Activity,
  BookOpen,
  Cloud,
  Database,
  Film,
  FlaskConical,
  FolderOpen,
  LayoutGrid,
  Library,
  Lightbulb,
  ListTree,
  Palette,
  Settings,
  Sparkles,
  Star,
  Tag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItemConfig {
  iconName: string;
  label: string;
  to: string;
  hidden?: boolean;
}

export interface NavGroupConfig {
  title: string;
  iconName: string;
  hidden?: boolean;
  items: NavItemConfig[];
}

const iconMap: Record<string, LucideIcon> = {
  Activity,
  BookOpen,
  Cloud,
  Database,
  Film,
  FlaskConical,
  FolderOpen,
  LayoutGrid,
  Library,
  Lightbulb,
  ListTree,
  Palette,
  Settings,
  Sparkles,
  Star,
  Tag,
};

export function getIconByName(name: string): LucideIcon {
  return iconMap[name] ?? LayoutGrid;
}

export const DEFAULT_NAV_CONFIG: NavGroupConfig[] = [
  {
    title: '首页专区',
    iconName: 'LayoutGrid',
    items: [{ iconName: 'LayoutGrid', label: '首页', to: '/dashboard' }],
  },
  {
    title: '创作专区',
    iconName: 'BookOpen',
    items: [
      { iconName: 'BookOpen', label: '我的小说', to: '/novels' },
      { iconName: 'Film', label: '我的剧本', to: '/scripts' },
      { iconName: 'Sparkles', label: '提炼剧情', to: '/extract' },
      { iconName: 'Star', label: '剧情库', to: '/plot-library' },
    ],
  },
  {
    title: '数据专区',
    iconName: 'Database',
    items: [
      { iconName: 'Database', label: '资料库', to: '/materials' },
      { iconName: 'Tag', label: '提示词管理', to: '/prompts' },
      { iconName: 'Settings', label: '模型管理', to: '/model-manage' },
      { iconName: 'Cloud', label: '云端设置', to: '/db-settings' },
    ],
  },
  {
    title: '功能专区',
    iconName: 'Lightbulb',
    items: [
      { iconName: 'Lightbulb', label: '脑洞生成器', to: '/idea-generator' },
      { iconName: 'ListTree', label: '大纲生成器', to: '/outline-generator' },
      { iconName: 'Library', label: '脑洞库', to: '/idea-library' },
    ],
  },
  {
    title: '测试专区',
    iconName: 'FlaskConical',
    hidden: true,
    items: [
      { iconName: 'Activity', label: '调用数据', to: '/call-data' },
      { iconName: 'Palette', label: '按钮颜色', to: '/button-test' },
    ],
  },
];

const NAV_CONFIG_KEY = 'xinyuexia_nav_config_v1';
const COLLAPSED_KEY = 'xinyuexia_sidebar_collapsed_v1';

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_NAV_CONFIG)) as NavGroupConfig[];
}

function isValidConfig(config: unknown): config is NavGroupConfig[] {
  return Array.isArray(config) && config.every((group) => (
    group &&
    typeof group === 'object' &&
    typeof group.title === 'string' &&
    typeof group.iconName === 'string' &&
    Array.isArray(group.items)
  ));
}

export function loadNavConfig(): NavGroupConfig[] {
  try {
    const raw = localStorage.getItem(NAV_CONFIG_KEY);
    if (!raw) return cloneDefaultConfig();
    const parsed: unknown = JSON.parse(raw);
    return isValidConfig(parsed) ? parsed : cloneDefaultConfig();
  } catch {
    return cloneDefaultConfig();
  }
}

export function saveNavConfig(config: NavGroupConfig[]) {
  localStorage.setItem(NAV_CONFIG_KEY, JSON.stringify(config));
}

export function resetNavConfig() {
  const fresh = cloneDefaultConfig();
  saveNavConfig(fresh);
  return fresh;
}

export function loadCollapsedSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? JSON.parse(raw) as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

export function saveCollapsedSections(value: Record<string, boolean>) {
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(value));
}
