import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Plus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { sectorsAPI, stocksAPI } from '../../services/api';

interface SectorStock {
  id: number;
  symbol: string;
  stock_name: string | null;
  created_at: string;
}

interface Sector {
  id: number;
  name: string;
  color: string | null;
  stocks: SectorStock[];
}

interface StockPrice {
  current_price: number;
  percent_change: number | null;
}

interface SectorWidgetProps {
  onViewAllSectors: () => void;
}

export const SectorWidget: React.FC<SectorWidgetProps> = ({ onViewAllSectors }) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);

  // Quick-add sector
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCreating, setQuickCreating] = useState(false);

  const loadSectors = useCallback(async () => {
    try {
      const res = await sectorsAPI.getAll();
      setSectors(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    const allSymbols = new Set<string>();
    sectors.forEach((s) => s.stocks.forEach((st) => allSymbols.add(st.symbol)));
    if (allSymbols.size === 0) return;

    const symbols = Array.from(allSymbols);
    const results: Record<string, StockPrice> = {};

    const batches = [];
    for (let i = 0; i < symbols.length; i += 5) {
      batches.push(symbols.slice(i, i + 5));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (sym) => {
          try {
            const res = await stocksAPI.getQuote(sym);
            results[sym] = {
              current_price: res.data.current_price,
              percent_change: res.data.percent_change,
            };
          } catch {}
        })
      );
    }

    setPrices((prev) => ({ ...prev, ...results }));
  }, [sectors]);

  useEffect(() => {
    loadSectors();
  }, [loadSectors]);

  useEffect(() => {
    if (sectors.length > 0) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 30000);
      return () => clearInterval(interval);
    }
  }, [sectors, fetchPrices]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    setQuickCreating(true);
    try {
      await sectorsAPI.create({ name: quickName.trim() });
      setQuickName('');
      setShowQuickAdd(false);
      loadSectors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create sector');
    } finally {
      setQuickCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="card py-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">My Sectors</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
          {sectors.length > 0 && (
            <>
              <span className="text-slate-600">·</span>
              <button
                onClick={onViewAllSectors}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Inline */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleQuickAdd}
            className="mb-3 flex gap-2"
          >
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="Sector name (e.g. Security, SaaS)"
              className="input-field py-2.5 text-sm flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={quickCreating}
              className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5 shrink-0"
            >
              {quickCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickAdd(false);
                setQuickName('');
              }}
              className="p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {sectors.length === 0 && !showQuickAdd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-10"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/60 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Group stocks by sector to track them together
          </p>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Sector
          </button>
        </motion.div>
      )}

      {/* Sector Cards — Horizontal Scrollable */}
      {sectors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectors.map((sector, idx) => {
            // Calculate sector performance
            const stockPrices = sector.stocks
              .map((s) => prices[s.symbol])
              .filter(Boolean);
            const avgChange =
              stockPrices.length > 0
                ? stockPrices.reduce((sum, p) => sum + (p.percent_change ?? 0), 0) /
                  stockPrices.length
                : null;
            const isUp = (avgChange ?? 0) >= 0;

            return (
              <motion.div
                key={sector.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card py-4 px-5 glass-hover cursor-pointer group"
                onClick={onViewAllSectors}
              >
                {/* Color accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: sector.color || '#6366f1' }}
                />

                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${sector.color || '#6366f1'}20` }}
                    >
                      <FolderOpen
                        className="w-4 h-4"
                        style={{ color: sector.color || '#6366f1' }}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{sector.name}</h4>
                      <span className="text-[10px] text-slate-500">
                        {sector.stocks.length} stock{sector.stocks.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {avgChange !== null && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-lg ${
                        isUp
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(avgChange).toFixed(2)}%
                    </span>
                  )}
                </div>

                {/* Stock chips */}
                {sector.stocks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No stocks added</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sector.stocks.map((stock) => {
                      const price = prices[stock.symbol];
                      const stockUp = (price?.percent_change ?? 0) >= 0;

                      return (
                        <div
                          key={stock.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-xs"
                        >
                          <span className="font-semibold text-white">{stock.symbol}</span>
                          {price ? (
                            <>
                              <span className="text-slate-400">
                                ${price.current_price?.toFixed(2)}
                              </span>
                              <span
                                className={`font-semibold ${
                                  stockUp ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {stockUp ? '+' : ''}
                                {(price.percent_change ?? 0).toFixed(1)}%
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-600">...</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
