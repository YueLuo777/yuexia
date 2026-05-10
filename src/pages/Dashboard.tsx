import { useState } from 'react';
import EditableDashboard from '@/components/dashboard/EditableDashboard';
import NewNovelModal from '@/sections/NewNovelModal';

export default function Dashboard() {
  const [showNewNovel, setShowNewNovel] = useState(false);

  return (
    <>
      <EditableDashboard onNewNovel={() => setShowNewNovel(true)} />
      <NewNovelModal isOpen={showNewNovel} onClose={() => setShowNewNovel(false)} />
    </>
  );
}
