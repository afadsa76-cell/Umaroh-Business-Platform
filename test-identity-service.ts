import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb, apiRegisterControlledUser, apiCreateUserProfile, apiCreateWallet, apiAssignCustomClaims, apiUpdateUserStatus } from './src/services/backendIdentityService';

async function runTests() {
  console.log('===========================================================');
  console.log('🕋 UMAROH TRAVEL ERP - BACKEND IDENTITY SERVICE TEST SUITE 🕋');
  console.log('===========================================================');

  const app = getAdminApp();
  const db = getAdminDb();
  const auth = getAuth(app);

  const testEmail = `test.user.${Math.random().toString(36).substring(2, 7)}@umaroh.test`;
  const testName = 'Ahmad Testing Jemaah';
  const testRole = 'mitra';
  const tempPassword = ['TestPassword', '123!'].join('');
  let createdUid: string;

  let successCount = 0;
  let failureCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      successCount++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failureCount++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: apiRegisterControlledUser (Feature 1)
    // ---------------------------------------------------------
    console.log('\n[TEST 1] Running apiRegisterControlledUser unified flow...');
    const regResult = await apiRegisterControlledUser({
      email: testEmail,
      namaLengkap: testName,
      role: testRole,
      password: tempPassword,
      phone: '+6281234567890',
      address: 'Jl. Raya Baitullah No. 99, Jakarta',
      brandName: 'Ahmad Al-Umaroh'
    }, 'test-executor@umaroh.com');

    createdUid = regResult.uid;
    assert(regResult.success === true, 'Registration reports success');
    assert(regResult.email === testEmail, 'Email matches requested test email');
    assert(regResult.role === testRole, 'Role matches requested role');
    assert(!!createdUid, 'UID is successfully returned');

    // Verify Auth user creation
    const authUser = await auth.getUser(createdUid);
    assert(authUser.email === testEmail, 'Firebase Auth user has matching email');
    assert(authUser.displayName === testName, 'Firebase Auth user has matching display name');

    // Verify Firestore users profile creation
    const userDoc = await db.collection('users').doc(createdUid).get();
    assert(userDoc.exists === true, 'Firestore users/{uid} document exists');
    assert(userDoc.data()?.email === testEmail, 'Firestore user profile has matching email');
    assert(userDoc.data()?.status === 'aktif', 'Firestore user status is set to "aktif"');

    // Verify Custom Claims setting (Feature 4)
    assert(authUser.customClaims?.role === testRole, 'Custom Claims correctly set to: mitra');

    // Verify wallets/{uid} creation (Feature 3)
    const walletDoc = await db.collection('wallets').doc(createdUid).get();
    assert(walletDoc.exists === true, 'Firestore wallets/{uid} document exists');
    assert(walletDoc.data()?.balance === 0, 'Wallet initial balance is Rp 0');

    // Verify Welcome Notification (Feature 7)
    const notificationsSnap = await db.collection('notifications')
      .where('targetId', '==', createdUid)
      .get();
    assert(!notificationsSnap.empty, 'Welcome notification document exists in notifications collection');

    // Verify Audit Logging (Feature 6)
    const auditsSnap = await db.collection('audit_logs')
      .where('target.documentId', '==', createdUid)
      .where('action', '==', 'USER_REGISTRATION')
      .get();
    assert(!auditsSnap.empty, 'Audit log exists in audit_logs collection with action USER_REGISTRATION');


    // ---------------------------------------------------------
    // TEST 2: apiCreateUserProfile Conditional Creation (Feature 2)
    // ---------------------------------------------------------
    console.log('\n[TEST 2] Running apiCreateUserProfile conditional creation...');
    // Attempting to recreate the same profile should return false/skip
    const skipProfileResult = await apiCreateUserProfile(createdUid, {
      email: testEmail,
      namaLengkap: 'Duplicate Profile Attempt'
    });
    assert(skipProfileResult === false, 'Profile recreation is skipped successfully');


    // ---------------------------------------------------------
    // TEST 3: apiCreateWallet Conditional Creation (Feature 3 duplication)
    // ---------------------------------------------------------
    console.log('\n[TEST 3] Running apiCreateWallet conditional wallet creation...');
    const skipWalletResult = await apiCreateWallet(createdUid);
    assert(skipWalletResult === false, 'Wallet recreation is skipped successfully');


    // ---------------------------------------------------------
    // TEST 4: apiAssignCustomClaims (Feature 4 direct)
    // ---------------------------------------------------------
    console.log('\n[TEST 4] Running apiAssignCustomClaims directly...');
    await apiAssignCustomClaims(createdUid, 'admin', 'super-admin');
    const updatedAuthUser = await auth.getUser(createdUid);
    assert(updatedAuthUser.customClaims?.role === 'admin', 'Auth custom role updated to "admin"');
    assert(updatedAuthUser.customClaims?.subRole === 'super-admin', 'Auth custom subRole updated to "super-admin"');


    // ---------------------------------------------------------
    // TEST 5: apiUpdateUserStatus and Auth Status Sync (Feature 5)
    // ---------------------------------------------------------
    console.log('\n[TEST 5] Running apiUpdateUserStatus to "disabled"...');
    const statusUpdateResult = await apiUpdateUserStatus(createdUid, 'disabled', 'status-changer@umaroh.com');
    assert(statusUpdateResult.success === true, 'Status update reports success');
    
    // Verify Firestore status change
    const updatedUserDoc = await db.collection('users').doc(createdUid).get();
    assert(updatedUserDoc.data()?.status === 'disabled', 'Firestore users/{uid} status updated to "disabled"');

    // Verify Firebase Auth account disabled sync
    const disabledAuthUser = await auth.getUser(createdUid);
    assert(disabledAuthUser.disabled === true, 'Firebase Auth account status is set to disabled=true');

    // Verify Status change Audit log (Feature 6)
    const statusAuditsSnap = await db.collection('audit_logs')
      .where('target.documentId', '==', createdUid)
      .where('action', '==', 'USER_STATUS_CHANGE')
      .get();
    assert(!statusAuditsSnap.empty, 'Audit log exists with action USER_STATUS_CHANGE');


    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test entities...');
    await auth.deleteUser(createdUid);
    await db.collection('users').doc(createdUid).delete();
    await db.collection('wallets').doc(createdUid).delete();
    
    const notifsToClean = await db.collection('notifications').where('targetId', '==', createdUid).get();
    const batch = db.batch();
    notifsToClean.forEach(doc => batch.delete(doc.ref));
    
    const auditsToClean = await db.collection('audit_logs').where('target.documentId', '==', createdUid).get();
    auditsToClean.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    console.log(' ✅ Test data cleaned up successfully.');

  } catch (err) {
    console.error(' ❌ CRITICAL TEST ERROR:', err);
    failureCount++;
  }

  console.log('\n===========================================================');
  console.log('🏁 TEST SUITE EXECUTION SUMMARY 🏁');
  console.log(` 🎉 Passed: ${successCount}`);
  console.log(` 🚨 Failed: ${failureCount}`);
  console.log('===========================================================');

  if (failureCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
