import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Building2,
} from 'lucide-react';

interface BasicFinancials {
  week_52_high: number | null;
  week_52_low: number | null;
  beta: number | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
  market_cap: number | null;
}

interface RecommendationTrend {
  strong_buy: number;
  buy: number;
  hold: number;
  sell: number;
  strong_sell: number;
  period: string | null;
}

interface Quote {
  symbol: string;
  current_price: number;
  high: number;
  low: number;
  open_price: number;
  previous_close: number;
  percent_change: number;
  timestamp?: number;

  // Enriched fields (optional for backward compat)
  company_name?: string;
  logo?: string;
  exchange?: string;
  finnhub_industry?: string;
  weburl?: string;
  country?: string;
  ipo?: string;
  financials?: BasicFinancials | null;
  recommendation?: RecommendationTrend | null;
}

interface StockCardProps {
  quote: Quote;
  onRefresh: () => void;
  loading?: boolean;
}

// --- Helpers ---

function formatMarketCap(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  // Finnhub market cap is in millions
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}T`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}B`;
  return `$${value.toFixed(2)}M`;
}

function formatMetric(
  value: number | null | undefined,
  decimals: number = 2
): string {
  if (value == null) return 'N/A';
  return value.toFixed(decimals);
}

// --- Component ---

export const StockCard: React.FC<StockCardProps> = ({
  quote,
  onRefresh,
  loading,
}) => {
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

      {/* === SECTION 1: Header === */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Company Logo */}
          {quote.logo ? (
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={quote.logo}
                alt={quote.company_name || quote.symbol}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (
                    e.target as HTMLImageElement
                  ).parentElement!.innerHTML = `<svg class="w-6 h-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`;
                }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-800/60 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-slate-500" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <h3 className="text-2xl font-bold">{quote.symbol}</h3>
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
                  isUp
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
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

            {/* Company name + exchange + industry */}
            <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
              {quote.company_name && <span>{quote.company_name}</span>}
              {quote.company_name && quote.exchange && (
                <span className="text-slate-600">&middot;</span>
              )}
              {quote.exchange && <span>{quote.exchange}</span>}
              {quote.finnhub_industry && (
                <>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400">
                    {quote.finnhub_industry}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {quote.weburl && (
            <a
              href={quote.weburl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl glass glass-hover"
              title="Company website"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          )}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl glass glass-hover"
          >
            <RefreshCw
              className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`}
            />
          </motion.button>
        </div>
      </div>

      {/* === SECTION 2: Price === */}
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-bold tracking-tight">
          ${quote.current_price?.toFixed(2)}
        </span>
        <span
          className={`text-sm font-medium ${isUp ? 'stock-up' : 'stock-down'}`}
        >
          {isUp ? '+' : '-'}${Math.abs(priceChange).toFixed(2)}
        </span>
      </div>

      {/* === SECTION 3: Key Stats Grid (7 items) === */}
      {quote.financials && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Market Cap',
              value: formatMarketCap(quote.financials.market_cap),
            },
            {
              label: 'P/E Ratio',
              value: formatMetric(quote.financials.pe_ratio),
            },
            {
              label: 'EPS (TTM)',
              value:
                quote.financials.eps != null
                  ? `$${formatMetric(quote.financials.eps)}`
                  : 'N/A',
            },
            { label: 'Beta', value: formatMetric(quote.financials.beta) },
            {
              label: 'Div Yield',
              value:
                quote.financials.dividend_yield != null
                  ? `${formatMetric(quote.financials.dividend_yield)}%`
                  : 'N/A',
            },
            {
              label: '52W High',
              value:
                quote.financials.week_52_high != null
                  ? `$${quote.financials.week_52_high.toFixed(2)}`
                  : 'N/A',
            },
            {
              label: '52W Low',
              value:
                quote.financials.week_52_low != null
                  ? `$${quote.financials.week_52_low.toFixed(2)}`
                  : 'N/A',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-xl bg-slate-800/40 border border-white/[0.04]"
            >
              <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
              <div className="text-sm font-bold">{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* === SECTION 4: Analyst Recommendations === */}
      {quote.recommendation &&
        quote.recommendation.strong_buy +
          quote.recommendation.buy +
          quote.recommendation.hold +
          quote.recommendation.sell +
          quote.recommendation.strong_sell >
          0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Analyst Recommendations</span>
              {quote.recommendation.period && (
                <span className="text-slate-500">
                  {quote.recommendation.period}
                </span>
              )}
            </div>

            {/* Stacked horizontal bar */}
            {(() => {
              const rec = quote.recommendation!;
              const total =
                rec.strong_buy +
                rec.buy +
                rec.hold +
                rec.sell +
                rec.strong_sell;
              const segments = [
                {
                  label: 'Strong Buy',
                  count: rec.strong_buy,
                  color: 'bg-emerald-500',
                },
                { label: 'Buy', count: rec.buy, color: 'bg-emerald-400' },
                { label: 'Hold', count: rec.hold, color: 'bg-amber-400' },
                { label: 'Sell', count: rec.sell, color: 'bg-rose-400' },
                {
                  label: 'Strong Sell',
                  count: rec.strong_sell,
                  color: 'bg-rose-500',
                },
              ];

              return (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {segments.map(
                      (seg) =>
                        seg.count > 0 && (
                          <div
                            key={seg.label}
                            className={`${seg.color} rounded-sm`}
                            style={{
                              width: `${(seg.count / total) * 100}%`,
                            }}
                            title={`${seg.label}: ${seg.count}`}
                          />
                        )
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {segments.map(
                      (seg) =>
                        seg.count > 0 && (
                          <div
                            key={seg.label}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${seg.color}`}
                            />
                            <span className="text-slate-400">{seg.label}</span>
                            <span className="font-semibold text-slate-300">
                              {seg.count}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

      {/* === SECTION 5: Day Range Bar === */}
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
              isUp
                ? 'from-emerald-500 to-teal-400'
                : 'from-rose-500 to-pink-400'
            }`}
            style={{
              width: `${
                quote.high > quote.low
                  ? ((quote.current_price - quote.low) /
                      (quote.high - quote.low)) *
                    100
                  : 50
              }%`,
            }}
          />
        </div>
      </div>

      {/* === SECTION 6: 52-Week Range Bar === */}
      {quote.financials?.week_52_high != null &&
        quote.financials?.week_52_low != null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>52 Week Range</span>
              <span>
                ${quote.financials.week_52_low.toFixed(2)} — $
                {quote.financials.week_52_high.toFixed(2)}
              </span>
            </div>
            <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${
                  isUp
                    ? 'from-emerald-500 to-teal-400'
                    : 'from-rose-500 to-pink-400'
                }`}
                style={{
                  width: `${
                    quote.financials.week_52_high > quote.financials.week_52_low
                      ? ((quote.current_price - quote.financials.week_52_low) /
                          (quote.financials.week_52_high -
                            quote.financials.week_52_low)) *
                        100
                      : 50
                  }%`,
                }}
              />
            </div>
          </div>
        )}
    </motion.div>
  );
};
