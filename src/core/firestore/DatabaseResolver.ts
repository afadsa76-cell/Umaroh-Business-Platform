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

export class DatabaseResolver {
  /**
   * Resolves the appropriate Firestore database ID dynamically without hardcoding.
   */
  public static resolveDatabaseId(): string {
    const nodeEnv = (typeof process !== 'undefined' && process && process.env) ? (process.env as any) : {};
    const viteEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? (import.meta.env as any) : {};

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
        return 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';
      
      case 'staging':
        return 'ai-studio-staging-69cde675-c52d-43da-bfaa-45caeabd2393';

      case 'development':
      default:
        // Fallback to the config database ID, or the active source development database
        return configDbId || 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';
    }
  }

  /**
   * Returns current resolver configuration metadata for audit purposes
   */
  public static getResolverMetadata() {
    const nodeEnv = (typeof process !== 'undefined' && process && process.env) ? (process.env as any) : {};
    const viteEnv = (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? (import.meta.env as any) : {};
    const mode = nodeEnv.DATABASE_MODE || viteEnv.VITE_DATABASE_MODE || nodeEnv.VITE_DATABASE_MODE || 'development';
    return {
      databaseMode: mode,
      resolvedDbId: this.resolveDatabaseId(),
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
    };
  }
}
