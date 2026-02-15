import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Bell, LogOut, User, Menu, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { stocksAPI } from '../../services/api';

interface IndexData {
  symbol: string;
  current_price: number;
  previous_close: number;
  percent_change: number | null;
}

interface NavbarProps {
  username?: string;
  onLogout: () => void;
  onToggleSidebar: () => void;
  alertCount: number;
}

const INDEX_LABELS: Record<string, string> = {
  SPY: 'S&P 500',
  QQQ: 'Nasdaq',
  IWM: 'Russell 2K',
};

export const Navbar: React.FC<NavbarProps> = ({
  username,
  onLogout,
  onToggleSidebar,
  alertCount,
}) => {
  const [indexes, setIndexes] = useState<IndexData[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const fetchIndexes = async () => {
      try {
        const res = await stocksAPI.getIndexes();
        setIndexes(res.data);
      } catch (err) {
        // silently fail — indexes are non-critical
      }
    };

    fetchIndexes();
    intervalRef.current = setInterval(fetchIndexes, 30000); // 30s polling

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-400" />
            </button>
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight hidden sm:inline">
                Cor<span className="gradient-text">tex</span>
              </span>
            </motion.div>
          </div>

          {/* Center: Index Ticker */}
          {indexes.length > 0 && (
            <div className="hidden md:flex items-center gap-5">
              {indexes.map((idx) => {
                const isUp = (idx.percent_change ?? 0) >= 0;
                return (
                  <div key={idx.symbol} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {INDEX_LABELS[idx.symbol] || idx.symbol}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      ${idx.current_price?.toFixed(2)}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(idx.percent_change ?? 0).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Alert Bell */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2.5 rounded-xl glass glass-hover"
            >
              <Bell className="w-5 h-5 text-slate-300" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-rose-500/30">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </motion.button>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/[0.08]">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-slate-300">
                  {username}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout}
                className="p-2.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
