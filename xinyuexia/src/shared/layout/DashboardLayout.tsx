import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

import {
  getIconByName,
  loadCollapsedSections,
  loadNavConfig,
  saveCollapsedSections,
  type NavGroupConfig,
} from '@/shared/navigation/navConfig';

export function DashboardLayout() {
  const location = useLocation();
  const [navConfig] = useState<NavGroupConfig[]>(() => loadNavConfig());
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => loadCollapsedSections());
  const sidebarRef = useRef<HTMLElement>(null);

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

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      saveCollapsedSections(next);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-base font-bold text-white">
            月
          </div>
          <span className="text-base font-bold text-gray-900">月下写作</span>
        </div>
        <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="搜索">
          <Search className="h-5 w-5" />
        </button>
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
            <button className="flex w-full items-center justify-center whitespace-nowrap rounded-md bg-brand px-3 py-2 text-xs text-white transition-colors hover:bg-brand-dark">
              导航设置
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
