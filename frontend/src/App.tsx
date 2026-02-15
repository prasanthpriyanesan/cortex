import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { stocksAPI, alertsAPI, authAPI, notificationsAPI } from './services/api';
import { AuthPage } from './components/Auth/AuthPage';
import { Navbar } from './components/Layout/Navbar';
import { Sidebar } from './components/Layout/Sidebar';
import { StockSearch } from './components/Dashboard/StockSearch';
import { StockCard } from './components/Dashboard/StockCard';
import { AlertList } from './components/Dashboard/AlertList';
import { CreateAlertModal } from './components/Dashboard/CreateAlertModal';
import { StatsOverview } from './components/Dashboard/StatsOverview';
import { SectorsPage } from './components/Dashboard/SectorsPage';
import { SectorWidget } from './components/Dashboard/SectorWidget';
import { ToastContainer, Toast } from './components/Toast/ToastContainer';

type View = 'dashboard' | 'search' | 'alerts' | 'sectors' | 'analytics';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stock data
  const [symbol, setSymbol] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showCreateAlert, setShowCreateAlert] = useState(false);

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastNotifIdRef = useRef<number>(-1); // Initialize to -1 to differentiate from 0
  const notifPollRef = useRef<NodeJS.Timeout>();

  // Check login on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI
        .getCurrentUser()
        .then((res) => {
          setIsLoggedIn(true);
          setUsername(res.data.username);
          loadAlerts();
          pollNotifications();   // start polling on mount
        })
        .catch(() => {
          localStorage.removeItem('access_token');
        });
    }
  }, []);

  // Set up notification polling when logged in
  useEffect(() => {
    if (isLoggedIn) {
      notifPollRef.current = setInterval(pollNotifications, 15000); // 15s
      return () => {
        if (notifPollRef.current) clearInterval(notifPollRef.current);
      };
    }
  }, [isLoggedIn]);

  const pollNotifications = async () => {
    try {
      // Fetch unread count
      const countRes = await notificationsAPI.getUnreadCount();
      setUnreadCount(countRes.data.count);

      // Fetch recent unread notifications for toasts
      const listRes = await notificationsAPI.getAll({ unread_only: true, limit: 5 });
      const newNotifs = listRes.data as any[];

      if (lastNotifIdRef.current === -1) {
        // First poll after login — seed the ref, don't toast old notifications
        lastNotifIdRef.current = newNotifs.length > 0
          ? Math.max(...newNotifs.map((n: any) => n.id))
          : 0;
      } else {
        // Subsequent polls — show toasts for brand-new notifications
        const brandNew = newNotifs.filter((n: any) => n.id > lastNotifIdRef.current);
        if (brandNew.length > 0) {
          setToasts((prev) => [
            ...brandNew.map((n: any) => ({
              id: n.id,
              title: n.title,
              symbol: n.symbol,
              trigger_price: n.trigger_price,
              alert_type: n.alert_type,
              threshold_value: n.threshold_value,
              created_at: n.created_at,
            })),
            ...prev,
          ].slice(0, 5));

          lastNotifIdRef.current = Math.max(...brandNew.map((n: any) => n.id));
        }
      }

      // Always keep ref up to date
      if (newNotifs.length > 0) {
        const maxId = Math.max(...newNotifs.map((n: any) => n.id));
        if (maxId > lastNotifIdRef.current) {
          lastNotifIdRef.current = maxId;
        }
      }
    } catch (err) {
      // silently fail — notifications are non-critical
    }
  };

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await alertsAPI.getAll();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  }, []);

  const handleLoginSuccess = async () => {
    setIsLoggedIn(true);
    try {
      const res = await authAPI.getCurrentUser();
      setUsername(res.data.username);
    } catch { }
    loadAlerts();
    pollNotifications();
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    setUsername('');
    setAlerts([]);
    setQuote(null);
    setSymbol('');
    setUnreadCount(0);
    setToasts([]);
    lastNotifIdRef.current = -1;
    if (notifPollRef.current) clearInterval(notifPollRef.current);
  };

  const fetchQuote = useCallback(
    async (sym?: string) => {
      const s = sym || symbol;
      if (!s) return;
      setQuoteLoading(true);
      try {
        const response = await stocksAPI.getQuote(s);
        setQuote({ ...response.data, symbol: s });
        setSymbol(s);
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setQuoteLoading(false);
      }
    },
    [symbol]
  );

  // Not logged in => Auth page
  if (!isLoggedIn) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  const renderContent = () => {
    switch (currentView) {
      case 'search':
        return (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold mb-1">Search Stocks</h2>
              <p className="text-slate-400 text-sm">Find stocks and view real-time quotes</p>
            </div>
            <StockSearch onSelectSymbol={(s) => fetchQuote(s)} />
            {quote && (
              <StockCard
                quote={quote}
                onRefresh={() => fetchQuote()}
                loading={quoteLoading}
              />
            )}
          </motion.div>
        );

      case 'alerts':
        return (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">My Alerts</h2>
                <p className="text-slate-400 text-sm">{alerts.length} total alerts</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateAlert(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Alert
              </motion.button>
            </div>
            <AlertList alerts={alerts} onRefresh={loadAlerts} />
          </motion.div>
        );

      case 'sectors':
        return (
          <motion.div
            key="sectors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SectorsPage />
          </motion.div>
        );

      case 'analytics':
        return (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold mb-1">Analytics</h2>
              <p className="text-slate-400 text-sm">Track your portfolio and alert performance</p>
            </div>
            <StatsOverview alerts={alerts} />
            <div className="card text-center py-16">
              <p className="text-slate-400">
                Advanced charts and analytics coming soon.
              </p>
            </div>
          </motion.div>
        );

      default: // dashboard
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Welcome */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  Welcome back, <span className="gradient-text">{username}</span>
                </h2>
                <p className="text-slate-400 text-sm">
                  Here's what's happening with your stock alerts
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateAlert(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Alert
              </motion.button>
            </div>

            {/* Stats */}
            <StatsOverview alerts={alerts} />

            {/* Quick Search */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Quick Search</h3>
              <StockSearch onSelectSymbol={(s) => fetchQuote(s)} />
            </div>

            {/* Quote Card */}
            {quote && (
              <StockCard
                quote={quote}
                onRefresh={() => fetchQuote()}
                loading={quoteLoading}
              />
            )}

            {/* Sectors Widget */}
            <SectorWidget onViewAllSectors={() => setCurrentView('sectors')} />

            {/* Recent Alerts */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Recent Alerts</h3>
                {alerts.length > 3 && (
                  <button
                    onClick={() => setCurrentView('alerts')}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    View all
                  </button>
                )}
              </div>
              <AlertList
                alerts={alerts.slice(0, 5)}
                onRefresh={loadAlerts}
              />
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        username={username}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        alertCount={activeAlertCount}
        unreadNotifications={unreadCount}
        onUnreadCountChange={setUnreadCount}
      />

      <div className="flex">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Create Alert Modal */}
      <CreateAlertModal
        isOpen={showCreateAlert}
        onClose={() => setShowCreateAlert(false)}
        onCreated={loadAlerts}
        defaultSymbol={symbol}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
