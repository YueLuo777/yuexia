import type { ReactNode } from 'react';

interface DashboardCardProps {
  width?: string;
  title?: string;
  subtitle?: string;
  badge?: {
    text: string;
    color: 'brand' | 'orange' | 'gray';
  };
  children: ReactNode;
}

export default function DashboardCard({
  width = '100%',
  title,
  subtitle,
  badge,
  children,
}: DashboardCardProps) {
  const badgeStyles = {
    brand: 'text-brand-dark bg-brand-light',
    orange: 'text-orange-600 bg-orange-50',
    gray: 'text-gray-600 bg-gray-100',
  };

  return (
    <div style={{ width }} className="mb-0">
      <div className="p-5 bg-white rounded-xl border border-gray-100 h-full">
        {(title || subtitle || badge) && (
          <div className="flex items-center justify-between mb-4">
            <div>
              {subtitle && <p className="text-xs text-gray-400 mb-0.5">{subtitle}</p>}
              {title && <h3 className="text-base font-bold text-gray-900">{title}</h3>}
            </div>
            {badge && (
              <span className={`px-2 py-1 text-xs rounded-full ${badgeStyles[badge.color]}`}>
                {badge.text}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
