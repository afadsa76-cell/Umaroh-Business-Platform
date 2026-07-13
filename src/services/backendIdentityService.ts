import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { normalizeEmail } from '../utils/email';

// Get the correct Firebase Admin App instance
export function getAdminApp(): App {
  if (getApps().length === 0) {
    return initializeApp({
      projectId: 'gen-lang-client-0546120404'
    });
  }
  return getApp();
}

// Get the dedicated Firestore instance (using AI Studio database ID)
export function getAdminDb() {
  const app = getAdminApp();
  const isAiStudioProject = app.options.projectId === 'gen-lang-client-0546120404';
  const databaseId = isAiStudioProject ? 'ai-studio-69cde675-c52d-43da-bfaa-45caeabd2393' : '(default)';
  return getFirestore(app, databaseId);
}

export interface ProvisionUserRequest {
  email: string;
  namaLengkap: string;
  role: 'admin' | 'mitra' | 'jamaah' | 'vendor';
  phone?: string;
  address?: string;
  brandName?: string;
  subRole?: string;
  jenisMitra?: string;
  password?: string;
  uplineId?: string;
}

/**
 * Feature 4: Assign Custom Claims to manage role-based authorization
 */
export async function apiAssignCustomClaims(uid: string, role: string, subRole?: string): Promise<void> {
  const auth = getAuth(getAdminApp());
  await auth.setCustomUserClaims(uid, {
    role,
    subRole: subRole || null,
  });
  console.info(`[Claims] Custom claims set successfully for UID: ${uid} (Role: ${role})`);
}

/**
 * Feature 6: Write a structured audit log in Firestore
 */
export async function auditCreateUser(
  uid: string,
  action: string,
  details: Record<string, unknown>,
  executorEmail: string = 'system-backend'
): Promise<void> {
  const db = getAdminDb();
  const auditLog = {
    timestamp: new Date().toISOString(),
    level: 'AUDIT',
    serviceName: 'identity-service',
    functionName: 'apiRegisterControlledUser',
    executor: {
      uid: 'system',
      email: executorEmail,
      role: 'system'
    },
    action,
    target: {
      collection: 'users',
      documentId: uid
    },
    result: {
      status: 'SUCCESS',
      details
    }
  };

  try {
    // Write into database logs collection
    await db.collection('audit_logs').add(auditLog);
    console.info(`[Audit] Registered audit event '${action}' for UID: ${uid}`);
  } catch (error) {
    console.error(`[Audit Error] Failed to write audit log for UID ${uid}:`, error);
  }
}

/**
 * Feature 7: Send Welcome Notification (Firestore entry that triggers client UI or gateways)
 */
export async function sendWelcomeNotification(
  uid: string,
  name: string,
  role: string
): Promise<void> {
  const db = getAdminDb();
  const notificationId = `welcome_${uid}_${Date.now()}`;
  const notificationDoc = {
    id: notificationId,
    title: '✨ Selamat Datang di Umaroh!',
    message: `Ahlan wa sahlan ${name}! Akun Anda telah aktif sebagai ${role}. Mulailah perjalanan ibadah dan bisnis terbaik bersama kami. 🕋`,
    type: 'info',
    targetId: uid,
    targetRole: role,
    read: false,
    createdAt: new Date().toISOString(),
    senderId: 'system-backend'
  };

  try {
    await db.collection('notifications').doc(notificationId).set(notificationDoc);
    console.info(`[Notification] Created welcome notification for user: ${uid}`);
  } catch (error) {
    console.error(`[Notification Error] Failed to send welcome notification for ${uid}:`, error);
  }
}

/**
 * Feature 2: Conditional Profile Creation in Firestore Users Collection
 */
export async function apiCreateUserProfile(
  uid: string,
  profileData: Record<string, unknown>
): Promise<boolean> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);

  const success = await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(userRef);
    if (docSnap.exists) {
      console.warn(`[Profile] User profile already exists for UID: ${uid}, skipping creation.`);
      return false;
    }

    transaction.set(userRef, {
      id: uid,
      uid: uid,
      ...profileData,
      status: 'aktif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return true;
  });

  return success;
}

/**
 * Feature 3: Conditional Wallet Creation in Firestore Wallets Collection
 */
export async function apiCreateWallet(uid: string): Promise<boolean> {
  const db = getAdminDb();
  const walletRef = db.collection('wallets').doc(uid);

  const success = await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(walletRef);
    if (docSnap.exists) {
      console.warn(`[Wallet] Wallet document already exists for UID: ${uid}, skipping creation.`);
      return false;
    }

    transaction.set(walletRef, {
      userId: uid,
      balance: 0,
      updatedAt: new Date().toISOString()
    });
    return true;
  });

  return success;
}

/**
 * Feature 1: apiRegisterControlledUser
 * Enterprise-grade provisioning of user accounts, profile registration, custom claims, and logging.
 */
