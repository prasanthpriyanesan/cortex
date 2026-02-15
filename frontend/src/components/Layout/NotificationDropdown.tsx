import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Check,
    CheckCheck,
    TrendingUp,
    TrendingDown,
    BarChart3,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { notificationsAPI } from '../../services/api';

interface Notification {
    id: number;
    alert_id: number | null;
    channel: string;
    title: string;
    message: string | null;
    symbol: string;
    trigger_price: number | null;
    alert_type: string | null;
    threshold_value: number | null;
    is_read: boolean;
    created_at: string;
}

interface NotificationDropdownProps {
    unreadCount: number;
    onUnreadCountChange: (count: number) => void;
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
    price_above: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    price_below: <TrendingDown className="w-4 h-4 text-rose-400" />,
    percent_change: <BarChart3 className="w-4 h-4 text-amber-400" />,
    volume_spike: <AlertTriangle className="w-4 h-4 text-purple-400" />,
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    unreadCount,
    onUnreadCountChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationsAPI.getAll({ limit: 20 });
            setNotifications(res.data);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationsAPI.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            onUnreadCountChange(Math.max(0, unreadCount - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            onUnreadCountChange(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl glass glass-hover"
            >
                <Bell className="w-5 h-5 text-slate-300" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-rose-500/30"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] rounded-2xl glass border border-white/[0.08] shadow-2xl shadow-black/40 overflow-hidden z-[60]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded-full">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto max-h-[380px] scrollbar-thin">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Bell className="w-8 h-8 mb-2 opacity-40" />
                                    <p className="text-sm">No notifications yet</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Alerts will appear here when triggered
                                    </p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`flex items-start gap-3 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-default ${!n.is_read ? 'bg-primary/[0.04]' : ''
                                            }`}
                                    >
                                        {/* Icon */}
                                        <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                                            {ALERT_ICONS[n.alert_type || ''] || ALERT_ICONS.price_above}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white">{n.symbol}</span>
                                                {!n.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed truncate">
                                                {n.title}
                                            </p>
                                            {n.trigger_price != null && (
                                                <span className="text-xs font-semibold text-white mt-1 inline-block">
                                                    ${n.trigger_price.toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-500 mt-1 block">
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>

                                        {/* Mark as read */}
                                        {!n.is_read && (
                                            <button
                                                onClick={() => handleMarkAsRead(n.id)}
                                                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-emerald-400 transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
