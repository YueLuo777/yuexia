import DashboardCard from './DashboardCard';

interface PlaceholderCardProps {
  label?: string;
}

export default function PlaceholderCard({ label = '预留' }: PlaceholderCardProps) {
  return (
    <DashboardCard width="280px">
      <div className="h-full flex items-center justify-center min-h-[120px]">
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </DashboardCard>
  );
}