export async function apiRegisterControlledUser(
  request: ProvisionUserRequest,
  executorEmail: string = 'admin-portal'
): Promise<{ success: boolean; uid: string; email: string; role: string }> {
  const {
    email,
    namaLengkap,
    role,
    phone = '',
    address = '',
    brandName = '',
    subRole = '',
    jenisMitra = '',
    password,
    uplineId = ''
  } = request;

  if (!email || !namaLengkap || !role) {
    throw new Error('Email, nama lengkap, dan role wajib diisi!');
  }

  const trimmedEmail = normalizeEmail(email);
  const auth = getAuth(getAdminApp());
  const db = getAdminDb();

  // 1. Idempotency & Duplicate Check: Ensure email doesn't exist in Auth
  let authUser;
  try {
    authUser = await auth.getUserByEmail(trimmedEmail);
    console.warn(`[Provision] Auth user already exists with email: ${trimmedEmail}. Using existing Auth ID: ${authUser.uid}`);
  } catch (err: unknown) {
    const authError = err as { code?: string };
    if (authError.code === 'auth/user-not-found') {
      // Create fresh auth user
      const defaultPassword = password || `Umaroh${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
      authUser = await auth.createUser({
        email: trimmedEmail,
        emailVerified: true,
        displayName: namaLengkap.trim(),
        password: defaultPassword,
        disabled: false
      });
      console.info(`[Provision] Created new Firebase Auth User for ${trimmedEmail} with UID: ${authUser.uid}`);
    } else {
      throw err;
    }
  }

  const uid = authUser.uid;

  // 2. Conditional Profile Creation
  const profilePayload = {
    email: trimmedEmail,
    namaLengkap: namaLengkap.trim(),
    name: namaLengkap.trim(),
    role,
    phone: phone.trim(),
    address: address.trim(),
    brandName: (role === 'mitra' || role === 'vendor') ? brandName.trim() : '',
    namaVendor: role === 'vendor' ? brandName.trim() : '',
    subRole: (role === 'admin' || role === 'vendor') ? subRole : '',
    jenisMitra: role === 'mitra' ? jenisMitra : '',
    uplineId: role === 'mitra' ? uplineId : '',
    passwordAwal: password || ''
  };

  const profileCreated = await apiCreateUserProfile(uid, profilePayload);

  // 3. Conditional Wallet Creation for Mitra
  let walletCreated = false;
  if (role === 'mitra') {
    walletCreated = await apiCreateWallet(uid);
  }

  // 4. Assign Custom Claims
  await apiAssignCustomClaims(uid, role, subRole);

  // 5. Delete corresponding pre_users queue document if matching email exists to prevent redundant activations
  try {
    const preUsersSnap = await db.collection('pre_users').where('email', '==', trimmedEmail).get();
    if (!preUsersSnap.empty) {
      const batch = db.batch();
      preUsersSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.info(`[Provision] Cleared pre_users activation queue documents for email: ${trimmedEmail}`);
    }
  } catch (err) {
    console.error(`[Provision Error] Non-blocking cleanup of pre_users failed:`, err);
  }

  // 6. Audit Logging
  await auditCreateUser(
    uid,
    'USER_REGISTRATION',
    {
      email: trimmedEmail,
      namaLengkap,
      role,
      profileCreated,
      walletCreated
    },
    executorEmail
  );

  // 7. Welcome Notification
  await sendWelcomeNotification(uid, namaLengkap, role);

  return {
    success: true,
    uid,
    email: trimmedEmail,
    role
  };
}

/**
 * Feature 5: Update User Status (Backend Validated & Synced with Firebase Auth block/unblock status)
 */
export async function apiUpdateUserStatus(
  uid: string,
  status: 'active' | 'disabled' | string,
  executorEmail: string = 'admin-portal'
): Promise<{ success: boolean; uid: string; status: string }> {
  if (!uid || !status) {
    throw new Error('UID dan status wajib diisi!');
  }

  const db = getAdminDb();
  const auth = getAuth(getAdminApp());

  // 1. Update Firestore user profile
  const userRef = db.collection('users').doc(uid);
  await db.runTransaction(async (transaction) => {
    const docSnap = await transaction.get(userRef);
    if (!docSnap.exists) {
      throw new Error(`User dengan UID ${uid} tidak ditemukan di database!`);
    }
    transaction.update(userRef, {
      status,
      updatedAt: new Date().toISOString()
    });
  });

  // 2. Sync with Firebase Auth block/unblock status
  const disableUserInAuth = status === 'disabled';
  await auth.updateUser(uid, {
    disabled: disableUserInAuth
  });

  console.info(`[Status Sync] Updated Auth user ${uid} disabled state to: ${disableUserInAuth}`);

  // 3. Write structured audit logs
  await auditCreateUser(
    uid,
    'USER_STATUS_CHANGE',
    {
      updatedStatus: status,
      disabledInAuth: disableUserInAuth
    },
    executorEmail
  );

  return {
    success: true,
    uid,
    status
  };
}
