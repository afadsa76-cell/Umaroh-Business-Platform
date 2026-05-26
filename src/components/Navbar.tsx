import React, { useState } from 'react';
import { 
  Database, 
  FileSpreadsheet, 
  ShoppingCart, 
  LayoutDashboard, 
  Hotel, 
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
  Truck
} from 'lucide-react';
import { Role } from './LoginView';

export type TabType = 'dashboard' | 'validasi-mitra' | 'user-database' | 'database' | 'templates' | 'mapping' | 'sales-order' | 'flights' | 'tracker' | 'manifest' | 'revenue' | 'tl-portal' | 'inventory' | 'perlengkapan' | 'finance' | 'mitra-tracker' | 'profile';
export type CategoryType = 'mitra_dev' | 'operasional' | 'finance' | 'marketing';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: Role | null;
  subRole?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, userRole, subRole }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const allNavItems: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'validasi-mitra', label: 'Validasi Mitra', icon: Users },
    { id: 'user-database', label: 'Database User', icon: Users },
    { id: 'database', label: 'Database Master', icon: Database },
    { id: 'templates', label: 'Templates', icon: FileSpreadsheet },
    { id: 'mapping', label: 'Mapping Pembayaran & Booking', icon: Hotel },
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
    { id: 'profile', label: 'Profil Saya', icon: Users },
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
      items: ['dashboard', 'database', 'sales-order', 'flights', 'tracker', 'manifest', 'tl-portal', 'inventory', 'perlengkapan']
    },
    {
      id: 'finance',
      label: '3. FINANCE',
      icon: Coins,
      items: ['finance', 'mitra-tracker', 'mapping', 'revenue']
    },
    {
      id: 'marketing',
      label: '4. DIGITAL MARKETING',
      icon: Megaphone,
      items: ['templates', 'profile']
    }
  ];

  const navItems = userRole === 'mitra' 
    ? allNavItems.filter(item => item.id === 'templates' || item.id === 'flights')
    : allNavItems;

  // Find category for any tab
  const getCategoryOfTab = (tab: TabType): CategoryType => {
    const found = CATEGORIES.find(c => c.items.includes(tab));
    return found ? found.id : 'operasional';
  };

  const [activeCategory, setActiveCategory] = useState<CategoryType>(getCategoryOfTab(activeTab));

  // Keep category in sync with active tab updates from parent
  React.useEffect(() => {
    setActiveCategory(getCategoryOfTab(activeTab));
  }, [activeTab]);

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

  return (
    <>
      {/* Desktop categorized header */}
      <nav className="bg-white shadow-md border-b border-gray-100 sticky top-0 z-40 hidden lg:block">
        <div className="container mx-auto px-4 py-3">
          {/* Main Category Tabs */}
          <div className="flex justify-center border-b border-gray-100 pb-3 mb-3">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1.5">
              {visibleCategories.map((cat) => {
                const CatIcon = cat.icon;
                const isCatActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      // Auto switch current active tab to the first allowed item in this category
                      if (cat.allowedItems.length > 0 && !cat.allowedItems.includes(activeTab)) {
                        onTabChange(cat.allowedItems[0] as TabType);
                      }
                    }}
                    className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200
                      ${isCatActive 
                        ? 'bg-amber-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                      }
                    `}
                  >
                    <CatIcon className={`w-4 h-4 ${isCatActive ? 'text-white' : 'text-gray-400'}`} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Navigation Items for selected Category */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-wrap gap-2 flex-grow justify-center items-center">
              {navItems
                .filter(item => getCategoryOfTab(item.id) === activeCategory)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-200 whitespace-nowrap uppercase tracking-wider border
                        ${isActive 
                          ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm' 
                          : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-950 border-gray-200'
                        }
                      `}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              <button className="relative p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </div>
        </div>
      </nav>

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
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-amber-600' : 'text-gray-400'}`}
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
              <span className="font-black text-amber-600 text-lg tracking-tight uppercase">Dashboard Umaroh</span>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-5">
              {visibleCategories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="text-[10px] font-black tracking-wider text-amber-700 uppercase flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
                      <CatIcon className="w-3.5 h-3.5 text-amber-600" />
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
                                ${isActive ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-50'}
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

