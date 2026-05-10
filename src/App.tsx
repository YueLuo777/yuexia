import { Routes, Route, Navigate } from 'react-router-dom';
import { NovelsProvider } from './hooks/useNovels';
import DashboardLayout from './sections/DashboardLayout';
import WorkbenchLayout from './sections/WorkbenchLayout';
import PromptZone from './sections/PromptZone';
import ApiSettings from './sections/ApiSettings';
import MaterialsPage from './sections/MaterialsPage';
import DbSettings from './sections/DbSettings';
import ScriptEditorV2 from './sections/ScriptEditorV2';
import MyNovels from './sections/MyNovels';
import ButtonTestPage from './sections/ButtonTestPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <NovelsProvider>
      <Routes>
        {/* 默认进入首页（工作台） */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 工作台编辑器 — 独立全屏布局，无导航 */}
        <Route path="/workbench" element={<WorkbenchLayout />} />

        {/* 带左侧导航的页面 */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/novels" element={<MyNovels />} />
          <Route path="/scripts" element={<MyNovels />} />
          <Route path="/script-editor-v2" element={<ScriptEditorV2 />} />
          <Route path="/prompts" element={<PromptZone />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/model-manage" element={<ApiSettings />} />
          <Route path="/db-settings" element={<DbSettings />} />
          <Route path="/button-test" element={<ButtonTestPage />} />
        </Route>

        {/* 未匹配路由重定向 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </NovelsProvider>
  );
}

export default App;
