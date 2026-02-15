import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  Bell,
  BarChart3,
  FolderOpen,
  Settings,
  X,
} from 'lucide-react';

type View = 'dashboard' | 'search' | 'alerts' | 'sectors' | 'analytics';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'search' as View, label: 'Search', icon: Search },
  { id: 'alerts' as View, label: 'Alerts', icon: Bell },
  { id: 'sectors' as View, label: 'Sectors', icon: FolderOpen },
  { id: 'analytics' as View, label: 'Analytics', icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isOpen,
  onClose,
}) => {
  const sidebarContent = (
    <div className="flex flex-col h-full py-6 px-3">
      {/* Close button on mobile */}
      <div className="lg:hidden flex justify-end px-2 mb-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                onClose();
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20 shadow-lg shadow-primary/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-primary/50"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Settings */}
      <div className="pt-4 border-t border-white/[0.06]">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-60 shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] glass border-r border-white/[0.06]">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] glass border-r border-white/[0.06]"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
