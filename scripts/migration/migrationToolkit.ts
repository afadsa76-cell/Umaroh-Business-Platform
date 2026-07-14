/**
 * PORTAL UMAROH ENTERPRISE - ENTERPRISE MULTI-DATABASE MIGRATION TOOLKIT
 * Role: Principal Firebase Architect & Lead Developer
 * 
 * CLI wrapper that invokes the MigrationEngine to perform Firestore-only migrations.
 */

import { MigrationEngine } from '../../src/services/MigrationEngine';

async function runToolkit() {
  console.log('========================================================================');
  console.log('🕋 PORTAL UMAROH ENTERPRISE - MULTI-DATABASE MIGRATION TOOLKIT 🕋');
  console.log('========================================================================');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const rollback = args.includes('--rollback');
  const fresh = args.includes('--fresh');

  const engine = MigrationEngine.getInstance();

  if (fresh) {
    console.log('🧹 Clearing previous session checkpoints...');
    engine.clearCheckpoint();
  }

  if (rollback) {
    console.log('🚨 Rollback mode active. Purging migrated target database collections...');
    const ok = await engine.executeRollback();
    if (ok) {
      console.log('✅ Target database fully restored and sanitized.');
      process.exit(0);
    } else {
      console.error('❌ Rollback operation aborted due to exceptions.');
      process.exit(1);
    }
  }

  console.log(`🚀 Triggering migration flow... (Dry Run: ${dryRun})`);
  const success = await engine.executeMigration(dryRun);

  const state = engine.getState();
  console.log('\n========================================================================');
  console.log('🏁 MIGRATION EXECUTION COMPLETED');
  console.log('========================================================================');
  console.log(`- Status: ${state.status.toUpperCase()}`);
  console.log(`- Total Documents Processed: ${state.processedDocuments}`);
  console.log(`- Transfer Speed: ${state.transferSpeed} docs/sec`);
  console.log(`- Elapsed Time: ${state.elapsedSeconds} seconds`);
  console.log(`- Retries Encountered: ${state.retryCount}`);
  console.log(`- Failures Logged: ${state.failures.length}`);
  console.log(`- Warnings Logged: ${state.warnings.length}`);

  if (success) {
    console.log('\n✨ Database cutover is complete and declared enterprise-ready!');
    process.exit(0);
  } else {
    console.error('\n⚠️ Migration completed with anomalies or errors.');
    process.exit(1);
  }
}

runToolkit().catch(err => {
  console.error('Critical toolkit failure:', err);
  process.exit(1);
});
