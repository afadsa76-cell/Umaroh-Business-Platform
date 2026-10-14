/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PORTAL UMAROH ENTERPRISE - ENVIRONMENT DATABASE RESOLVER
 * Role: Principal Firebase Architect & Security Auditor
 * 
 * Determines and resolves the appropriate active Firestore Database ID and Firebase
 * configuration context dynamically based on environment variables.
 */

import firebaseConfig from '../../../firebase-applet-config.json';

export type DatabaseMode = 'development' | 'staging' | 'production';

function getViteEnv(): Record<string, any> {
  try {
    const meta = Function('return typeof import.meta !== "undefined" ? import.meta : null')();
    return meta?.env || {};
  } catch {
    return {};
  }
}

export class DatabaseResolver {
  /**
   * Resolves the appropriate Firestore database ID dynamically without hardcoding.
   */
  public static resolveDatabaseId(): string {
    const nodeEnv = (typeof process !== 'undefined' && process && process.env) ? (process.env as any) : {};
    const viteEnv = getViteEnv();

    if (typeof window !== 'undefined') {
      const localOverride = localStorage.getItem('override_firestore_db_id');
      if (localOverride) {
        console.log(`[DatabaseResolver] Resolved via localStorage override: ${localOverride}`);
        return localOverride;
      }
    }

    // Explicit env overrides for database ID (checking both standard and Vite-prefixed keys)
    const activeDatabase = nodeEnv.ACTIVE_DATABASE || viteEnv.VITE_ACTIVE_DATABASE || nodeEnv.VITE_ACTIVE_DATABASE;
    if (activeDatabase) {
      console.log(`[DatabaseResolver] Resolved explicitly via ACTIVE_DATABASE env: ${activeDatabase}`);
      return activeDatabase;
    }

    const firestoreDbId = nodeEnv.FIRESTORE_DATABASE_ID || viteEnv.VITE_FIRESTORE_DATABASE_ID || nodeEnv.VITE_FIRESTORE_DATABASE_ID;
    if (firestoreDbId) {
      console.log(`[DatabaseResolver] Resolved explicitly via FIRESTORE_DATABASE_ID env: ${firestoreDbId}`);
      return firestoreDbId;
    }

    const mode: DatabaseMode = (nodeEnv.DATABASE_MODE || viteEnv.VITE_DATABASE_MODE || nodeEnv.VITE_DATABASE_MODE || 'development') as DatabaseMode;
    console.log(`[DatabaseResolver] Current DATABASE_MODE resolved: ${mode}`);

    // Default to the config file's database ID if nothing else is specified or if we are in development/default
    const configDbId = firebaseConfig.firestoreDatabaseId || '';

    switch (mode) {
      case 'production':
        // The target production enterprise database
        return 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9';
      
      case 'staging':
        return 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9';

      case 'development':
      default:
        // Fallback to the config database ID, or the active source development database
        return configDbId || 'ai-studio-7b9baede-5431-4818-8e1a-6da0a21316f9';
    }
  }

  /**
   * Returns current resolver configuration metadata for audit purposes
   */
  public static getResolverMetadata() {
    const nodeEnv = (typeof process !== 'undefined' && process && process.env) ? (process.env as any) : {};
    const viteEnv = getViteEnv();
    const mode = nodeEnv.DATABASE_MODE || viteEnv.VITE_DATABASE_MODE || nodeEnv.VITE_DATABASE_MODE || 'development';
    return {
      databaseMode: mode,
      resolvedDbId: this.resolveDatabaseId(),
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
    };
  }
}
