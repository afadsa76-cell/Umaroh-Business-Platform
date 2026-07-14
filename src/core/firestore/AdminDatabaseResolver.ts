/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { App, getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export class AdminDatabaseResolver {
  private static databases: Map<string, Firestore> = new Map();

  public static getAdminApp(): App {
    if (getApps().length === 0) {
      return initializeApp({
        projectId: firebaseConfig.projectId || 'gen-lang-client-0546120404'
      });
    }
    return getApp();
  }

  /**
   * Retrieves a Firestore instance for the specified database ID inside the same Firebase Project.
   */
  public static getDatabase(databaseName: string): Firestore {
    const app = this.getAdminApp();
    const dbKey = databaseName || '(default)';
    
    if (!this.databases.has(dbKey)) {
      const dbInstance = getFirestore(app, dbKey);
      this.databases.set(dbKey, dbInstance);
    }
    
    return this.databases.get(dbKey)!;
  }

  /**
   * Resolves the source database ID from environment or fallback
   */
  public static getSourceDatabaseId(): string {
    return process.env.SOURCE_DATABASE || firebaseConfig.firestoreDatabaseId || 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';
  }

  /**
   * Resolves the target database ID from environment or fallback
   */
  public static getTargetDatabaseId(): string {
    return process.env.TARGET_DATABASE || firebaseConfig.firestoreDatabaseId || 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';
  }

  /**
   * Safely lists root collections of a database, falling back to known blueprint collections
   * if listCollections metadata action is restricted (Permission Denied).
   */
  public static async listCollectionsSafe(db: Firestore): Promise<any[]> {
    try {
      return await db.listCollections();
    } catch (err: any) {
      console.warn('[AdminDatabaseResolver] listCollections metadata action is restricted, using blueprint schema fallback:', err.message || err);
      
      const knownCollections = [
        'notifications',
        'users',
        'wallets',
        'transactions',
        'paket_master',
        'paket_mitra',
        'bookings',
        'maskapai',
        'vendor_services',
        'master_hotels',
        'master_layanan',
        'master_merchandise',
        'master_bandara',
        'master_paket_wisata',
        'hotel_metadata',
        'paket_kemitraan',
        'pendaftaran_mitra',
        'tracker_paket',
        'tracker_jamaah',
        'tracker_keberangkatan',
        'tracking_group',
        'mitra_tracker',
        'mitra_followup',
        'mitra_payment_history',
        'perlengkapan_master',
        'perlengkapan_packing',
        'perlengkapan_pengiriman',
        'perlengkapan_penerimaan',
        'perlengkapan_komplain',
        'package_cost_components',
        'package_cost_audit_logs',
        'ad_network_config',
        'ad_campaigns',
        'ad_performance_logs',
        'tracker_bagasi',
        'system_blueprint_nodes'
      ];

      const refs: any[] = [];
      for (const colId of knownCollections) {
        const colRef = db.collection(colId);
        try {
          // Perform a fast, cheap limit(1) query to check access.
          // This ensures we only include collections we can actually access.
          await colRef.limit(1).get();
          refs.push(colRef);
        } catch (colErr) {
          // If a specific collection is not accessible, skip it gracefully
        }
      }
      return refs;
    }
  }
}
