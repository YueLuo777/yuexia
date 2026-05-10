import DashboardCard from './DashboardCard';

interface StatsOverviewCardProps {
  wordCount?: number;
  novelCount?: number;
}

export default function StatsOverviewCard({}: StatsOverviewCardProps) {
  return (
    <DashboardCard
      title="创作数据"
      badge={{ text: '小说', color: 'brand' }}
    >
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">创作数据已合并到上方欢迎卡片</p>
      </div>
    </DashboardCard>
  );
}
