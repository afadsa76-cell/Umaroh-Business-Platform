import { MigrationEngine } from '../../src/services/MigrationEngine';

// Force environment variables programmatically before the engine boots
process.env.SOURCE_DATABASE = 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393';
process.env.TARGET_DATABASE = 'ai-studio-umarohbusinesspl-69cde675-c52d-43da-bfaa-45caeabd2393';

async function main() {
  console.log('========================================================================');
  console.log('🕋 PORTAL UMAROH - DEDICATED DATABASE COPY AND MIGRATION RUNNER 🕋');
  console.log('========================================================================');
  console.log(`Source DB : ${process.env.SOURCE_DATABASE}`);
  console.log(`Target DB : ${process.env.TARGET_DATABASE}`);
  console.log('========================================================================');

  const engine = MigrationEngine.getInstance();
  
  console.log('🔄 Initiating Migration Engine...');
  const success = await engine.executeMigration(false); // Run real migration, not dry run

  const finalState = engine.getState();
  console.log('========================================================================');
  console.log('📊 MIGRATION EXECUTION SUMMARY:');
  console.log('========================================================================');
  console.log(`Status            : ${finalState.status.toUpperCase()}`);
  console.log(`Docs Processed    : ${finalState.processedDocuments}`);
  console.log(`Estimated Total   : ${finalState.totalDocumentsEstimated}`);
  console.log(`Warnings Count    : ${finalState.warnings.length}`);
  console.log(`Failures Count    : ${finalState.failures.length}`);
  console.log(`Transfer Speed    : ${finalState.transferSpeed} docs/sec`);
  console.log(`Elapsed Time      : ${finalState.elapsedSeconds} seconds`);
  console.log('========================================================================');

  if (finalState.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    finalState.warnings.forEach(w => console.log(`- ${w}`));
  }

  if (finalState.failures.length > 0) {
    console.log('\n❌ Failures:');
    finalState.failures.forEach(f => console.log(`- ${f}`));
  }

  if (success) {
    console.log('\n🎉 SUCCESS: Database copy and synchronization completed perfectly!');
    process.exit(0);
  } else {
    console.log('\n❌ FAILED: Migration process encountered errors.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n❌ CRITICAL FATAL EXCEPTION:', err);
  process.exit(1);
});
