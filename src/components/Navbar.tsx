import React, { useState } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  ShoppingCart, 
  LayoutDashboard, 
  Bell, 
  Plane, 
  Menu, 
  X, 
  MapPin, 
  FileText, 
  TrendingUp, 
  Users,
  Handshake,
  Sliders,
  Coins,
  Megaphone,
  Truck,
  Layers,
  Crown,
  LogOut,
  Landmark
} from 'lucide-react';
import { Role } from './LoginView';

export type TabType = 'dashboard' | 'owner-kpi' | 'validasi-mitra' | 'user-database' | 'database' | 'templates' | 'sales-order' | 'flights' | 'tracker' | 'manifest' | 'revenue' | 'tl-portal' | 'inventory' | 'perlengkapan' | 'finance' | 'mitra-tracker' | 'profile' | 'tracker-vendor' | 'ad-management' | 'vendor-maskapai' | 'vendor-hotel' | 'finance-cumulative';
export type CategoryType = 'mitra_dev' | 'operasional' | 'finance' | 'marketing';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: Role | null;
  subRole?: string | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, userRole, subRole, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const allNavItems: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'owner-kpi', label: 'Dashboard KPI Owner', icon: Crown },
    { id: 'validasi-mitra', label: 'Validasi Mitra', icon: Users },
    { id: 'user-database', label: 'Database User', icon: Users },
    { id: 'database', label: 'Database Master', icon: Database },
    { id: 'templates', label: 'Templates', icon: FileSpreadsheet },
    { id: 'sales-order', label: 'Sales Order', icon: ShoppingCart },
    { id: 'flights', label: 'Monitoring Penerbangan', icon: Plane },
    { id: 'tracker', label: 'Mapping & Tracker Paket, Jamaah & Keberangkatan', icon: MapPin },
    { id: 'manifest', label: 'Generate Manifest', icon: FileText },
    { id: 'revenue', label: 'Laporan Pendapatan', icon: TrendingUp },
    { id: 'tl-portal', label: 'Portal TL (Mobile)', icon: MapPin },
    { id: 'inventory', label: 'Inventory & Gudang', icon: Database },
    { id: 'perlengkapan', label: 'Perlengkapan & Distribusi', icon: Truck },
    { id: 'finance', label: 'Finance & Keuangan', icon: TrendingUp },
    { id: 'mitra-tracker', label: 'Tracker Mitra (Realtime)', icon: Handshake },
    { id: 'tracker-vendor', label: 'Cost Component Tracker (ERP)', icon: Layers },
    { id: 'finance-cumulative', label: 'Laporan Konsolidasi (Kumulatif)', icon: Landmark },
    { id: 'ad-management', label: 'Iklan & Ad Management (Ads)', icon: Megaphone },
    { id: 'profile', label: 'Profil Saya', icon: Users },
    { id: 'vendor-maskapai', label: 'Update Data Maskapai', icon: Plane },
    { id: 'vendor-hotel', label: 'Update Data Hotel', icon: Database },
  ];

  const CATEGORIES: {
    id: CategoryType;
    label: string;
    icon: React.ElementType;
    items: TabType[];
  }[] = [
    {
      id: 'mitra_dev',
      label: '1. MITRA DEVELOPMENT',
      icon: Handshake,
      items: ['validasi-mitra', 'user-database']
    },
    {
      id: 'operasional',
      label: '2. OPERASIONAL',
      icon: Sliders,
      items: ['owner-kpi', 'database', 'sales-order', 'flights', 'tracker', 'manifest', 'tl-portal', 'inventory', 'perlengkapan']
    },
    {
      id: 'finance',
      label: '3. FINANCE',
      icon: Coins,
      items: ['revenue', 'finance', 'mitra-tracker', 'tracker-vendor', 'finance-cumulative']
    },
    {
      id: 'marketing',
      label: '4. DIGITAL MARKETING',
      icon: Megaphone,
      items: ['templates', 'ad-management', 'profile']
    }
  ];

  const navItems = userRole === 'mitra' 
    ? allNavItems.filter(item => item.id === 'templates' || item.id === 'flights')
    : userRole === 'vendor'
      ? allNavItems.filter(item => 
          item.id === 'dashboard' || 
          item.id === 'profile' || 
          (subRole === 'vendor_maskapai' && item.id === 'vendor-maskapai') || 
          (subRole === 'vendor_hotel' && item.id === 'vendor-hotel')
        )
      : allNavItems;

  const handleTabClick = (id: TabType) => {
    onTabChange(id);
    setIsMenuOpen(false);
  };

  // Pre-filter visible categories based on items role has access to and admin subRole
  const visibleCategories = CATEGORIES
    .filter(category => !subRole || category.id === subRole)
    .map(category => {
      const allowedItems = category.items.filter(itemId => navItems.some(item => item.id === itemId));
      return { ...category, allowedItems };
    })
    .filter(category => category.allowedItems.length > 0);

  const allowedTabIds = ['dashboard', ...visibleCategories.flatMap(c => c.allowedItems)];
  const activeNavItems = navItems.filter(item => allowedTabIds.includes(item.id));

  return (
    <>
      {/* Desktop Left Sidebar (Only visible on lg screens) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30 lg:overflow-y-auto print:hidden">
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-gray-150 flex flex-col gap-1 items-start bg-indigo-50/10">
          <div className="bg-indigo-600 py-2.5 px-4 rounded-xl flex items-center justify-center border border-indigo-700 shadow-sm w-full mb-1">
            <img 
              src="https://umaroh.com/assets/logo-light-D4UzTX0_.png" 
              alt="Logo Umaroh" 
              className="h-8 object-contain max-w-full" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="mt-2 w-full text-center">
            <span className="text-[10px] text-indigo-800 font-extrabold tracking-widest uppercase block font-sans">
              {userRole === 'vendor' ? 'PORTAL VENDOR' : 'PORTAL ADMIN UMAROH'}
            </span>
          </div>
        </div>

        {/* User Info Card in Sidebar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-750 font-black flex items-center justify-center text-xs uppercase shadow-sm shrink-0">
            {userRole === 'vendor' ? 'VD' : (userRole === 'admin' ? 'AD' : 'OP')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-gray-800 truncate uppercase mt-0.5 leading-none">
              {userRole === 'vendor' ? (subRole === 'vendor_maskapai' ? 'Vendor Maskapai' : 'Vendor Hotel') : (userRole === 'admin' ? 'Administrator' : (subRole ? `Ops - ${subRole}` : 'Operasional'))}
            </p>
            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest whitespace-nowrap block mt-1">
              {userRole === 'vendor' ? 'VENDOR LIMITED ACCESS' : 'SYSTEM LEVEL ACCESS'}
            </span>
          </div>
        </div>

        {/* Sidebar Items Sorted by Category */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4 no-scrollbar">
          {/* Standalone Dashboard menu item, always visible at the very top */}
          <div className="space-y-1">
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`
                w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer justify-start
                ${activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-indigo-50/55 hover:bg-indigo-50 text-indigo-950 border border-indigo-100/50 shadow-sm'
                }
              `}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-600'}`} />
              <span className="truncate text-left leading-tight py-0.5 uppercase tracking-wide">Dashboard</span>
            </button>
          </div>

          {userRole === 'vendor' && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black tracking-wider text-indigo-700 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 rounded-lg">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                MENU UTAMA VENDOR
              </div>
              <div className="flex flex-col gap-0.5 pl-1">
                {navItems.filter(item => item.id !== 'dashboard').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer justify-start
                        ${isActive 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-gray-650 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600/70'}`} />
                      <span className="truncate text-left leading-tight py-0.5">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {visibleCategories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.id} className="space-y-1.5">
                {/* Category Header Section */}
                <div className="text-[10px] font-black tracking-wider text-indigo-700 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 rounded-lg">
                  <CatIcon className="w-3.5 h-3.5 text-indigo-600" />
                  {cat.label}
                </div>
                {/* Items */}
                <div className="flex flex-col gap-0.5 pl-1">
                  {navItems
                    .filter(item => cat.allowedItems.includes(item.id))
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer justify-start
                            ${isActive 
                              ? 'bg-indigo-600 text-white shadow-md' 
                              : 'text-gray-650 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600/70'}`} />
                          <span className="truncate text-left leading-tight py-0.5">{item.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer with Logout Button */}
        {onLogout && (
          <div className="p-4 border-t border-gray-150">
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-xs font-black bg-red-55/10 hover:bg-red-50 text-red-650 hover:text-red-700 py-3 rounded-xl transition-all cursor-pointer border border-red-200/40 shadow-sm uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sistem
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Header */}
      <nav className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Menu className="w-5 h-5 text-gray-600" onClick={() => setIsMenuOpen(true)} />
          <span className="font-bold text-gray-800 truncate max-w-[200px]">
            {allNavItems.find(i => i.id === activeTab)?.label || 'Menu'}
          </span>
        </div>
        <button className="relative p-2 text-gray-400">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe">
        <div className="flex justify-around items-center h-16">
          {activeNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate w-full px-1 text-center">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-full h-full text-gray-400"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Full Menu Overlay with categorized items */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <span className="font-black text-indigo-600 text-lg tracking-tight uppercase">Dashboard Umaroh</span>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-5">
              {/* Standalone Dashboard menu item, always visible at the very top */}
              <div className="space-y-1 bg-indigo-50/50 p-1.5 rounded-xl border border-indigo-100/30">
                <button
                  onClick={() => handleTabClick('dashboard')}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-black transition-all justify-start
                    ${activeTab === 'dashboard' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-indigo-950 hover:bg-gray-50'
                    }
                  `}
                >
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>DASHBOARD</span>
                </button>
              </div>

              {visibleCategories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="text-[10px] font-black tracking-wider text-indigo-700 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg">
                      <CatIcon className="w-3.5 h-3.5 text-indigo-600" />
                      {cat.label}
                    </div>
                    <div className="flex flex-col gap-1 pl-1">
                      {navItems
                        .filter(item => cat.allowedItems.includes(item.id))
                        .map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleTabClick(item.id)}
                              className={`
                                flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all
                                ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}
                              `}
                            >
                              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                              {item.label}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

