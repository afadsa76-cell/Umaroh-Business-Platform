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
    const env = typeof process !== 'undefined' ? process.env : {};
    
    // Explicit env overrides for database ID
    if (env.ACTIVE_DATABASE) {
      console.log(`[DatabaseResolver] Resolved explicitly via ACTIVE_DATABASE env: ${env.ACTIVE_DATABASE}`);
      return env.ACTIVE_DATABASE;
    }
    if (env.FIRESTORE_DATABASE_ID) {
      console.log(`[DatabaseResolver] Resolved explicitly via FIRESTORE_DATABASE_ID env: ${env.FIRESTORE_DATABASE_ID}`);
      return env.FIRESTORE_DATABASE_ID;
    }

    const mode: DatabaseMode = (env.DATABASE_MODE as DatabaseMode) || 'development';
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
    const env = typeof process !== 'undefined' ? process.env : {};
    return {
      databaseMode: env.DATABASE_MODE || 'development',
      resolvedDbId: this.resolveDatabaseId(),
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
    };
  }
}
