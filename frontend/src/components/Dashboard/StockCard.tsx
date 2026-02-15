import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface Quote {
  symbol: string;
  current_price: number;
  high: number;
  low: number;
  open_price: number;
  previous_close: number;
  percent_change: number;
  timestamp?: number;
}

interface StockCardProps {
  quote: Quote;
  onRefresh: () => void;
  loading?: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({ quote, onRefresh, loading }) => {
  const isUp = quote.percent_change >= 0;
  const change = Math.abs(quote.percent_change);
  const priceChange = quote.current_price - quote.previous_close;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Gradient accent */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          isUp ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-pink-500'
        }`}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-2xl font-bold">{quote.symbol}</h3>
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
                isUp ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              {isUp ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {change.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">
              ${quote.current_price?.toFixed(2)}
            </span>
            <span className={`text-sm font-medium ${isUp ? 'stock-up' : 'stock-down'}`}>
              {isUp ? '+' : '-'}${Math.abs(priceChange).toFixed(2)}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl glass glass-hover"
        >
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: quote.open_price },
          { label: 'High', value: quote.high },
          { label: 'Low', value: quote.low },
          { label: 'Prev Close', value: quote.previous_close },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-xl bg-slate-800/40">
            <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
            <div className="text-sm font-semibold">
              ${stat.value?.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Visual indicator bar */}
      <div className="mt-5 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Day Range</span>
          <span>
            ${quote.low?.toFixed(2)} — ${quote.high?.toFixed(2)}
          </span>
        </div>
        <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${
              isUp ? 'from-emerald-500 to-teal-400' : 'from-rose-500 to-pink-400'
            }`}
            style={{
              width: `${
                quote.high > quote.low
                  ? ((quote.current_price - quote.low) / (quote.high - quote.low)) * 100
                  : 50
              }%`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};
