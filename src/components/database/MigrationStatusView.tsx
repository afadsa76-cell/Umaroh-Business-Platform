/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { DatabaseResolver } from '../../core/firestore/DatabaseResolver';
import { featureFlagsManager, SystemFeatureFlags } from '../../core/firestore/FeatureFlagsManager';
import { db, collection, getDocs, limit, query } from '../../firebase';
import { Shield, Database, Lock, AlertTriangle, CheckCircle, RefreshCw, Layers, ToggleLeft, ToggleRight, Info } from 'lucide-react';

export const MigrationStatusView: React.FC = () => {
  const [resolverMeta] = useState(DatabaseResolver.getResolverMetadata());
  const [flags, setFlags] = useState<SystemFeatureFlags>(featureFlagsManager.getFlags());
  const [counts, setCounts] = useState<Record<string, number>>({
    users: 0,
    wallets: 0,
    transactions: 0,
    bookings: 0,
    notifications: 0,
  });
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  // Sync state initially
  useEffect(() => {
    fetchRealtimeData();
  }, []);

  const fetchRealtimeData = async () => {
    setIsLoadingCounts(true);
    try {
      const collections = ['users', 'wallets', 'transactions', 'bookings', 'notifications'];
      const updatedCounts: Record<string, number> = {};

      for (const col of collections) {
        try {
          const ref = collection(db, col);
          const snap = await getDocs(query(ref, limit(200))); // Limit to avoid exhausting quotas
          updatedCounts[col] = snap.size;
        } catch {
          updatedCounts[col] = 0;
        }
      }
      setCounts(updatedCounts);
      setLogMessage('⚡ Real-time database snapshot synchronized.');
    } catch (err: any) {
      setLogMessage(`⚠️ Error reading real-time metrics: ${err.message}`);
    } finally {
      setIsLoadingCounts(false);
    }
  };

  const handleToggleFlag = (key: keyof SystemFeatureFlags) => {
    const currentValue = flags[key];
    featureFlagsManager.setFlag(key, !currentValue);
    
    // Refresh flags from manager to capture any auto-cascading logic (e.g. read-only cascade)
    const freshFlags = featureFlagsManager.getFlags();
    setFlags(freshFlags);
    setLogMessage(`🛡️ System status updated: ${key} is now ${!currentValue ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleEngageAllLocks = () => {
    featureFlagsManager.initiateReadonlyMigrationLocks();
    setFlags(featureFlagsManager.getFlags());
    setLogMessage('🛡️ Emergency lockdown completed. All write paths successfully locked.');
  };

  const handleReleaseAllLocks = () => {
    featureFlagsManager.releaseAllLocks();
    setFlags(featureFlagsManager.getFlags());
    setLogMessage('🔓 Full disengagement completed. All write paths fully unlocked.');
  };

  return (
    <div id="migration-dashboard" className="p-6 bg-gray-50 min-h-screen text-gray-800">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Shield className="text-amber-600 w-7 h-7" />
            Portal Umaroh Enterprise — Migration Control & Safety Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Sprint 10 Zero-Downtime Cutover Panel. Monitor active database resolves, configure mutation locks, and review real-time counts.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchRealtimeData}
            disabled={isLoadingCounts}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCounts ? 'animate-spin' : ''}`} />
            Refresh Counts
          </button>
          
          <button
            onClick={handleEngageAllLocks}
            className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition"
          >
            Emergency Lock
          </button>

          <button
            onClick={handleReleaseAllLocks}
            className="px-4 py-2 text-xs font-semibold bg-gray-200 text-gray-800 rounded-lg shadow-sm hover:bg-gray-300 transition"
          >
            Reset Locks
          </button>
        </div>
      </div>

      {logMessage && (
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-sm rounded shadow-sm flex items-start gap-2">
          <Info className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{logMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Active Database Resolver */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
              <Database className="text-blue-600 w-5 h-5" />
              Dynamic Database Resolver
            </h2>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 uppercase">
              {resolverMeta.databaseMode}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-400 block font-mono">RESOLVED DATABASE ID</span>
              <span className="text-sm font-semibold font-mono text-gray-800 break-all bg-gray-100 px-2 py-1 rounded block mt-1">
                {resolverMeta.resolvedDbId}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-mono">FIREBASE PROJECT ID</span>
              <span className="text-sm font-semibold font-mono text-gray-800">
                {resolverMeta.projectId}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-mono">APP ID</span>
              <span className="text-sm font-semibold font-mono text-gray-800 break-all text-xs">
                {resolverMeta.appId}
              </span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900 flex gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p>
                Dynamic switching is fully environment-controlled. Toggle the <code>DATABASE_MODE</code> environment variable to switch database targets instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Feature Flags */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
              <Lock className="text-emerald-600 w-5 h-5" />
              Mutation locks & Runtime Feature Flags
            </h2>
            <span className="text-xs text-gray-400 font-semibold">
              REAL-TIME CONFIGURABLE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Row MIGRATION_MODE */}
            <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
              <div>
                <h3 className="text-sm font-bold text-gray-800">MIGRATION_MODE</h3>
                <p className="text-xs text-gray-400">Activates production migration sequence locks</p>
              </div>
              <button onClick={() => handleToggleFlag('MIGRATION_MODE')} className="focus:outline-none">
                {flags.MIGRATION_MODE ? (
                  <ToggleRight className="w-10 h-10 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-300" />
                )}
              </button>
            </div>

            {/* Row READ_ONLY_MODE */}
            <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
              <div>
                <h3 className="text-sm font-bold text-gray-800">READ_ONLY_MODE</h3>
                <p className="text-xs text-gray-400">Forces complete database to be read-only</p>
              </div>
              <button onClick={() => handleToggleFlag('READ_ONLY_MODE')} className="focus:outline-none">
                {flags.READ_ONLY_MODE ? (
                  <ToggleRight className="w-10 h-10 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-300" />
                )}
              </button>
            </div>

            {/* Row LOCK_NEW_REGISTRATION */}
            <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
              <div>
                <h3 className="text-sm font-bold text-gray-800">LOCK_NEW_REGISTRATION</h3>
                <p className="text-xs text-gray-400">Halts writes to Firestore 'users' collection</p>
              </div>
              <button onClick={() => handleToggleFlag('LOCK_NEW_REGISTRATION')} className="focus:outline-none">
                {flags.LOCK_NEW_REGISTRATION ? (
                  <ToggleRight className="w-10 h-10 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-300" />
                )}
              </button>
            </div>

            {/* Row LOCK_FINANCIAL_TRANSACTION */}
            <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
              <div>
                <h3 className="text-sm font-bold text-gray-800">LOCK_FINANCIAL_TRANSACTION</h3>
                <p className="text-xs text-gray-400">Halts writes to wallets & transactions</p>
              </div>
              <button onClick={() => handleToggleFlag('LOCK_FINANCIAL_TRANSACTION')} className="focus:outline-none">
                {flags.LOCK_FINANCIAL_TRANSACTION ? (
                  <ToggleRight className="w-10 h-10 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-300" />
                )}
              </button>
            </div>

            {/* Row LOCK_BOOKING */}
            <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition">
              <div>
                <h3 className="text-sm font-bold text-gray-800">LOCK_BOOKING</h3>
                <p className="text-xs text-gray-400">Halts writes to Firestore 'bookings' collection</p>
              </div>
              <button onClick={() => handleToggleFlag('LOCK_BOOKING')} className="focus:outline-none">
                {flags.LOCK_BOOKING ? (
                  <ToggleRight className="w-10 h-10 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-300" />
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Row 2: Live Collections Audit */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="text-amber-600 w-5 h-5" />
          Live Document Counts & Sync Progress (Active Database)
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-bold block uppercase">Users Collection</span>
            <span className="text-2xl font-extrabold text-gray-900 block mt-1">
              {isLoadingCounts ? '...' : counts.users}
            </span>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-bold block uppercase">Wallets Collection</span>
            <span className="text-2xl font-extrabold text-gray-900 block mt-1">
              {isLoadingCounts ? '...' : counts.wallets}
            </span>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-bold block uppercase">Transactions</span>
            <span className="text-2xl font-extrabold text-gray-900 block mt-1">
              {isLoadingCounts ? '...' : counts.transactions}
            </span>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-bold block uppercase">Bookings</span>
            <span className="text-2xl font-extrabold text-gray-900 block mt-1">
              {isLoadingCounts ? '...' : counts.bookings}
            </span>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-bold block uppercase">Notifications</span>
            <span className="text-2xl font-extrabold text-gray-900 block mt-1">
              {isLoadingCounts ? '...' : counts.notifications}
            </span>
          </div>

        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p>
            The counts above indicate live objects indexed in the actively resolved database (<code>{resolverMeta.resolvedDbId}</code>). Ensure counts are balanced and consistent across the source and target projects before declaring the cutover finalized.
          </p>
        </div>
      </div>
    </div>
  );
};
