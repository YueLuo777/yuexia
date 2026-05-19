import { Navigate, Route, Routes } from 'react-router-dom';
import { ExtractPage } from '@/features/extract/pages/ExtractPage';
import { ModelManagePage } from '@/features/models/pages/ModelManagePage';
import { NovelLibraryPage } from '@/features/novels/pages/NovelLibraryPage';
import { PlotLibraryPage } from '@/features/plot-library/pages/PlotLibraryPage';
import { PromptsPage } from '@/features/prompts/pages/PromptsPage';
import { WorkbenchPage } from '@/features/workbench/pages/WorkbenchPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { DashboardLayout } from '@/shared/layout/DashboardLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/novels" element={<NovelLibraryPage />} />
        <Route path="/scripts" element={<NovelLibraryPage />} />
        <Route path="/extract" element={<ExtractPage />} />
        <Route path="/plot-library" element={<PlotLibraryPage />} />
        <Route path="/materials" element={<PlaceholderPage title="资料库" />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/model-manage" element={<ModelManagePage />} />
        <Route path="/db-settings" element={<PlaceholderPage title="云端设置" />} />
        <Route path="/idea-generator" element={<PlaceholderPage title="脑洞生成器" />} />
        <Route path="/outline-generator" element={<PlaceholderPage title="大纲生成器" />} />
        <Route path="/idea-library" element={<PlaceholderPage title="脑洞库" />} />
      </Route>
      <Route path="/workbench" element={<WorkbenchPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
