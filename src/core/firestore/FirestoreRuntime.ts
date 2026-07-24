/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirebaseApp, initializeApp, getApps } from 'firebase/app';
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { FirestoreEventBus } from './FirestoreEventBus';
import { FirestoreStateMachine } from './FirestoreStateMachine';
import { FirestoreConnectionManager } from './FirestoreConnectionManager';
import { FirestoreSubscriptionManager } from './FirestoreSubscriptionManager';
import { FirestoreListenerRegistry } from './FirestoreListenerRegistry';
import { FirestoreSnapshotPool } from './FirestoreSnapshotPool';
import { FirestoreRecoveryManager } from './FirestoreRecoveryManager';
import { FirestoreHealthMonitor } from './FirestoreHealthMonitor';
import { FirestoreNetworkManager } from './FirestoreNetworkManager';
import { FirestoreMetrics } from './FirestoreMetrics';
import { FirestoreDiagnostics } from './FirestoreDiagnostics';
import { FirestoreLifecycle } from './FirestoreLifecycle';
import { FirestoreOfflineCoordinator } from './FirestoreOfflineCoordinator';
import { FirestoreRetryController } from './FirestoreRetryController';
import { FirestoreWatchStreamGuard } from './FirestoreWatchStreamGuard';
import firebaseConfig from '../../../firebase-applet-config.json';
import { DatabaseResolver } from './DatabaseResolver';

export interface FirebaseAppConfig {
  projectId: string;
  apiKey: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export function getActiveFirebaseConfig(): FirebaseAppConfig {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('custom_firebase_config');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.projectId && parsed.apiKey) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse custom_firebase_config from localStorage:', e);
      }
    }
  }
  return firebaseConfig as FirebaseAppConfig;
}

export function isCustomFirebaseConfigured(): boolean {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('custom_firebase_config');
    return !!raw;
  }
  return false;
}

export function saveCustomFirebaseConfig(config: FirebaseAppConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('custom_firebase_config', JSON.stringify(config));
    // Clear cached instances to force re-init
    delete (globalThis as any)['__firestore_db_instance__'];
    delete (globalThis as any)['__firestore_runtime_singleton__'];
    window.dispatchEvent(new CustomEvent('firebase-config-changed'));
  }
}

export function clearCustomFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('custom_firebase_config');
    delete (globalThis as any)['__firestore_db_instance__'];
    delete (globalThis as any)['__firestore_runtime_singleton__'];
    window.dispatchEvent(new CustomEvent('firebase-config-changed'));
  }
}

export class FirestoreRuntime {
  private static instance: FirestoreRuntime;

  public app!: FirebaseApp;
  public db!: Firestore;

  public eventBus = FirestoreEventBus.getInstance();
  public stateMachine = FirestoreStateMachine.getInstance();
  public connectionManager = FirestoreConnectionManager.getInstance();
  public subscriptionManager = FirestoreSubscriptionManager.getInstance();
  public listenerRegistry = FirestoreListenerRegistry.getInstance();
  public snapshotPool = FirestoreSnapshotPool.getInstance();
  public recoveryManager = FirestoreRecoveryManager.getInstance();
  public healthMonitor = FirestoreHealthMonitor.getInstance();
  public networkManager = FirestoreNetworkManager.getInstance();
  public metrics = FirestoreMetrics.getInstance();
  public diagnostics = FirestoreDiagnostics.getInstance();
  public lifecycle = FirestoreLifecycle.getInstance();
  public offlineCoordinator = FirestoreOfflineCoordinator.getInstance();
  public retryController = FirestoreRetryController.getInstance();
  public watchStreamGuard = FirestoreWatchStreamGuard.getInstance();

  private constructor() {
    this.initFirebase();
    this.lifecycle.bootstrap(this.db);
  }

  public static getInstance(): FirestoreRuntime {
    const globalKey = '__firestore_runtime_singleton__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreRuntime();
    }
    return (globalThis as any)[globalKey];
  }

  private initFirebase(): void {
    const activeConfig = getActiveFirebaseConfig();
    const apps = getApps();
    if (apps.length > 0) {
      this.app = apps[0];
    } else {
      this.app = initializeApp(activeConfig);
    }

    const firestoreDbId = activeConfig.firestoreDatabaseId || DatabaseResolver.resolveDatabaseId();

    const globalDbKey = '__firestore_db_instance__';
    if ((globalThis as any)[globalDbKey]) {
      this.db = (globalThis as any)[globalDbKey];
    } else {
      const configOpts = {
        experimentalForceLongPolling: true,
      } as any;

      if (firestoreDbId && firestoreDbId !== '(default)') {
        this.db = initializeFirestore(this.app, configOpts, firestoreDbId);
      } else {
        this.db = initializeFirestore(this.app, configOpts);
      }
      (globalThis as any)[globalDbKey] = this.db;
    }
  }
}
export const runtime = FirestoreRuntime.getInstance();
export const db = runtime.db;

