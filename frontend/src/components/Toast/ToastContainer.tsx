import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';

export interface Toast {
    id: number;
    title: string;
    symbol: string;
    trigger_price: number | null;
    alert_type: string | null;
    threshold_value: number | null;
    created_at: string;
}

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: number) => void;
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
    price_above: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    price_below: <TrendingDown className="w-5 h-5 text-rose-400" />,
    percent_change: <BarChart3 className="w-5 h-5 text-amber-400" />,
    volume_spike: <AlertTriangle className="w-5 h-5 text-purple-400" />,
};

const ALERT_COLORS: Record<string, string> = {
    price_above: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    price_below: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
    percent_change: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    volume_spike: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({
    toast,
    onDismiss,
}) => {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 8000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const alertType = toast.alert_type || 'price_above';
    const icon = ALERT_ICONS[alertType] || ALERT_ICONS.price_above;
    const colorClass = ALERT_COLORS[alertType] || ALERT_COLORS.price_above;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-[340px] rounded-2xl border bg-gradient-to-br backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden ${colorClass}`}
        >
            {/* Progress bar */}
            <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 8, ease: 'linear' }}
                className="absolute top-0 left-0 right-0 h-[3px] origin-left"
                style={{
                    background:
                        alertType === 'price_above'
                            ? 'linear-gradient(to right, #10b981, #34d399)'
                            : alertType === 'price_below'
                                ? 'linear-gradient(to right, #f43f5e, #fb7185)'
                                : alertType === 'percent_change'
                                    ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
                                    : 'linear-gradient(to right, #a855f7, #c084fc)',
                }}
            />

            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                        {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white">{toast.symbol}</span>
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                Alert
                            </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-snug">{toast.title}</p>
                        {toast.trigger_price != null && (
                            <div className="mt-2 flex items-baseline gap-1.5">
                                <span className="text-lg font-bold text-white">
                                    ${toast.trigger_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[11px] text-slate-400">triggered</span>
                            </div>
                        )}
                    </div>

                    {/* Close */}
                    <button
                        onClick={() => onDismiss(toast.id)}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-auto">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </AnimatePresence>
        </div>
    );
};
