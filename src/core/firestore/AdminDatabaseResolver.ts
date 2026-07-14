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
    return process.env.SOURCE_DATABASE || 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393';
  }

  /**
   * Resolves the target database ID from environment or fallback
   */
  public static getTargetDatabaseId(): string {
    return process.env.TARGET_DATABASE || 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';
  }
}
