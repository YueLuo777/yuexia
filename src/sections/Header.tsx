import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Database,
  BookMarked,
  StickyNote,
  Sun,
  History,
  Sparkles,
  Cloud,
  Download,
  Upload,
} from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';
import { useState, useRef } from 'react';

interface HeaderProps {
  onOpenWorkInfo: () => void;
  onOpenSettings: () => void;
  onOpenOutline: () => void;
  onOpenNotes: () => void;
  onOpenExtractPlot: () => void;
}

const centerNavItems = [
  { key: 'extract', label: '提炼剧情', icon: Sparkles, onClick: (p: HeaderProps) => p.onOpenExtractPlot() },
  { key: 'settings', label: '设定库', icon: Database, onClick: (p: HeaderProps) => p.onOpenSettings() },
  { key: 'outline', label: '概要库', icon: BookMarked, onClick: (p: HeaderProps) => p.onOpenOutline() },
  { key: 'notes', label: '备忘录', icon: StickyNote, onClick: (p: HeaderProps) => p.onOpenNotes() },
];

export default function Header(props: HeaderProps) {
  const { novels, currentNovelId, renameNovel } = useNovelsContext();
  const currentNovelTitle = novels.find((n) => n.id === currentNovelId)?.title || '未命名作品';

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(currentNovelTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    setEditTitle(currentNovelTitle);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleBlur = () => {
    if (editTitle.trim() && editTitle !== currentNovelTitle) {
      renameNovel(currentNovelId, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') setIsEditing(false);
  };

  // 导出数据到 JSON 文件
  const handleExport = () => {
    const data = {
      novels: JSON.parse(localStorage.getItem('novels_data_v1') || '[]'),
      volumesMap: JSON.parse(localStorage.getItem('volumes_map_v1') || '{}'),
      materials: JSON.parse(localStorage.getItem('materials_data_v1') || '[]'),
      prompts: JSON.parse(localStorage.getItem('prompt_personal') || '[]'),
      models: JSON.parse(localStorage.getItem('api_settings_v2') || '{}'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `月下写作备份_${new Date().toLocaleDateString('zh-CN')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 从 JSON 文件导入数据
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.novels) localStorage.setItem('novels_data_v1', JSON.stringify(data.novels));
          if (data.volumesMap) localStorage.setItem('volumes_map_v1', JSON.stringify(data.volumesMap));
          if (data.materials) localStorage.setItem('materials_data_v1', JSON.stringify(data.materials));
          if (data.prompts) localStorage.setItem('prompt_personal', JSON.stringify(data.prompts));
          if (data.models) localStorage.setItem('api_settings_v2', JSON.stringify(data.models));
          alert('数据导入成功，请刷新页面');
          window.location.reload();
        } catch {
          alert('导入失败：文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <header className="flex items-center justify-between px-4 h-12 bg-white border-b border-gray-200 shrink-0">
      {/* 左侧：退出 + 作品标题 + 作品信息按钮 */}
      <div className="flex items-center gap-4">
        <Link
          to="/novels"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>退出</span>
        </Link>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="text-base font-bold text-gray-900 border border-brand rounded-md px-2 py-0.5 focus:outline-none bg-white"
              style={{ minWidth: '120px', maxWidth: '300px' }}
            />
          ) : (
            <h1
              className="text-base font-bold text-gray-900 cursor-pointer hover:text-brand hover:border-brand transition-all select-none px-2 py-0.5 rounded-md border border-dashed border-gray-300 bg-gray-50/50"
              onDoubleClick={handleDoubleClick}
              title="双击修改书名"
            >
              {currentNovelTitle}
            </h1>
          )}
          <button
            onClick={() => props.onOpenWorkInfo()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors text-white bg-brand font-medium"
          >
            <FileText className="w-4 h-4" />
            <span>作品信息</span>
          </button>
        </div>
      </div>

      {/* 中间：导航标签 */}
      <nav className="flex items-center gap-1">
        {centerNavItems.map((item) => (
          <button
            key={item.key}
            onClick={() => item.onClick(props)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors text-white bg-brand font-medium"
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 右侧：数据管理 + 工具 */}
      <div className="flex items-center gap-2">
        {/* 数据管理 */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={handleExport}
            title="导出备份"
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
          <button
            onClick={handleImport}
            title="导入备份"
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            导入
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open_cloud_sync'))}
            title="云同步"
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Cloud className="w-3.5 h-3.5" />
            云同步
          </button>
        </div>

        <button className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 transition-colors">
          <Sun className="w-4 h-4" />
          <span className="text-xs">白天模式</span>
        </button>
        <button className="p-1 text-gray-500 hover:text-gray-700 transition-colors">
          <History className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
