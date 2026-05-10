import { useState, useEffect, useRef } from 'react';
import { X, Settings, Type, PanelLeft, LayoutGrid } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // 标签字体大小 (12-20px)
  const [tagFontSize, setTagFontSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('setting_tag_font_size')) || 14; } catch { return 14; }
  });
  // 导航栏字体大小 (12-18px)
  const [navFontSize, setNavFontSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('setting_nav_font_size')) || 14; } catch { return 14; }
  });
  // 专区标题字体大小 (10-16px)
  const [sectionFontSize, setSectionFontSize] = useState<number>(() => {
    try { return Number(localStorage.getItem('setting_section_font_size')) || 12; } catch { return 12; }
  });

  const panelRef = useRef<HTMLDivElement>(null);
  useEscToClose(onClose, isOpen);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // 实时应用到页面
  useEffect(() => {
    document.documentElement.style.setProperty('--novel-tag-font-size', `${tagFontSize}px`);
    try { localStorage.setItem('setting_tag_font_size', String(tagFontSize)); } catch {}
  }, [tagFontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-nav-font-size', `${navFontSize}px`);
    try { localStorage.setItem('setting_nav_font_size', String(navFontSize)); } catch {}
  }, [navFontSize]);

  // 实时应用专区标题字体大小
  useEffect(() => {
    document.documentElement.style.setProperty('--section-title-font-size', `${sectionFontSize}px`);
    try { localStorage.setItem('setting_section_font_size', String(sectionFontSize)); } catch {}
  }, [sectionFontSize]);

  // 初始化时读取并应用
  useEffect(() => {
    const savedTag = localStorage.getItem('setting_tag_font_size');
    const savedNav = localStorage.getItem('setting_nav_font_size');
    const savedSection = localStorage.getItem('setting_section_font_size');
    if (savedTag) document.documentElement.style.setProperty('--novel-tag-font-size', `${savedTag}px`);
    if (savedNav) document.documentElement.style.setProperty('--sidebar-nav-font-size', `${savedNav}px`);
    if (savedSection) document.documentElement.style.setProperty('--section-title-font-size', `${savedSection}px`);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]" style={{ backgroundColor: 'transparent' }}>
      <div
        ref={panelRef}
        className="absolute right-4 top-14 w-[320px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-bold text-gray-900">显示设置</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-5">
          {/* 作品标签字体大小 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-gray-700">作品标签字体大小</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-8">12px</span>
              <input
                type="range"
                min={12}
                max={20}
                step={1}
                value={tagFontSize}
                onChange={(e) => setTagFontSize(Number(e.target.value))}
                className="flex-1 rounded-lg cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #08B3D9 ${((tagFontSize - 12) / 8) * 100}%, #e5e7eb ${((tagFontSize - 12) / 8) * 100}%)`,
                }}
              />
              <span className="text-xs text-gray-400 w-8 text-right">20px</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-xs text-brand font-medium">{tagFontSize}px</span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-100" />

          {/* 左侧导航栏字体大小 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PanelLeft className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-gray-700">左侧导航栏字体大小</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-8">12px</span>
              <input
                type="range"
                min={12}
                max={18}
                step={1}
                value={navFontSize}
                onChange={(e) => setNavFontSize(Number(e.target.value))}
                className="flex-1 rounded-lg cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #08B3D9 ${((navFontSize - 12) / 6) * 100}%, #e5e7eb ${((navFontSize - 12) / 6) * 100}%)`,
                }}
              />
              <span className="text-xs text-gray-400 w-8 text-right">18px</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-xs text-brand font-medium">{navFontSize}px</span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-100" />

          {/* 专区标题字体大小 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="w-4 h-4 text-brand" />
              <span className="text-sm font-medium text-gray-700">专区字体大小</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-8">10px</span>
              <input
                type="range"
                min={10}
                max={16}
                step={1}
                value={sectionFontSize}
                onChange={(e) => setSectionFontSize(Number(e.target.value))}
                className="flex-1 rounded-lg cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #08B3D9 ${((sectionFontSize - 10) / 6) * 100}%, #e5e7eb ${((sectionFontSize - 10) / 6) * 100}%)`,
                }}
              />
              <span className="text-xs text-gray-400 w-8 text-right">16px</span>
            </div>
            <div className="text-center mt-1">
              <span className="text-xs text-brand font-medium">{sectionFontSize}px</span>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => { setTagFontSize(14); setNavFontSize(14); setSectionFontSize(12); }}
            className="w-full px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-white transition-colors"
          >
            恢复默认
          </button>
        </div>
      </div>
    </div>
  );
}
