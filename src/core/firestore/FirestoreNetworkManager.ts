/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { FirestoreEventBus } from './FirestoreEventBus';

export class FirestoreNetworkManager {
  private static instance: FirestoreNetworkManager;
  private isOnlineStatus = true;
  private eventBus = FirestoreEventBus.getInstance();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnlineStatus = window.navigator.onLine;
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public static getInstance(): FirestoreNetworkManager {
    const globalKey = '__firestore_network_manager__';
    if (!(globalThis as any)[globalKey]) {
      (globalThis as any)[globalKey] = new FirestoreNetworkManager();
    }
    return (globalThis as any)[globalKey];
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  private handleNetworkChange(online: boolean) {
    if (this.isOnlineStatus !== online) {
      this.isOnlineStatus = online;
      if (online) {
        console.log('[FirestoreNetworkManager] Browser came online.');
        this.eventBus.emit('NetworkRecovered');
      } else {
        console.log('[FirestoreNetworkManager] Browser went offline.');
        this.eventBus.emit('NetworkOffline');
      }
    }
  }

  public forceOffline() {
    this.isOnlineStatus = false;
    this.eventBus.emit('NetworkOffline');
  }

  public forceOnline() {
    this.isOnlineStatus = true;
    this.eventBus.emit('NetworkRecovered');
  }
}
