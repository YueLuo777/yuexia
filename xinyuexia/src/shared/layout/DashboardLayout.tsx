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
const BASE_APP_SCALE = 1.1;

function loadScale() {
  try {
    const raw = Number(localStorage.getItem(APP_SCALE_KEY) ?? '1');
    if (!Number.isFinite(raw)) return 1;
    return Math.max(0.8, Math.min(1.5, raw));
  } catch {
    return 1;
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
    document.body.style.zoom = String(Number((BASE_APP_SCALE * appScale).toFixed(3)));
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
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-[17px] font-bold text-white">
            月
          </div>
          <span className="text-[17px] font-bold text-slate-900">月下写作</span>
        </div>

        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => navigate('/novels')}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="打开作品列表"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <div className="ml-1 flex items-center rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setAppScale((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(1))))}
              className="px-2.5 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              title="缩小 10%"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[48px] text-center text-xs text-slate-500">{Math.round(appScale * 100)}%</span>
            <button
              onClick={() => setAppScale((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(1))))}
              className="px-2.5 py-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              title="放大 10%"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => void window.xinyuexiaWindow?.minimize()}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="最小化"
          >
          <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={async () => {
              const next = await window.xinyuexiaWindow?.maximizeToggle();
              if (typeof next === 'boolean') setIsMaximized(next);
            }}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={isMaximized ? '还原' : '最大化'}
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => void window.xinyuexiaWindow?.close()}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside ref={sidebarRef} className="flex w-[198px] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white">
          {navConfig.filter((group) => !group.hidden).map((group) => {
            const GroupIcon = getIconByName(group.iconName);
            const isCollapsed = collapsedSections[group.title] ?? false;

            return (
              <div key={group.title} className="mb-1">
                <button
                  onClick={() => toggleSection(group.title)}
                  className="mx-1.5 mt-1.5 flex w-[calc(100%-12px)] items-center justify-between rounded-lg bg-brand-light px-3.5 py-2 font-medium text-brand-dark transition-colors hover:bg-brand/10"
                  style={{ fontSize: '13px' }}
                >
                  <span className="flex items-center gap-1.5">
                    <GroupIcon className="h-4 w-4" />
                    <span>{group.title}</span>
                  </span>
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {!isCollapsed && group.items.filter((item) => !item.hidden).map((item) => {
                  const ItemIcon = getIconByName(item.iconName);
                  const isActive = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        isActive
                          ? 'border-l-[3px] border-orange-500 bg-orange-50 font-medium text-orange-500'
                          : 'border-l-[3px] border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <ItemIcon className="h-[17px] w-[17px]" />
                      <span className="text-[15px] leading-none">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          <div className="mt-auto border-t border-slate-100 p-4">
            <button
              onClick={() => setShowNavSettings(true)}
              className="flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-brand px-3 py-2.5 text-[13px] text-white transition-colors hover:bg-brand-dark"
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
