/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Footer } from './components/Footer';
import { Navbar, TabType } from './components/Navbar';
import { DatabaseView } from './components/DatabaseView';
import { DashboardView } from './components/DashboardView';
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
import { VendorPaymentTracker } from './components/finance/VendorPaymentTracker';
import { CumulativeFinanceReport } from './components/finance/CumulativeFinanceReport';
import { LoginView, Role } from './components/LoginView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardMitra } from './components/DashboardMitra';
import { DashboardJamaah } from './components/DashboardJamaah';
import { RegisterMitraView } from './components/RegisterMitraView';
import { ValidasiMitraView } from './components/ValidasiMitraView';
import { UserDatabaseView } from './components/UserDatabaseView';
import { ProfileView } from './components/ProfileView';
import { AdManagementView } from './components/AdManagementView';
import { OwnerKpiDashboard } from './components/OwnerKpiDashboard';
import { MaskapaiView } from './components/MaskapaiView';
import { BlueprintFlowView } from './components/BlueprintFlowView';
import { HotelView } from './components/HotelView';
import { DashboardVendor } from './components/DashboardVendor';
import { logoBase64 } from './utils/logoBase64';
import { LogOut, User, Settings, Users, Sliders } from 'lucide-react';
import { auth, db, doc, getDoc, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { JamaahSession } from './types';

const categoryItems: Record<string, string[]> = {
  mitra_dev: ['validasi-mitra', 'user-database'],
  operasional: ['dashboard', 'owner-kpi', 'database', 'sales-order', 'flights', 'tracker', 'manifest', 'tl-portal', 'inventory', 'perlengkapan'],
  finance: ['revenue', 'finance', 'mitra-tracker', 'tracker-vendor', 'finance-cumulative'],
  marketing: ['templates', 'ad-management', 'profile'],
  tour_leader: ['tracker'],
  petugas_bandara: ['tracker']
};

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [subRole, setSubRole] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [adminViewMode, setAdminViewMode] = useState<'operasional' | 'mitra' | 'jamaah' | 'vendor'>('operasional');
  const [showRegisterMitra, setShowRegisterMitra] = useState(false);
  const [registerPrefill, setRegisterPrefill] = useState<{ email?: string; name?: string; uid?: string } | null>(null);



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [isOffline, setIsOffline] = useState(!navigator.onLine || (typeof window !== 'undefined' && (!!(window as any).firestoreOfflineDetected || !!(window as any).firestoreQuotaExhausted)));

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleFirestoreOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('firestore-offline-detected', handleFirestoreOffline);
    window.addEventListener('firestore-quota-exceeded', handleFirestoreOffline);

    // Restore cached jamaah portal code session
    const cachedSession = localStorage.getItem('jamaah_code_session');
    if (cachedSession) {
      try {
        const session = JSON.parse(cachedSession);
        setJamaahCodeSession(session);
        setUserRole('jamaah');
        setIsLoggedIn(true);
        setIsAuthReady(true);
        setActiveTab('dashboard' as TabType);
      } catch (err) {
        console.error("Failed to restore cached code session:", err);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If currently logged in via a code session, prefer it to prevent overriding
      if (localStorage.getItem('jamaah_code_session')) {
        setIsLoggedIn(true);
        setUserRole('jamaah');
        setIsAuthReady(true);
        return;
      }

      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email);
        const isMA = user.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
        
        // Fetch user role from Firestore
        try {
          let data: { role?: string; subRole?: string | null; [key: string]: unknown } | null = null;
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              data = userDoc.data() as { role?: string; subRole?: string | null; [key: string]: unknown };
              // Cache values in localStorage for safety & offline robustness
              localStorage.setItem(`umaroh_cached_user_${user.uid}`, JSON.stringify(data));
              if (data.role) localStorage.setItem(`umaroh_cached_role_${user.uid}`, data.role);
              if (data.subRole) {
                localStorage.setItem(`umaroh_cached_subrole_${user.uid}`, data.subRole);
              } else {
                localStorage.removeItem(`umaroh_cached_subrole_${user.uid}`);
              }
            }
          } catch (fetchErr) {
            console.warn("Failed fetching user role from network, trying cache:", fetchErr);
            const cachedDataStr = localStorage.getItem(`umaroh_cached_user_${user.uid}`);
            if (cachedDataStr) {
              data = JSON.parse(cachedDataStr);
            } else {
              // Create a minimal fake data based on fallback stored values
              const cachedRole = localStorage.getItem(`umaroh_cached_role_${user.uid}`) || 'jamaah';
              const cachedSubRole = localStorage.getItem(`umaroh_cached_subrole_${user.uid}`) || null;
              data = { role: cachedRole, subRole: cachedSubRole };
            }
          }

          if (data) {
            setUserRole(isMA ? 'admin' : (data.role as Role));
            setSubRole(isMA ? null : (data.subRole || null));
            setVendorName(isMA ? null : ((data.namaVendor || data.brandName || null) as string | null));
            
            // Set initial tab based on role and subRole
            if (isMA) {
              setActiveTab('dashboard');
            } else if (data.role === 'mitra') {
              setActiveTab('dashboard' as TabType);
            } else if (data.role === 'jamaah') {
              setActiveTab('dashboard' as TabType);
            } else if (data.role === 'vendor') {
              setActiveTab('dashboard' as TabType);
            } else {
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
              error.message.includes('timeout') ||
              error.message.includes('unavailable')
            );
            if (isErrorOffline) {
              setIsOffline(true);
              // Fallback default role for offline mode to prevent blank screen
              const cachedRole = localStorage.getItem(`umaroh_cached_role_${user.uid}`) as Role || 'jamaah';
              const cachedSubRole = localStorage.getItem(`umaroh_cached_subrole_${user.uid}`) || null;
              setUserRole(cachedRole);
              setSubRole(cachedSubRole);
              setActiveTab('dashboard');
              console.warn("Firestore client is offline. App is operating in offline mode with cached role:", cachedRole);
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
      window.removeEventListener('firestore-offline-detected', handleFirestoreOffline);
      window.removeEventListener('firestore-quota-exceeded', handleFirestoreOffline);
    };
  }, []);

  // Interaction tracking for intelligent presence updates
  const lastInteractionTime = useRef<number>(Date.now());

  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTime.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(event => {
      window.addEventListener(event, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

  // Heartbeat / Active Status Live tracker
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    
    const updateActiveHeartbeat = async () => {
      // 1. Skip if document is hidden (background tab) to save major Firestore quota
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      const user = auth.currentUser;
      if (user) {
        // 2. Check if the user is idle (no interaction in last 10 minutes)
        const timeSinceLastInteraction = Date.now() - lastInteractionTime.current;
        if (timeSinceLastInteraction > 600000) { // 10 minutes idle limit
          return;
        }

        // 3. Enforce a strict 10-minute client-side write throttle across tabs to prevent Firestore quota exhaustion
        const storageKey = `last_heartbeat_${user.uid}`;
        const lastWriteTime = localStorage.getItem(storageKey);
        const now = Date.now();
        
        if (lastWriteTime) {
          const diff = now - parseInt(lastWriteTime, 10);
          if (diff < 600000) { // 10 minutes cooldown
            return;
          }
        }
        
        try {
          // TEMPORARILY DISABLED: Suspended database heartbeat write to preserve active Firestore write quota
          /*
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            lastActiveAt: new Date().toISOString()
          });
          */
          localStorage.setItem(storageKey, now.toString());
        } catch (err) {
          const errorPayload = err as { code?: string };
          // If Firestore quota is exhausted, log gracefully and temporarily suppress alerts
          if (errorPayload?.code === 'resource-exhausted') {
            console.warn("Firestore write quota exceeded; pausing live interactive heartbeat updates.");
            return;
          }
          
          // Fallback if document does not exist yet (e.g. freshly created master admin context)
          try {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            if (!userDocSnap.exists()) {
              // Same here, bypass cloud writes
              /*
              await setDoc(doc(db, 'users', user.uid), {
                id: user.uid,
                email: user.email || '',
                name: user.displayName || user.email?.split('@')[0] || 'User',
                role: 'admin', // fallback
                lastActiveAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
              }, { merge: true });
              */
              localStorage.setItem(storageKey, now.toString());
            }
          } catch (e) {
            console.warn("Heartbeat setDoc fallback failed:", e);
          }
        }
      }
    };

    if (isLoggedIn) {
      updateActiveHeartbeat();
      intervalId = setInterval(updateActiveHeartbeat, 600000); // Send heartbeat every 10 minutes
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  const isMasterAdmin = userEmail ? (userEmail.toLowerCase() === 'operationalumaroh@gmail.com' || userEmail.toLowerCase() === 'afadsa76@gmail.com') : false;

  const [jamaahCodeSession, setJamaahCodeSession] = useState<JamaahSession | null>(null);

  const handleLogin = (role: Role, subRole?: string, jamaahSession?: JamaahSession) => {
    setUserRole(role);
    if (subRole) {
      setSubRole(subRole);
    } else {
      setSubRole(null);
    }
    
    if (role === 'jamaah' && jamaahSession) {
      setJamaahCodeSession(jamaahSession);
      localStorage.setItem('jamaah_code_session', JSON.stringify(jamaahSession));
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
      localStorage.removeItem('jamaah_code_session');
      setJamaahCodeSession(null);
      setUserRole(null);
      setSubRole(null);
      setVendorName(null);
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
      return (
        <RegisterMitraView 
          prefilledEmail={registerPrefill?.email}
          prefilledName={registerPrefill?.name}
          prefilledUid={registerPrefill?.uid}
          onBack={async () => {
            try {
              await signOut(auth);
            } catch (err) {
              console.error('Error signing out during onBack:', err);
            }
            setRegisterPrefill(null);
            setShowRegisterMitra(false);
          }}
        />
      );
    }
    return (
      <LoginView 
        onLogin={handleLogin} 
        onGoToRegister={(email, name, uid) => {
          if (email || name || uid) {
            setRegisterPrefill({ email, name, uid });
          } else {
            setRegisterPrefill(null);
          }
          setShowRegisterMitra(true);
        }} 
      />
    );
  }

  const renderContent = () => {
    if (isMasterAdmin) {
      if (adminViewMode === 'mitra') return <DashboardMitra />;
      if (adminViewMode === 'jamaah') return <DashboardJamaah jamaahCodeSession={null} onLogout={handleLogout} />;
      if (adminViewMode === 'vendor') {
        return <DashboardVendor vendorName="Master Admin" vendorType={null} onNavigate={handleTabChange} isMasterView={true} />;
      }
      // else fall through to operasional routes
    } else {
      // Route based on role first
      if (userRole === 'mitra') return <DashboardMitra />;
      if (userRole === 'jamaah') return <DashboardJamaah jamaahCodeSession={jamaahCodeSession} onLogout={handleLogout} />;
      if (userRole === 'vendor') {
        if (activeTab === 'dashboard') {
          return <DashboardVendor vendorName={vendorName || userEmail?.split('@')[0] || 'Vendor'} vendorType={subRole || ''} onNavigate={handleTabChange} />;
        }
        if (activeTab === 'vendor-maskapai') {
          return <MaskapaiView isVendorMode={true} vendorName={vendorName || ''} />;
        }
        if (activeTab === 'vendor-hotel') {
          return <HotelView isVendorMode={true} vendorName={vendorName || ''} />;
        }
        if (activeTab === 'profile') {
          return <ProfileView />;
        }
        return <DashboardVendor vendorName={vendorName || userEmail?.split('@')[0] || 'Vendor'} vendorType={subRole || ''} onNavigate={handleTabChange} />;
      }
    }

    // Operasional / Admin routes
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={handleTabChange} />;
      case 'owner-kpi':
        return <OwnerKpiDashboard />;
      case 'validasi-mitra':
        return <ValidasiMitraView />;
      case 'user-database':
        return <UserDatabaseView />;
      case 'database':
        return <DatabaseView />;
      case 'templates':
        return <TemplatesView />;
      case 'sales-order':
        return <SalesOrderView />;
      case 'flights':
        return <FlightMonitoringView />;
      case 'tracker':
        return <TrackerView subRole={subRole} />;
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
      case 'tracker-vendor':
        return <VendorPaymentTracker />;
      case 'finance-cumulative':
        return <CumulativeFinanceReport />;
      case 'ad-management':
        return <AdManagementView />;
      case 'blueprint-flow':
        return <BlueprintFlowView />;
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

  const isPortalView = userRole === 'mitra' || userRole === 'jamaah' || (isMasterAdmin && (adminViewMode === 'mitra' || adminViewMode === 'jamaah' || adminViewMode === 'vendor'));

  return (
    <div className={`min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col relative ${isPortalView ? '' : 'pb-20'}`}>

      {/* Hero Section */}
      {!isPortalView && (
        <header className="bg-white text-gray-900 py-6 md:py-12 relative overflow-hidden border-b border-gray-100 lg:hidden">
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
      )}

      {(userRole === 'operasional' || userRole === 'admin' || userRole === 'vendor' || isMasterAdmin) && (!isMasterAdmin || adminViewMode === 'operasional') && (
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} userRole={isMasterAdmin ? 'admin' : (userRole || 'admin')} subRole={isMasterAdmin ? null : subRole} onLogout={handleLogout} />
      )}

      {/* Main Content */}
      <main className={`flex-grow bg-gray-50 pb-24 lg:pb-0 ${isPortalView ? '' : 'lg:pl-72'}`}>
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </main>

      {!isPortalView && (
        <div className="lg:pl-72">
          <Footer minimalOnMobile={false} />
        </div>
      )}

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
          <button
            onClick={() => setAdminViewMode('vendor')}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-full text-[10px] md:text-sm font-bold flex items-center gap-1 md:gap-2 transition-colors ${adminViewMode === 'vendor' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Sliders className="w-3 h-3 md:w-4 md:h-4" /> Vendor
          </button>
        </div>
      )}

      {/* Dynamic Offline / Connection Status indicator */}
      {isOffline && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl shadow-xl animate-bounce max-w-sm" style={{ animationDuration: '3s' }}>
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </div>
          <div className="flex-1">
            <p className="font-extrabold text-[11px] uppercase tracking-wider text-amber-800 leading-none">Status Koneksi Terganggu</p>
            <p className="text-[10px] text-amber-700 font-semibold mt-1 leading-tight">Berjalan lancar dalam Mode Offline / Replika Lokal.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

