/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreConnectionManager } from './FirestoreConnectionManager';
import { FirestoreNetworkManager } from './FirestoreNetworkManager';
import { FirestoreStateMachine } from './FirestoreStateMachine';

export class FirestoreOfflineCoordinator {
  private static instance: FirestoreOfflineCoordinator;
  private connectionManager = FirestoreConnectionManager.getInstance();
  private networkManager = FirestoreNetworkManager.getInstance();
  private stateMachine = FirestoreStateMachine.getInstance();

  private constructor() {}

  public static getInstance(): FirestoreOfflineCoordinator {
    const globalKey = '__firestore_offline_coordinator__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreOfflineCoordinator();
    }
    return (globalThis as any)[globalKey];
  }

  public isOfflineModeActive(): boolean {
    const state = this.stateMachine.getState();
    return state === 'OFFLINE' || state === 'DEGRADED' || !this.networkManager.isOnline();
  }

  public async forceOfflineMode(): Promise<void> {
    console.log('[FirestoreOfflineCoordinator] Manually enforcing offline mode...');
    this.networkManager.forceOffline();
    await this.connectionManager.goOffline('Manual Force Offline');
  }

  public async restoreOnlineMode(): Promise<void> {
    console.log('[FirestoreOfflineCoordinator] Manually restoring online mode...');
    this.networkManager.forceOnline();
    await this.connectionManager.goOnline('Manual Restore Online');
  }
}
