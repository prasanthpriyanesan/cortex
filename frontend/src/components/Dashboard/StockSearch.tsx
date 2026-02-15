import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Loader2 } from 'lucide-react';
import { stocksAPI } from '../../services/api';

interface StockSearchProps {
  onSelectSymbol: (symbol: string) => void;
}

interface SearchResult {
  symbol: string;
  description: string;
  type: string;
}

export const StockSearch: React.FC<StockSearchProps> = ({ onSelectSymbol }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await stocksAPI.search(query);
        setResults(response.data?.result || response.data || []);
        setShowResults(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    setQuery(symbol);
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.length > 0) {
      onSelectSymbol(query.toUpperCase());
      setShowResults(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search stocks by symbol or name..."
          className="input-field pl-12 pr-12 py-4 text-base"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 glass rounded-xl overflow-hidden z-30 max-h-80 overflow-y-auto"
          >
            {results.slice(0, 8).map((result, idx) => (
              <motion.button
                key={result.symbol}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => handleSelect(result.symbol)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{result.symbol}</div>
                  <div className="text-xs text-slate-400 truncate">{result.description}</div>
                </div>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                  {result.type || 'Stock'}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
