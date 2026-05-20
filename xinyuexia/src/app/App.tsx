import { Navigate, Route, Routes } from 'react-router-dom';

import { ExtractPage } from '@/features/extract/pages/ExtractPage';
import { IdeaGeneratorPage } from '@/features/ideas/pages/IdeaGeneratorPage';
import { IdeaLibraryPage } from '@/features/ideas/pages/IdeaLibraryPage';
import { OutlineGeneratorPage } from '@/features/ideas/pages/OutlineGeneratorPage';
import { DbSettingsPage } from '@/features/settings/pages/DbSettingsPage';
import { MaterialsPage } from '@/features/materials/pages/MaterialsPage';
import { ModelManagePage } from '@/features/models/pages/ModelManagePage';
import { NovelLibraryPage } from '@/features/novels/pages/NovelLibraryPage';
import { PlotLibraryPage } from '@/features/plot-library/pages/PlotLibraryPage';
import { PromptsPage } from '@/features/prompts/pages/PromptsPage';
import { ScriptEditorPage } from '@/features/script-editor/pages/ScriptEditorPage';
import { WorkbenchPage } from '@/features/workbench/pages/WorkbenchPage';
import ButtonTestPage from '@/pages/ButtonTestPage';
import CallDataPage from '@/pages/CallDataPage';
import { DashboardPage } from '@/pages/DashboardPage';
import TagZonePage from '@/pages/TagZonePage';
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
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/model-manage" element={<ModelManagePage />} />
        <Route path="/db-settings" element={<DbSettingsPage />} />
        <Route path="/idea-generator" element={<IdeaGeneratorPage />} />
        <Route path="/outline-generator" element={<OutlineGeneratorPage />} />
        <Route path="/idea-library" element={<IdeaLibraryPage />} />
        <Route path="/call-data" element={<CallDataPage />} />
        <Route path="/button-test" element={<ButtonTestPage />} />
      </Route>
      <Route path="/workbench" element={<WorkbenchPage />} />
      <Route path="/script-editor-v2" element={<ScriptEditorPage />} />
      <Route path="/tag-zone" element={<TagZonePage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
