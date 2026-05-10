import { Link, useLocation, Outlet } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react';
import { loadNavConfig, saveNavConfig, resetNavConfig, getIconByName } from '@/utils/navConfig';
import type { NavGroupConfig } from '@/utils/navConfig';
import NavSettingsModal from './NavSettingsModal';

export default function DashboardLayout() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [navConfig, setNavConfig] = useState<NavGroupConfig[]>(() => loadNavConfig());
  const [showNavSettings, setShowNavSettings] = useState(false);

  // 侧边栏滚动位置保存/恢复
  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const saved = parseInt(localStorage.getItem('nav_scroll') || '0', 10);
    if (saved > 0) el.scrollTop = saved;
    const onScroll = () => localStorage.setItem('nav_scroll', String(el.scrollTop));
    el.addEventListener('scroll', onScroll);
    return () => {
      localStorage.setItem('nav_scroll', String(el.scrollTop));
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  // 专区折叠展开 + localStorage记忆
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try { const saved = localStorage.getItem('sidebar_collapsed'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try { localStorage.setItem('sidebar_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部品牌栏 */}
      <header className="flex items-center justify-between px-4 h-11 bg-white border-b border-gray-200 shrink-0">
        {/* 左侧：Logo + 品牌名 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-base">
            月
          </div>
          <span className="text-base font-bold text-gray-900">月下写作</span>
        </div>
        {/* 右侧：搜索图标 */}
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 — navConfig 动态渲染 */}
        <aside ref={sidebarRef} className="w-[180px] flex flex-col bg-white border-r border-gray-200 shrink-0 overflow-y-auto">
          {navConfig.filter((group) => !group.hidden).map((group, gi) => {
            const GroupIcon = getIconByName(group.iconName);
            const isCollapsed = collapsedSections[group.title] || false;
            return (
              <div key={gi} className="mb-1">
                <button
                  onClick={() => toggleSection(group.title)}
                  className="flex items-center justify-between w-full px-3 py-1.5 mx-1 mt-1 font-medium rounded-md bg-brand-light text-brand-dark hover:bg-brand/10 transition-colors"
                  style={{ fontSize: '12px' }}
                >
                  <div className="flex items-center gap-1.5">
                    <GroupIcon className="w-3.5 h-3.5" />
                    <span>{group.title}</span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {!isCollapsed && group.items.filter((item) => !item.hidden).map((item, ii) => {
                  const ItemIcon = getIconByName(item.iconName);
                  if (item.to) {
                    const isActive = currentPath === item.to;
                    return (
                      <Link
                        key={ii}
                        to={item.to}
                        className={`flex items-center gap-2.5 px-4 py-2 transition-colors ${
                          isActive
                            ? 'text-orange-500 font-medium bg-orange-50 border-l-[3px] border-orange-500'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    );
                  }
                  if (item.action) {
                    return (
                      <button
                        key={ii}
                        onClick={() => {/* actions handled elsewhere */}}
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <ItemIcon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}

          {/* 底部操作 */}
          <div className="mt-auto p-4 border-t border-gray-100">
            <button
              onClick={() => setShowNavSettings(true)}
              className="flex items-center gap-1 w-full justify-center px-3 py-2 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors whitespace-nowrap"
            >
              导航设置
            </button>
          </div>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <NavSettingsModal
        isOpen={showNavSettings}
        onClose={() => setShowNavSettings(false)}
        config={navConfig}
        onSave={(newConfig) => { setNavConfig(newConfig); saveNavConfig(newConfig); }}
        onReset={() => { const fresh = resetNavConfig(); setNavConfig(fresh); }}
      />
    </div>
  );
}
