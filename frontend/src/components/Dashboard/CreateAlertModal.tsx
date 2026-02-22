import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Repeat,
  DollarSign,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { alertsAPI, stocksAPI } from '../../services/api';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultSymbol?: string;
}

const alertTypes = [
  { id: 'price_above', label: 'Price Above', icon: ArrowUpRight, desc: 'Alert when price rises above threshold' },
  { id: 'price_below', label: 'Price Below', icon: ArrowDownRight, desc: 'Alert when price drops below threshold' },
  { id: 'percent_change', label: 'Change', icon: Percent, desc: 'Alert on percentage change' },
];

const thresholdConfig: Record<string, { label: string; icon: React.ReactNode; placeholder: string; step: string; hint: string }> = {
  price_above: {
    label: 'Target Price',
    icon: <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />,
    placeholder: '150.00',
    step: '0.01',
    hint: 'Alert when price rises above this value',
  },
  price_below: {
    label: 'Target Price',
    icon: <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />,
    placeholder: '120.00',
    step: '0.01',
    hint: 'Alert when price drops below this value',
  },
  percent_change: {
    label: 'Percentage (%)',
    icon: <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />,
    placeholder: '5.0',
    step: '0.1',
    hint: 'Alert when price changes by this percentage',
  },
};

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  defaultSymbol = '',
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [alertType, setAlertType] = useState('price_above');
  const [threshold, setThreshold] = useState('');
  const [isRepeating, setIsRepeating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Live price preview
  const [quoteData, setQuoteData] = useState<any>(null);
  const [quoteFetching, setQuoteFetching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Update symbol when defaultSymbol changes
  React.useEffect(() => {
    if (defaultSymbol) setSymbol(defaultSymbol);
  }, [defaultSymbol]);

  // Debounced price fetch when symbol changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuoteData(null);

    const trimmed = symbol.trim();
    if (trimmed.length < 1) return;

    debounceRef.current = setTimeout(async () => {
      setQuoteFetching(true);
      try {
        const res = await stocksAPI.getQuote(trimmed);
        setQuoteData(res.data);
      } catch {
        setQuoteData(null);
      } finally {
        setQuoteFetching(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [symbol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !threshold) return;

    const value = parseFloat(threshold);
    if (isNaN(value) || value <= 0) {
      setError('Threshold must be a positive number');
      return;
    }
    if (value > 999999) {
      setError('Threshold cannot exceed 999,999');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await alertsAPI.create({
        symbol: symbol.toUpperCase(),
        alert_type: alertType,
        threshold_value: value,
        is_repeating: isRepeating,
      });
      onCreated();
      onClose();
      // Reset
      setThreshold('');
      setIsRepeating(false);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        const messages = detail.map((e: any) => {
          const field = e.loc?.[e.loc.length - 1] || 'input';
          return `${field}: ${e.msg}`;
        });
        setError(messages.join('. '));
      } else {
        setError('Failed to create alert');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg glass rounded-2xl border border-white/[0.08] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create Alert</h2>
                  <p className="text-xs text-slate-400">Set up a new stock alert</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Symbol */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="input-field"
                  required
                />

                {/* Live Price Preview */}
                {quoteFetching && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Fetching price...</span>
                  </div>
                )}
                {quoteData && !quoteFetching && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-white/[0.06]"
                  >
                    <span className="text-xs font-bold text-white">{quoteData.symbol}</span>
                    <span className="text-sm font-semibold text-white">
                      ${quoteData.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {quoteData.percent_change != null && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${quoteData.percent_change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {quoteData.percent_change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {quoteData.percent_change >= 0 ? '+' : ''}{quoteData.percent_change?.toFixed(2)}%
                      </span>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Alert Type */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Alert Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {alertTypes.map((type) => {
                    const isSelected = alertType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setAlertType(type.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl text-left text-sm transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary/15 border border-primary/30 text-white'
                            : 'bg-slate-800/40 border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <type.icon className={`w-4 h-4 ${isSelected ? 'text-primary' : ''}`} />
                        <span className="font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Threshold */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">
                  {thresholdConfig[alertType]?.label || 'Threshold Value'}
                </label>
                <div className="relative">
                  {thresholdConfig[alertType]?.icon}
                  <input
                    type="number"
                    step={thresholdConfig[alertType]?.step || '0.01'}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder={thresholdConfig[alertType]?.placeholder || '0.00'}
                    className="input-field pl-11"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {thresholdConfig[alertType]?.hint}
                </p>
              </div>

              {/* Repeating Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <Repeat className="w-5 h-5 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Repeating Alert</div>
                    <div className="text-xs text-slate-400">Re-activate after trigger</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRepeating(!isRepeating)}
                  className={`w-12 h-7 rounded-full transition-colors duration-200 flex items-center ${
                    isRepeating ? 'bg-primary justify-end' : 'bg-slate-600 justify-start'
                  }`}
                >
                  <motion.div
                    layout
                    className="w-5 h-5 bg-white rounded-full mx-1 shadow-md"
                  />
                </button>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      Create Alert
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
