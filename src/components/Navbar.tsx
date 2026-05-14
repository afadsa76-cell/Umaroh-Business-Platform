import React, { useState } from 'react';
import { Database, FileSpreadsheet, ShoppingCart, LayoutDashboard, Hotel, Bell, Plane, Menu, X, MapPin, FileText, TrendingUp, Users } from 'lucide-react';
import { Role } from './LoginView';

export type TabType = 'dashboard' | 'validasi-mitra' | 'user-database' | 'database' | 'templates' | 'mapping' | 'sales-order' | 'flights' | 'tracker' | 'manifest' | 'revenue' | 'tl-portal' | 'inventory' | 'finance' | 'profile';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: Role | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, userRole }) => {
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
    { id: 'finance', label: 'Finance & Keuangan', icon: TrendingUp },
    { id: 'profile', label: 'Profil Saya', icon: Users },
  ];

  const navItems = userRole === 'mitra' 
    ? allNavItems.filter(item => item.id === 'templates' || item.id === 'flights')
    : allNavItems;

  const handleTabClick = (id: TabType) => {
    onTabChange(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between min-h-[4rem] py-2">
            {/* Desktop Navigation */}
            <div className="flex flex-wrap gap-2 flex-grow justify-center items-center">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                      ${isActive 
                        ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-600/20' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
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

      {/* Mobile Sidebar Full Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <span className="font-black text-amber-600 text-xl tracking-tighter">UMAROH MENU</span>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

