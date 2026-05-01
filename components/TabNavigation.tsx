
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../types';
import { Icons } from '../constants';

interface TabNavigationProps {
  activeView: ViewState;
  onViewChange: (view: ViewState) => void;
  pendingCount: number;
  activeOrdersCount: number;
  onToggleOrders: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeView, 
  onViewChange, 
  pendingCount,
  activeOrdersCount,
  onToggleOrders
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs = [
    { id: 'pos', icon: <Icons.Cart />, label: 'Venta' },
    { id: 'tables', icon: <Icons.Layout />, label: 'Mesas' },
    { id: 'dispatch', icon: <Icons.ChefHat />, label: 'Cocina', badge: pendingCount },
    { id: 'history', icon: <Icons.Chart />, label: 'Admin' },
    { id: 'settings', icon: <Icons.Settings />, label: 'Config' }
  ];

  const handleTabClick = (id: string) => {
    onViewChange(id as ViewState);
    setIsSidebarOpen(false);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Desktop Navigation (Header) */}
        <nav className="hidden md:flex items-center space-x-1 sm:space-x-2 bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
          {tabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id as ViewState)}
                aria-label={`Ver ${tab.label}`}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300
                  ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-desktop"
                    className="absolute inset-0 bg-red-600 rounded-xl shadow-lg shadow-red-900/40"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{tab.icon}</span>
                <span className="relative z-10 text-[10px] sm:text-xs font-black uppercase tracking-wider hidden lg:block">
                  {tab.label}
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`
                    relative z-10 ml-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-black 
                    ${isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white animate-pulse'}
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Active Orders Button (Desktop) */}
        <button 
          onClick={onToggleOrders}
          className="hidden md:flex items-center justify-center p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-500 hover:border-red-500/50 transition-all relative group"
          title="Pedidos Activos"
        >
          <Icons.History />
          {activeOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-black flex items-center justify-center rounded-full ring-2 ring-black animate-pulse">
              {activeOrdersCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Menu Trigger (Hamburger) */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden p-2 text-white hover:text-red-500 transition-colors"
        aria-label="Abrir menú"
      >
        <Icons.Menu />
      </button>

      {/* Mobile Sidebar Navigation */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden"
            />
            
            {/* Drawer */}
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-black border-l border-red-600/30 z-[120] md:hidden shadow-2xl flex flex-col p-6"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center space-x-3">
                  <span className="text-red-600">
                    <Icons.ChefHat />
                  </span>
                  <span className="text-lg font-black tracking-tighter uppercase text-white">Menú</span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <Icons.X />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4 mb-2">Vistas</div>
                {tabs.map((tab) => {
                  const isActive = activeView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id as ViewState)}
                      className={`
                        w-full flex items-center space-x-4 p-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest
                        ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}
                      `}
                    >
                      <span className="opacity-70">{tab.icon}</span>
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-900 space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4 mb-2">Seguimiento</div>
                <button
                  onClick={() => {
                    onToggleOrders();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-900 hover:text-white"
                >
                  <Icons.History />
                  <span>Pedidos Activos</span>
                  {activeOrdersCount > 0 && (
                    <span className="ml-auto bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                      {activeOrdersCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-auto pt-8 border-t border-slate-900">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">
                  POS - Red & Black Edition
                </p>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default TabNavigation;

