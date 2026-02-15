import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  BarChart2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { alertsAPI } from '../../services/api';

interface Alert {
  id: number;
  symbol: string;
  stock_name?: string;
  alert_type: string;
  threshold_value: number;
  status: string;
  is_repeating: boolean;
  triggered_at?: string;
  trigger_price?: number;
  created_at: string;
}

interface AlertListProps {
  alerts: Alert[];
  onRefresh: () => void;
}

const alertTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  price_above: { icon: ArrowUpRight, label: 'Price Above', color: 'text-emerald-400' },
  price_below: { icon: ArrowDownRight, label: 'Price Below', color: 'text-rose-400' },
  percent_change: { icon: Percent, label: '% Change', color: 'text-amber-400' },
  volume_spike: { icon: BarChart2, label: 'Volume Spike', color: 'text-blue-400' },
};

const statusConfig: Record<string, string> = {
  active: 'badge-active',
  triggered: 'badge-triggered',
  disabled: 'badge-disabled',
};

export const AlertList: React.FC<AlertListProps> = ({ alerts, onRefresh }) => {
  const handleDelete = async (id: number) => {
    try {
      await alertsAPI.delete(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const handleToggle = async (alert: Alert) => {
    try {
      const newStatus = alert.status === 'active' ? 'disabled' : 'active';
      await alertsAPI.update(alert.id, { status: newStatus });
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card text-center py-16"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/60 flex items-center justify-center">
          <Bell className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">No alerts yet</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Search for a stock and create your first alert to get notified about price movements.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert, idx) => {
          const typeInfo = alertTypeConfig[alert.alert_type] || alertTypeConfig.price_above;
          const TypeIcon = typeInfo.icon;

          return (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.05 }}
              className="card py-4 px-5 flex items-center gap-4 glass-hover group"
            >
              {/* Icon */}
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  alert.status === 'triggered'
                    ? 'bg-amber-500/15'
                    : alert.status === 'disabled'
                    ? 'bg-slate-700/40'
                    : 'bg-primary/10'
                }`}
              >
                <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white">{alert.symbol}</span>
                  <span className={statusConfig[alert.status] || 'badge-disabled'}>
                    {alert.status}
                  </span>
                  {alert.is_repeating && (
                    <span className="badge bg-blue-500/15 text-blue-400 border border-blue-500/20">
                      repeat
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-2">
                  <span>
                    {typeInfo.label}: <span className="text-white font-medium">${alert.threshold_value}</span>
                  </span>
                  {alert.trigger_price && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-400">
                        Triggered at ${alert.trigger_price?.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {new Date(alert.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToggle(alert)}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                  title={alert.status === 'active' ? 'Disable' : 'Enable'}
                >
                  {alert.status === 'active' ? (
                    <ToggleRight className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(alert.id)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
