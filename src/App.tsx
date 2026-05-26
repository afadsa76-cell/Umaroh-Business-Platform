/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Footer } from './components/Footer';
import { Navbar, TabType } from './components/Navbar';
import { DatabaseView } from './components/DatabaseView';
import { DashboardView } from './components/DashboardView';
import { MappingPaketJadiView } from './components/MappingPaketJadiView';
import { TemplatesView } from './components/TemplatesView';
import { SalesOrderView } from './components/SalesOrderView';
import { FlightMonitoringView } from './components/FlightMonitoringView';
import { TrackerView } from './components/TrackerView';
import { TourLeaderPortal } from './components/TourLeaderPortal';
import { ManifestPage } from './components/manifest/ManifestPage';
import { RevenueReport } from './components/RevenueReport';
import { InventoryView } from './components/inventory/InventoryView';
import { PerlengkapanView } from './components/inventory/PerlengkapanView';
import { FinanceDashboard } from './components/finance/FinanceDashboard';
import { MitraTrackerView } from './components/finance/MitraTrackerView';
import { LoginView, Role } from './components/LoginView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardMitra } from './components/DashboardMitra';
import { DashboardJamaah } from './components/DashboardJamaah';
import { RegisterMitraView } from './components/RegisterMitraView';
import { ValidasiMitraView } from './components/ValidasiMitraView';
import { UserDatabaseView } from './components/UserDatabaseView';
import { ProfileView } from './components/ProfileView';
import { logoBase64 } from './utils/logoBase64';
import { LogOut, User, Settings, Users } from 'lucide-react';
import { auth, db, doc, getDoc, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const categoryItems: Record<string, string[]> = {
  mitra_dev: ['validasi-mitra', 'user-database'],
  operasional: ['dashboard', 'database', 'sales-order', 'flights', 'tracker', 'manifest', 'tl-portal', 'inventory', 'perlengkapan'],
  finance: ['finance', 'mitra-tracker', 'mapping', 'revenue'],
  marketing: ['templates', 'profile']
};

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [subRole, setSubRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [adminViewMode, setAdminViewMode] = useState<'operasional' | 'mitra' | 'jamaah'>('operasional');
  const [showRegisterMitra, setShowRegisterMitra] = useState(false);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email);
        const isMA = user.email === 'operationalumaroh@gmail.com' || user.email === 'afadsa76@gmail.com';
        
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role as Role);
            setSubRole(data.subRole || null);
            
            // Set initial tab based on role and subRole
            if (data.role === 'mitra') setActiveTab('dashboard' as TabType);
            else if (data.role === 'jamaah') setActiveTab('dashboard' as TabType);
            else {
              if (data.subRole && categoryItems[data.subRole]) {
                setActiveTab(categoryItems[data.subRole][0] as TabType);
              } else {
                setActiveTab('dashboard');
              }
            }
          } else {
            // Master Admin bypass: If user doc doesn't exist yet, we still allow master admins
            if (isMA) {
              setUserRole('admin');
              setIsLoggedIn(true);
              setActiveTab('dashboard');
            } else {
              setIsLoggedIn(false);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          if (isMA) {
            // Always grant Master Admin fallback access regardless of Firestore errors
            setUserRole('admin');
            setIsLoggedIn(true);
            setActiveTab('dashboard');
          } else {
            const isErrorOffline = error instanceof Error && (
              error.message.includes('offline') || 
              error.message.includes('Could not reach Cloud Firestore backend') ||
              error.message.includes('timeout')
            );
            if (isErrorOffline) {
              setIsOffline(true);
              // Standby / offline fallback for existing session info if accessible
              console.warn("Firestore client is offline. App is operating in offline mode.");
            } else if (error instanceof Error && !error.message.includes('permission-denied')) {
               // We don't throw on permission-denied here because it might happen before user registers
               handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            }
          }
        }
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
        setSubRole(null);
        setUserEmail(null);
      }
      setIsAuthReady(true);
    });
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isMasterAdmin = userEmail === 'operationalumaroh@gmail.com' || userEmail === 'afadsa76@gmail.com';

  const handleLogin = (role: Role, subRole?: string) => {
    setUserRole(role);
    if (subRole) {
      setSubRole(subRole);
    } else {
      setSubRole(null);
    }
    
    if (role === 'mitra') setActiveTab('dashboard' as TabType);
    else if (role === 'jamaah') setActiveTab('dashboard' as TabType);
    else {
      if (subRole && categoryItems[subRole]) {
        setActiveTab(categoryItems[subRole][0] as TabType);
      } else {
        setActiveTab('dashboard');
      }
    }
    
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
      setSubRole(null);
      setUserEmail(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!isLoggedIn || (!userRole && !isMasterAdmin)) {
    if (showRegisterMitra) {
      return <RegisterMitraView onBack={() => setShowRegisterMitra(false)} />;
    }
    return <LoginView onLogin={handleLogin} onGoToRegister={() => setShowRegisterMitra(true)} />;
  }

  const renderContent = () => {
    if (isMasterAdmin) {
      if (adminViewMode === 'mitra') return <DashboardMitra />;
      if (adminViewMode === 'jamaah') return <DashboardJamaah />;
      // else fall through to operasional routes
    } else {
      // Route based on role first
      if (userRole === 'mitra') return <DashboardMitra />;
      if (userRole === 'jamaah') return <DashboardJamaah />;
    }

    // Operasional / Admin routes
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={handleTabChange} />;
      case 'validasi-mitra':
        return <ValidasiMitraView />;
      case 'user-database':
        return <UserDatabaseView />;
      case 'database':
        return <DatabaseView />;
      case 'templates':
        return <TemplatesView />;
      case 'mapping':
        return <MappingPaketJadiView />;
      case 'sales-order':
        return <SalesOrderView />;
      case 'flights':
        return <FlightMonitoringView />;
      case 'tracker':
        return <TrackerView />;
      case 'manifest':
        return <ManifestPage />;
      case 'revenue':
        return <RevenueReport />;
      case 'tl-portal':
        return <TourLeaderPortal />;
      case 'inventory':
        return <InventoryView />;
      case 'perlengkapan':
        return <PerlengkapanView />;
      case 'finance':
        return <FinanceDashboard />;
      case 'mitra-tracker':
        return <MitraTrackerView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView onNavigate={handleTabChange} />;
    }
  };

  const getRoleDisplay = () => {
    if (isMasterAdmin) return 'Master Admin';
    if (userRole === 'admin') return 'Administrator';
    if (userRole === 'mitra') return 'Mitra Travel';
    if (userRole === 'jamaah') return 'Jamaah';
    if (userRole === 'operasional') {
      return subRole ? `Ops - ${subRole}` : 'Operasional';
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col relative pb-20">
      {/* Hero Section */}
      <header className="bg-white text-gray-900 py-6 md:py-12 relative overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 opacity-5 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
        
        {/* User Info & Logout */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20 flex items-center gap-2 md:gap-4">
          {isOffline && (
            <div className="flex items-center gap-1.5 bg-amber-550/10 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold animate-pulse shadow-sm">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Mode Offline
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-[10px] md:text-xs font-bold text-gray-700 uppercase tracking-wider">
              {getRoleDisplay()}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 md:gap-2 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-gray-200 shadow-sm transition-colors text-[10px] md:text-sm font-bold"
          >
            <LogOut className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden xs:inline">Logout</span>
          </button>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-2 md:mb-4">
              <img src={logoBase64} alt="Umaroh Logo" className="h-8 md:h-12" />
            </div>
            <p className="text-gray-500 text-sm md:text-lg max-w-2xl font-medium px-4">
              Platform Digital Penyedia Layanan Satu Atap Bisnis Perjalanan Umrah
            </p>
          </div>
        </div>
      </header>

      {(userRole === 'operasional' || userRole === 'admin' || isMasterAdmin) && (!isMasterAdmin || adminViewMode === 'operasional') && (
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} userRole={userRole || 'admin'} subRole={subRole} />
      )}

      {/* Main Content */}
      <main className="flex-grow bg-gray-50 pb-24 lg:pb-0">
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </main>

      <Footer minimalOnMobile={userRole === 'mitra' || userRole === 'jamaah' || (isMasterAdmin && (adminViewMode === 'mitra' || adminViewMode === 'jamaah'))} />

      {/* Master Admin Switcher */}
      {isMasterAdmin && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-50 bg-white rounded-2xl md:rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-200 p-1.5 flex flex-wrap justify-center md:flex-nowrap gap-1 items-center max-w-[95vw]">
          <div className="hidden sm:block px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-200 mr-1">
            View As
          </div>
          <button
            onClick={() => setAdminViewMode('operasional')}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 transition-colors ${adminViewMode === 'operasional' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Settings className="w-3 h-3 md:w-4 md:h-4" /> Ops
          </button>
          <button
            onClick={() => setAdminViewMode('mitra')}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 transition-colors ${adminViewMode === 'mitra' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-3 h-3 md:w-4 md:h-4" /> Mitra
          </button>
          <button
            onClick={() => setAdminViewMode('jamaah')}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 transition-colors ${adminViewMode === 'jamaah' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <User className="w-3 h-3 md:w-4 md:h-4" /> Jamaah
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

