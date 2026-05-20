import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Minus, Plus, Search, Square, X } from 'lucide-react';

import { NavSettingsModal } from '@/shared/navigation/NavSettingsModal';
import {
  getIconByName,
  loadCollapsedSections,
  loadNavConfig,
  resetNavConfig,
  saveCollapsedSections,
  saveNavConfig,
  type NavGroupConfig,
} from '@/shared/navigation/navConfig';

declare global {
  interface Window {
    xinyuexiaWindow?: {
      minimize: () => Promise<void>;
      maximizeToggle: () => Promise<boolean>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      reload: () => Promise<void>;
    };
  }
}

const APP_SCALE_KEY = 'xinyuexia_app_scale';

function loadScale() {
  try {
    const raw = Number(localStorage.getItem(APP_SCALE_KEY) ?? '1.1');
    if (!Number.isFinite(raw)) return 1.1;
    return Math.max(0.8, Math.min(1.5, raw));
  } catch {
    return 1.1;
  }
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [navConfig, setNavConfig] = useState<NavGroupConfig[]>(() => loadNavConfig());
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => loadCollapsedSections());
  const [showNavSettings, setShowNavSettings] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [appScale, setAppScale] = useState(loadScale);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.style.zoom = String(appScale);
    localStorage.setItem(APP_SCALE_KEY, String(appScale));
  }, [appScale]);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const saved = Number.parseInt(localStorage.getItem('xinyuexia_nav_scroll') ?? '0', 10);
    if (saved > 0) el.scrollTop = saved;
    const onScroll = () => localStorage.setItem('xinyuexia_nav_scroll', String(el.scrollTop));
    el.addEventListener('scroll', onScroll);
    return () => {
      localStorage.setItem('xinyuexia_nav_scroll', String(el.scrollTop));
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    window.xinyuexiaWindow?.isMaximized().then((value) => {
      if (mounted) setIsMaximized(value);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        void window.xinyuexiaWindow?.reload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      saveCollapsedSections(next);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-base font-bold text-white">
            月
          </div>
          <span className="text-base font-bold text-gray-900">月下写作</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => navigate('/novels')}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="打开作品列表"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="ml-1 flex items-center rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setAppScale((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
              className="px-2 py-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              title="缩小 10%"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[44px] text-center text-[11px] text-gray-500">{Math.round(appScale * 100)}%</span>
            <button
              onClick={() => setAppScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1))))}
              className="px-2 py-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              title="放大 10%"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => void window.xinyuexiaWindow?.minimize()}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="最小化"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={async () => {
              const next = await window.xinyuexiaWindow?.maximizeToggle();
              if (typeof next === 'boolean') setIsMaximized(next);
            }}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title={isMaximized ? '还原' : '最大化'}
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => void window.xinyuexiaWindow?.close()}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          ref={sidebarRef}
          className="flex w-[180px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-gray-200 bg-white"
        >
          {navConfig.filter((group) => !group.hidden).map((group) => {
            const GroupIcon = getIconByName(group.iconName);
            const isCollapsed = collapsedSections[group.title] ?? false;

            return (
              <div key={group.title} className="mb-1">
                <button
                  onClick={() => toggleSection(group.title)}
                  className="mx-1 mt-1 flex w-[calc(100%-8px)] items-center justify-between rounded-md bg-brand-light px-3 py-1.5 font-medium text-brand-dark transition-colors hover:bg-brand/10"
                  style={{ fontSize: '12px' }}
                >
                  <span className="flex items-center gap-1.5">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span>{group.title}</span>
                  </span>
                  {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {!isCollapsed && group.items.filter((item) => !item.hidden).map((item) => {
                  const ItemIcon = getIconByName(item.iconName);
                  const isActive = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2.5 px-4 py-2 transition-colors ${
                        isActive
                          ? 'border-l-[3px] border-orange-500 bg-orange-50 font-medium text-orange-500'
                          : 'border-l-[3px] border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <ItemIcon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          <div className="mt-auto border-t border-gray-100 p-4">
            <button
              onClick={() => setShowNavSettings(true)}
              className="flex w-full items-center justify-center whitespace-nowrap rounded-md bg-brand px-3 py-2 text-xs text-white transition-colors hover:bg-brand-dark"
            >
              导航设置
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <NavSettingsModal
        isOpen={showNavSettings}
        onClose={() => setShowNavSettings(false)}
        config={navConfig}
        onSave={(next) => {
          setNavConfig(next);
          saveNavConfig(next);
        }}
        onReset={() => {
          const fresh = resetNavConfig();
          setNavConfig(fresh);
        }}
      />
    </div>
  );
}
