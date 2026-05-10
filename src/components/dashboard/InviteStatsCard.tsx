import { Users, TrendingUp } from 'lucide-react';
import DashboardCard from './DashboardCard';

interface InviteStatsCardProps {
  invitedCount: number;
  totalCommission: number;
  conversionRate: number;
}

export default function InviteStatsCard({
  invitedCount,
  totalCommission,
  conversionRate,
}: InviteStatsCardProps) {
  return (
    <DashboardCard width="100%">
      <h3 className="text-base font-semibold text-gray-900 mb-3">邀请统计</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg text-center">
          <Users className="w-5 h-5 text-blue-500 mb-1" />
          <p className="text-xs text-gray-500">已邀请</p>
          <p className="text-base font-bold text-gray-900">{invitedCount}</p>
        </div>
        <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mb-1" />
          <p className="text-xs text-gray-500">总收益</p>
          <p className="text-base font-bold text-gray-900">{totalCommission}</p>
        </div>
        <div className="flex flex-col items-center p-2 bg-purple-50 rounded-lg text-center">
          <TrendingUp className="w-5 h-5 text-purple-500 mb-1" />
          <p className="text-xs text-gray-500">转化率</p>
          <p className="text-base font-bold text-gray-900">{conversionRate}%</p>
        </div>
      </div>
    </DashboardCard>
  );
}
