import React from 'react';
import { motion } from 'framer-motion';
import { Bell, BellRing, BellOff, TrendingUp } from 'lucide-react';

interface Alert {
  status: string;
}

interface StatsOverviewProps {
  alerts: Alert[];
  watchedSymbol?: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ alerts, watchedSymbol }) => {
  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length;
  const disabledCount = alerts.filter((a) => a.status === 'disabled').length;

  const stats = [
    {
      label: 'Total Alerts',
      value: alerts.length,
      icon: Bell,
      gradient: 'from-primary to-violet-500',
      shadow: 'shadow-primary/20',
    },
    {
      label: 'Active',
      value: activeCount,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/20',
    },
    {
      label: 'Triggered',
      value: triggeredCount,
      icon: BellRing,
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
    },
    {
      label: 'Disabled',
      value: disabledCount,
      icon: BellOff,
      gradient: 'from-slate-500 to-slate-600',
      shadow: 'shadow-slate-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="card py-5 glass-hover"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {stat.label}
            </span>
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.shadow}`}
            >
              <stat.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
};
