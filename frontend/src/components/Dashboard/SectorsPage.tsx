import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Trash2,
  Edit3,
  FolderOpen,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Check,
  Settings,
} from 'lucide-react';
import { sectorsAPI, stocksAPI, sectorStrategiesAPI } from '../../services/api';

interface SectorStrategy {
  id: number;
  sector_id: number;
  is_active: boolean;
  percent_majority: number;
  trend_threshold: number;
  laggard_threshold: number;
}

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
  icon: string | null;
  stocks: SectorStock[];
  created_at: string;
}

interface StockPrice {
  symbol: string;
  current_price: number;
  percent_change: number | null;
}

const SECTOR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

export const SectorsPage: React.FC = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [strategies, setStrategies] = useState<Record<number, SectorStrategy>>({});
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);

  // Create sector modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);

  // Add stock modal
  const [addingToSector, setAddingToSector] = useState<number | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  // Editing sector name
  const [editingSector, setEditingSector] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  // Strategy modal
  const [strategySectorId, setStrategySectorId] = useState<number | null>(null);
  const [strategyForm, setStrategyForm] = useState({
    is_active: true,
    percent_majority: 70.0,
    trend_threshold: 1.5,
    laggard_threshold: -1.0,
  });
  const [savingStrategy, setSavingStrategy] = useState(false);

  const loadSectors = useCallback(async () => {
    try {
      const res = await sectorsAPI.getAll();
      const loadedSectors = res.data;
      setSectors(loadedSectors);

      // Load strategies for these sectors
      const stratsMap: Record<number, SectorStrategy> = {};
      await Promise.all(loadedSectors.map(async (s: Sector) => {
        try {
          const stratRes = await sectorStrategiesAPI.getBySectorId(s.id);
          stratsMap[s.id] = stratRes.data;
        } catch (e) {
          // No strategy configured yet
        }
      }));
      setStrategies(stratsMap);
    } catch (err) {
      console.error('Failed to load sectors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch prices for all sector stocks
  const fetchPrices = useCallback(async () => {
    const allSymbols = new Set<string>();
    sectors.forEach((s) => s.stocks.forEach((st) => allSymbols.add(st.symbol)));

    if (allSymbols.size === 0) return;

    const results: Record<string, StockPrice> = {};
    // Fetch in parallel, max 5 at a time
    const symbols = Array.from(allSymbols);
    const batches = [];
    for (let i = 0; i < symbols.length; i += 5) {
      batches.push(symbols.slice(i, i + 5));
    }

    for (const batch of batches) {
      const promises = batch.map(async (sym) => {
        try {
          const res = await stocksAPI.getQuote(sym);
          results[sym] = {
            symbol: sym,
            current_price: res.data.current_price,
            percent_change: res.data.percent_change,
          };
        } catch {
          // skip failed fetches
        }
      });
      await Promise.all(promises);
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

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await sectorsAPI.create({ name: newName.trim(), color: newColor });
      setNewName('');
      setShowCreate(false);
      loadSectors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create sector');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSector = async (id: number) => {
    try {
      await sectorsAPI.delete(id);
      loadSectors();
    } catch (err) {
      console.error('Failed to delete sector:', err);
    }
  };

  const handleRenameSector = async (id: number) => {
    if (!editName.trim()) {
      setEditingSector(null);
      return;
    }
    try {
      await sectorsAPI.update(id, { name: editName.trim() });
      setEditingSector(null);
      loadSectors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to rename');
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingToSector || !newSymbol.trim()) return;
    setAddingStock(true);
    try {
      await sectorsAPI.addStock(addingToSector, { symbol: newSymbol.trim().toUpperCase() });
      setNewSymbol('');
      setAddingToSector(null);
      loadSectors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add stock');
    } finally {
      setAddingStock(false);
    }
  };

  const handleRemoveStock = async (sectorId: number, symbol: string) => {
    try {
      await sectorsAPI.removeStock(sectorId, symbol);
      loadSectors();
    } catch (err) {
      console.error('Failed to remove stock:', err);
    }
  };

  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strategySectorId === null) return;
    setSavingStrategy(true);
    try {
      const existing = strategies[strategySectorId];
      if (existing) {
        await sectorStrategiesAPI.update(existing.id, strategyForm);
      } else {
        await sectorStrategiesAPI.create({ sector_id: strategySectorId, ...strategyForm });
      }
      setStrategySectorId(null);
      loadSectors();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save strategy');
    } finally {
      setSavingStrategy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">Sectors</h2>
          <p className="text-slate-400 text-sm">
            Organize stocks by sector and track them together
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Sector
        </motion.button>
      </div>

      {/* Empty State */}
      {sectors.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/60 flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No sectors yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
            Create sectors like "Security", "SaaS", or "Finance" to group and track related stocks together.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Sector
          </button>
        </motion.div>
      )}

      {/* Sector Cards */}
      <div className="space-y-4">
        <AnimatePresence>
          {sectors.map((sector, idx) => (
            <motion.div
              key={sector.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.05 }}
              className="card overflow-hidden"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: sector.color || '#6366f1' }}
              />

              {/* Sector Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${sector.color || '#6366f1'}20` }}
                  >
                    <FolderOpen
                      className="w-5 h-5"
                      style={{ color: sector.color || '#6366f1' }}
                    />
                  </div>

                  {editingSector === sector.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameSector(sector.id)}
                        className="input-field py-1.5 px-3 text-sm w-48"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameSector(sector.id)}
                        className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingSector(null)}
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-bold">{sector.name}</h3>
                      <p className="text-xs text-slate-400">
                        {sector.stocks.length} stock{sector.stocks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setStrategySectorId(sector.id);
                      setStrategyForm({
                        is_active: strategies[sector.id]?.is_active ?? true,
                        percent_majority: strategies[sector.id]?.percent_majority ?? 70.0,
                        trend_threshold: strategies[sector.id]?.trend_threshold ?? 1.5,
                        laggard_threshold: strategies[sector.id]?.laggard_threshold ?? -1.0,
                      });
                    }}
                    className={`p-2 rounded-lg hover:bg-white/[0.06] transition-colors ${strategies[sector.id]?.is_active ? 'text-emerald-400' : 'text-slate-400'}`}
                    title="Configure Strategy"
                  >
                    <Settings className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAddingToSector(sector.id)}
                    className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                    title="Add stock"
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setEditingSector(sector.id);
                      setEditName(sector.name);
                    }}
                    className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                    title="Rename"
                  >
                    <Edit3 className="w-4 h-4 text-slate-400" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteSector(sector.id)}
                    className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Delete sector"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-400" />
                  </motion.button>
                </div>
              </div>

              {/* Stocks Grid */}
              {sector.stocks.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  No stocks added yet.{' '}
                  <button
                    onClick={() => setAddingToSector(sector.id)}
                    className="text-primary hover:underline"
                  >
                    Add one
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sector.stocks.map((stock) => {
                    const price = prices[stock.symbol];
                    const isUp = (price?.percent_change ?? 0) >= 0;

                    return (
                      <div
                        key={stock.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold">{stock.symbol}</div>
                            {price ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-300">
                                  ${price.current_price?.toFixed(2)}
                                </span>
                                <span
                                  className={`flex items-center text-[10px] font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                >
                                  {isUp ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                  )}
                                  {Math.abs(price.percent_change ?? 0).toFixed(2)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Loading...</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveStock(sector.id, stock.symbol)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition-all"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Sector Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass rounded-2xl border border-white/[0.08] shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold mb-4">Create Sector</h3>
              <form onSubmit={handleCreateSector} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Sector Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Security, SaaS, Finance"
                    className="input-field"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {SECTOR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-8 h-8 rounded-lg transition-all ${newColor === c
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110'
                            : 'hover:scale-105'
                          }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Stock Modal */}
      <AnimatePresence>
        {addingToSector !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingToSector(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass rounded-2xl border border-white/[0.08] shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold mb-4">Add Stock to Sector</h3>
              <form onSubmit={handleAddStock} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Stock Symbol
                  </label>
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. CRWD, PANW, ZS"
                    className="input-field"
                    autoFocus
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddingToSector(null)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingStock}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingStock ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Stock
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Strategy Modal */}
      <AnimatePresence>
        {strategySectorId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStrategySectorId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass rounded-2xl border border-white/[0.08] shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold mb-1">Sector Divergence Strategy</h3>
              <p className="text-sm text-slate-400 mb-6">Receive alerts when one stock severely lags behind the overall sector trend.</p>
              <form onSubmit={handleSaveStrategy} className="space-y-4">

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-white/[0.08]">
                  <span className="text-sm font-medium text-slate-200">Enable Strategy</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={strategyForm.is_active}
                      onChange={(e) => setStrategyForm({ ...strategyForm, is_active: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {strategyForm.is_active && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 flex justify-between">
                        <span>Basket Majority (%)</span>
                        <span className="text-primary">{strategyForm.percent_majority}%</span>
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={strategyForm.percent_majority}
                        onChange={(e) => setStrategyForm({ ...strategyForm, percent_majority: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <p className="text-xs text-slate-500 mt-1">Percentage of stocks that must be trending.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Trend Threshold (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={strategyForm.trend_threshold}
                          onChange={(e) => setStrategyForm({ ...strategyForm, trend_threshold: parseFloat(e.target.value) })}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Laggard Div. (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          max="-0.1"
                          value={strategyForm.laggard_threshold}
                          onChange={(e) => setStrategyForm({ ...strategyForm, laggard_threshold: parseFloat(e.target.value) })}
                          className="input-field"
                          required
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setStrategySectorId(null)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStrategy}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingStrategy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Strategy
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
