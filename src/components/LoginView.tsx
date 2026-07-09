import React, { useState } from 'react';
import { logoBase64 } from '../utils/logoBase64';
import { Code2, ArrowRight, User as UserIcon } from 'lucide-react';
import { auth, db, doc, getDoc, setDoc, signInWithEmailAndPassword, handleFirestoreError, OperationType } from '../firebase';
import { signInWithCredential, GoogleAuthProvider, User, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { JamaahSession, BookingRecord } from '../types';

const AutoplayVideoLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`} style={{ perspective: '1000px' }}>
      <style>{`
        @keyframes u-rotate-logo {
          0% {
            transform: rotateY(0deg);
          }
          10% {
            transform: rotateY(360deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
        .u-animated-logo {
          animation: u-rotate-logo 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-style: preserve-3d;
        }
      `}</style>
      <img
        src={logoBase64}
        alt="Umaroh Logo"
        className={`u-animated-logo w-full h-full object-contain pointer-events-none`}
      />
    </div>
  );
};

export type Role = 'operasional' | 'mitra' | 'jamaah' | 'admin' | 'vendor';

interface LoginViewProps {
  onLogin: (role: Role, subRole?: string, jamaahSession?: JamaahSession) => void;
  onGoToRegister?: (email?: string, name?: string, uid?: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onGoToRegister }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'mitra' | 'jamaah'>('jamaah');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Code-based log-in states for Jamaah
  const [loginMode, setLoginMode] = useState<'email' | 'code'>('code');
  const [inputKode, setInputKode] = useState('');
  const [inputUniq, setInputUniq] = useState('');
  const [showUniqCode, setShowUniqCode] = useState(false);

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKode || !inputUniq) {
      setError('Kode Booking dan Kode Unik wajib diisi');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { query, collection, where, getDocs, db } = await import('../firebase');
      const q = query(
        collection(db, 'bookings'), 
        where('kodeBooking', '==', inputKode.trim().toUpperCase())
      );
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        setError('Kode Booking tidak ditemukan. Pastikan format benar (Contoh: ORD-2026-UMR-004127).');
        setIsLoading(false);
        return;
      }

      let matchedBookingObj: BookingRecord | null = null;
      querySnap.forEach((docSnap) => {
        const data = docSnap.data() as Omit<BookingRecord, 'id'>;
        const codeInDoc = (data.uniqueCode || '').trim().toUpperCase();
        if (codeInDoc === inputUniq.trim().toUpperCase()) {
          matchedBookingObj = { id: docSnap.id, ...data };
        }
      });

      if (!matchedBookingObj) {
        setError('Kode Unik tidak cocok dengan Kode Booking tersebut. Silakan cek kembali atau hubungi Agen Mitra Anda.');
        setIsLoading(false);
        return;
      }

      // Successfully logged in! Call onLogin as 'jamaah' and pass data!
      onLogin('jamaah', undefined, matchedBookingObj);
    } catch (err: unknown) {
      console.error(err);
      setError('Terjadi kesalahan sistem saat otentikasi kode: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Masukkan email Anda terlebih dahulu untuk mengatur password');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Email pengaturan ulang password telah dikirim ke ' + email + '. Silakan cek inbox/spam Anda.');
    } catch (err: unknown) {
      setError('Gagal mengirim email: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan Password wajib diisi');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      let user;
      if (isSignUp) {
        // Create new account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } else {
        // Login existing account
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } catch (signInErr: unknown) {
          const authError = signInErr as { code?: string; message?: string };
          const errCode = authError.code || '';
          const errMsg = authError.message || '';
          const isUserNotFoundOrInvalid = errCode === 'auth/user-not-found' || 
                                          errCode === 'auth/invalid-credential' || 
                                          errMsg.includes('user-not-found') || 
                                          errMsg.includes('invalid-credential');
          // If login fails because user is not found or credentials invalid (which Firebase returns for non-existent Auth users)
          if (isUserNotFoundOrInvalid) {
            try {
              // Try to automatically register them under the hood. Since their profile is already in Firestore, 
              // they can transition seamlessly by typing their email and password and clicking Login.
              const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
              user = userCredential.user;
            } catch {
              // If signup also fails (e.g. email already exists in Auth, meaning it's just a wrong password),
              // throw the original signInErr to show the correct invalid credential error.
              throw signInErr;
            }
          } else {
            throw signInErr;
          }
        }
      }

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isOffline = errorMsg.includes('offline') || errorMsg.includes('Could not reach Cloud Firestore backend');
        const isMA = user.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
        if (isMA) {
          console.warn("Firestore error bypassed for Master Admin:", errorMsg);
        } else if (isOffline) {
          console.warn("Firestore offline error in LoginView:", errorMsg);
        } else {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }

      let userDataObj = null;
      const isMA = user.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
      if (userDocSnap && userDocSnap.exists()) {
        userDataObj = userDocSnap.data();
        if (isMA) {
          userDataObj.role = 'admin';
          userDataObj.subRole = null;
          await setDoc(userDocRef, { ...userDataObj, role: 'admin', subRole: null }, { merge: true });
        }
      } else if (isMA) {
        userDataObj = { 
          email: user.email?.toLowerCase().trim() || '',
          role: 'admin', 
          subRole: null,
          uid: user.uid,
          id: user.uid,
          namaLengkap: 'Master Admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userDataObj);
      } else if (user.email) {
        // Look up pre-created user via email query
        try {
          const { query, collection, where, getDocs, runTransaction } = await import('firebase/firestore');
          const trimmedEmail = user.email.toLowerCase().trim();
          
          // 1. Check pre_users first
          const qPre = query(collection(db, 'pre_users'), where('email', '==', trimmedEmail));
          const preSnap = await getDocs(qPre);
          
          if (!preSnap.empty) {
            const preDoc = preSnap.docs[0];
            const preData = preDoc.data();
            
            // Build the users document object
            userDataObj = {
              ...preData,
              uid: user.uid,
              id: user.uid,
              status: 'aktif',
              updatedAt: new Date().toISOString()
            };
            
            // Run transaction for atomic copy and status update
            await runTransaction(db, async (transaction) => {
              const targetUserRef = doc(db, 'users', user.uid);
              const sourcePreRef = doc(db, 'pre_users', preDoc.id);
              
              // Set the users/{uid} doc
              transaction.set(targetUserRef, userDataObj);
              
              // Update pre_users document status to 'activated' instead of deleting
              transaction.update(sourcePreRef, {
                status: 'activated',
                activatedAt: new Date().toISOString(),
                activatedByUid: user.uid
              });
              
              // If Role is Mitra, make sure they have a wallet under wallets/{uid}
              if (preData.role === 'mitra') {
                const walletRef = doc(db, 'wallets', user.uid);
                transaction.set(walletRef, {
                  userId: user.uid,
                  balance: 0,
                  updatedAt: new Date().toISOString()
                });
              }
            });
            
            console.log("Successfully activated user from pre_users in an atomic transaction:", user.uid);
          } else {
            // 2. Compatibility Layer: Check if they are in the older 'users' collection with a random ID
            const qUsers = query(collection(db, 'users'), where('email', '==', trimmedEmail));
            const usersSnap = await getDocs(qUsers);
            
            // Find if there is an unmigrated document (different from user.uid)
            const oldUserDoc = usersSnap.docs.find(d => d.id !== user.uid);
            if (oldUserDoc) {
              const oldUserData = oldUserDoc.data();
              userDataObj = {
                ...oldUserData,
                uid: user.uid,
                id: user.uid,
                updatedAt: new Date().toISOString()
              };
              
              await runTransaction(db, async (transaction) => {
                const targetUserRef = doc(db, 'users', user.uid);
                const sourceUserRef = doc(db, 'users', oldUserDoc.id);
                
                // Set the users/{uid} doc
                transaction.set(targetUserRef, userDataObj);
                
                // Update old users document status to 'migrated' instead of deleting
                transaction.update(sourceUserRef, {
                  status: 'migrated',
                  migratedAt: new Date().toISOString(),
                  migratedToUid: user.uid
                });
                
                // Keep wallet compatibility
                const oldWalletRef = doc(db, 'wallets', oldUserDoc.id);
                const oldWalletSnap = await transaction.get(oldWalletRef);
                if (oldWalletSnap.exists()) {
                  const targetWalletRef = doc(db, 'wallets', user.uid);
                  transaction.set(targetWalletRef, {
                    ...(oldWalletSnap.data() as Record<string, unknown>),
                    userId: user.uid,
                    updatedAt: new Date().toISOString()
                  });
                  // Mark old wallet as migrated instead of deleting
                  transaction.update(oldWalletRef, {
                    status: 'migrated',
                    migratedToUid: user.uid,
                    updatedAt: new Date().toISOString()
                  });
                } else if (oldUserData.role === 'mitra') {
                  const targetWalletRef = doc(db, 'wallets', user.uid);
                  transaction.set(targetWalletRef, {
                    userId: user.uid,
                    balance: 0,
                    updatedAt: new Date().toISOString()
                  });
                }
              });
              
              console.log("Successfully migrated existing user with random ID to UID in an atomic transaction:", user.uid);
            }
          }
        } catch (queryErr) {
          console.error("Failed to migrate pre-created user:", queryErr);
        }
      }

      // [Solusi 3 Fallback] If user document is still not found, check pendaftaran_mitra to auto-heal
      if (!userDataObj && user.email) {
        try {
          const { query, collection, where, getDocs } = await import('firebase/firestore');
          const qMitra = query(collection(db, 'pendaftaran_mitra'), where('email', '==', user.email.toLowerCase().trim()));
          const mitraSnap = await getDocs(qMitra);
          if (!mitraSnap.empty) {
            const mit = mitraSnap.docs[0].data();
            let roleToRestore: Role = 'mitra';
            let subRoleToRestore: string | null = null;
            
            // Try to read cached roles if any
            const cachedRole = localStorage.getItem(`umaroh_cached_role_${user.uid}`);
            const cachedSubRole = localStorage.getItem(`umaroh_cached_subrole_${user.uid}`);
            if (cachedRole) roleToRestore = cachedRole as Role;
            if (cachedSubRole) subRoleToRestore = cachedSubRole;

            userDataObj = {
              uid: user.uid,
              id: user.uid,
              email: user.email.toLowerCase().trim(),
              role: roleToRestore,
              subRole: subRoleToRestore,
              namaLengkap: mit.nama || mit.namaLengkap || 'Mitra',
              name: mit.nama || mit.namaLengkap || 'Mitra',
              phone: mit.phone || '',
              brandName: mit.brandName || '',
              paketId: mit.paketId || '',
              uplineId: mit.uplineId || '',
              provinsi: mit.provinsi || '',
              kota: mit.kota || '',
              kecamatan: mit.kecamatan || '',
              desaKelurahan: mit.desaKelurahan || '',
              address: mit.alamatLengkap || mit.address || '',
              createdAt: mit.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, userDataObj);
            console.info("[LoginView Auto-Heal] Successfully restored Firestore users doc via pendaftaran_mitra match!");
          } else {
            // If not found in pendaftaran_mitra, but email contains role indicators
            const emailLower = user.email.toLowerCase();
            let roleToRestore: Role = 'jamaah';
            if (emailLower.includes('mitra')) {
              roleToRestore = 'mitra';
            } else if (emailLower.includes('vendor')) {
              roleToRestore = 'vendor';
            } else if (emailLower.includes('jamaah') || emailLower.includes('customer')) {
              roleToRestore = 'jamaah';
            }
            
            const cachedRole = localStorage.getItem(`umaroh_cached_role_${user.uid}`);
            if (cachedRole) roleToRestore = cachedRole as Role;

            if (roleToRestore !== 'jamaah' || cachedRole) {
              userDataObj = {
                uid: user.uid,
                id: user.uid,
                email: user.email.toLowerCase().trim(),
                role: roleToRestore,
                subRole: localStorage.getItem(`umaroh_cached_subrole_${user.uid}`) || null,
                namaLengkap: user.email.split('@')[0],
                name: user.email.split('@')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await setDoc(userDocRef, userDataObj);
              console.info(`[LoginView Auto-Heal] Restored user doc via email heuristics/cache as ${roleToRestore}`);
            }
          }
        } catch (autoHealErr) {
          console.error("Auto-heal in LoginView failed:", autoHealErr);
        }
      }

      if (userDataObj) {
        onLogin(userDataObj.role as Role, userDataObj.subRole);
      } else {
        // If user just signed up or document missing, lead to registration
        // But first check if they are a hardcoded admin
        const isHardcodedAdmin = user.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
        if (isHardcodedAdmin) {
          onLogin('admin');
        } else {
          setTempUser(user);
          setNeedsRegistration(true);
        }
      }
    } catch (err: unknown) {
      const authError = err as { code?: string, message?: string };
      const errCode = authError.code || '';
      const errMsg = authError.message || '';
      const isExpectedAuthError = errCode === 'auth/user-not-found' || 
                                  errCode === 'auth/wrong-password' || 
                                  errCode === 'auth/invalid-credential' ||
                                  errCode === 'auth/too-many-requests' ||
                                  errMsg.includes('invalid-credential') ||
                                  errMsg.includes('wrong-password') ||
                                  errMsg.includes('user-not-found') ||
                                  errMsg.includes('too-many-requests');
      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn("Expected Auth validation handled gracefully:", errCode || errMsg);
      }
      const isTargetEmail = email ? (email.trim().toLowerCase() === 'afadsa76@gmail.com') : false;

      const isInvalidCredOrNotFound = errCode === 'auth/user-not-found' || 
                                      errCode === 'auth/wrong-password' || 
                                      errCode === 'auth/invalid-credential' ||
                                      errMsg.includes('invalid-credential') ||
                                      errMsg.includes('wrong-password') ||
                                      errMsg.includes('user-not-found');

      if (isInvalidCredOrNotFound) {
        setError(isTargetEmail 
          ? 'Credential tidak valid. Karena email ini terdaftar lewat Google, Anda HARUS klik "Lupa Password" di bawah untuk mengatur password "D@rkman31" pertama kali agar bisa login manual.'
          : 'Email atau Password salah. Jika Anda biasanya login dengan Google, silakan klik "Lupa Password" di bawah untuk mengatur password pertama kali.');
      } else if (errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
        setError('Email ini sudah terdaftar. Silakan login menggunakan email ini. Jika Anda mendaftar melalui Google atau lupa password, silakan klik "Lupa Password" di bawah untuk mengatur ulang password Anda.');
      } else if (errCode === 'auth/operation-not-allowed' || errMsg.includes('operation-not-allowed')) {
        setError('Login Email & Password belum diaktifkan di Firebase Console. Silakan aktifkan di Authentication > Sign-in method.');
      } else if (errCode === 'auth/weak-password' || errMsg.includes('weak-password')) {
        setError('Password terlalu lemah. Minimal 6 karakter.');
      } else if (errCode === 'auth/too-many-requests' || errMsg.includes('too-many-requests')) {
        setError('Terlalu banyak percobaan login. Silakan tunggu beberapa saat atau reset password.');
      } else {
        setError('Terjadi kesalahan: ' + (errMsg || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      let user;
      
      if (Capacitor.isNativePlatform()) {
        const result = await GoogleAuth.signIn();
        const idToken = result.authentication.idToken;
        if (!idToken) {
          throw new Error('ID Token tidak ditemukan dari Google Sign In');
        }
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        user = userCredential.user;
      } else {
        // Standard Web Google Sign-In with popup. signInWithPopup automatically logs the user in.
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      }

      if (!user) {
        throw new Error('Tidak dapat memperoleh data pengguna dari Google Sign In');
      }

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isOffline = errorMsg.includes('offline') || errorMsg.includes('Could not reach Cloud Firestore backend');
        const isMA = user.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
        if (isMA) {
          console.warn("Firestore error bypassed for Master Admin:", errorMsg);
        } else if (isOffline) {
          console.warn("Firestore offline error in LoginView:", errorMsg);
        } else {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }

      let userDataObj = null;
      const isMA = user.email ? (user.email.toLowerCase() === 'operationalumaroh@gmail.com' || user.email.toLowerCase() === 'afadsa76@gmail.com') : false;
      if (userDocSnap && userDocSnap.exists()) {
        userDataObj = userDocSnap.data();
        if (isMA) {
          userDataObj.role = 'admin';
          userDataObj.subRole = null;
          await setDoc(userDocRef, { ...userDataObj, role: 'admin', subRole: null }, { merge: true });
        }
      } else if (isMA) {
        userDataObj = { 
          email: user.email?.toLowerCase().trim() || '',
          role: 'admin', 
          subRole: null,
          uid: user.uid,
          id: user.uid,
          namaLengkap: 'Master Admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userDocRef, userDataObj);
      } else if (user.email) {
        // Look up pre-created user via email query
        try {
          const { query, collection, where, getDocs, runTransaction } = await import('firebase/firestore');
          const trimmedEmail = user.email.toLowerCase().trim();
          
          // 1. Check pre_users first
          const qPre = query(collection(db, 'pre_users'), where('email', '==', trimmedEmail));
          const preSnap = await getDocs(qPre);
          
          if (!preSnap.empty) {
            const preDoc = preSnap.docs[0];
            const preData = preDoc.data();
            
            // Build the users document object
            userDataObj = {
              ...preData,
              uid: user.uid,
              id: user.uid,
              status: 'aktif',
              updatedAt: new Date().toISOString()
            };
            
            // Run transaction for atomic copy and status update
            await runTransaction(db, async (transaction) => {
              const targetUserRef = doc(db, 'users', user.uid);
              const sourcePreRef = doc(db, 'pre_users', preDoc.id);
              
              // Set the users/{uid} doc
              transaction.set(targetUserRef, userDataObj);
              
              // Update pre_users document status to 'activated' instead of deleting
              transaction.update(sourcePreRef, {
                status: 'activated',
                activatedAt: new Date().toISOString(),
                activatedByUid: user.uid
              });
              
              // If Role is Mitra, make sure they have a wallet under wallets/{uid}
              if (preData.role === 'mitra') {
                const walletRef = doc(db, 'wallets', user.uid);
                transaction.set(walletRef, {
                  userId: user.uid,
                  balance: 0,
                  updatedAt: new Date().toISOString()
                });
              }
            });
            
            console.log("Successfully activated user from pre_users in an atomic transaction:", user.uid);
          } else {
            // 2. Compatibility Layer: Check if they are in the older 'users' collection with a random ID
            const qUsers = query(collection(db, 'users'), where('email', '==', trimmedEmail));
            const usersSnap = await getDocs(qUsers);
            
            // Find if there is an unmigrated document (different from user.uid)
            const oldUserDoc = usersSnap.docs.find(d => d.id !== user.uid);
            if (oldUserDoc) {
              const oldUserData = oldUserDoc.data();
              userDataObj = {
                ...oldUserData,
                uid: user.uid,
                id: user.uid,
                updatedAt: new Date().toISOString()
              };
              
              await runTransaction(db, async (transaction) => {
                const targetUserRef = doc(db, 'users', user.uid);
                const sourceUserRef = doc(db, 'users', oldUserDoc.id);
                
                // Set the users/{uid} doc
                transaction.set(targetUserRef, userDataObj);
                
                // Update old users document status to 'migrated' instead of deleting
                transaction.update(sourceUserRef, {
                  status: 'migrated',
                  migratedAt: new Date().toISOString(),
                  migratedToUid: user.uid
                });
                
                // Keep wallet compatibility
                const oldWalletRef = doc(db, 'wallets', oldUserDoc.id);
                const oldWalletSnap = await transaction.get(oldWalletRef);
                if (oldWalletSnap.exists()) {
                  const targetWalletRef = doc(db, 'wallets', user.uid);
                  transaction.set(targetWalletRef, {
                    ...(oldWalletSnap.data() as Record<string, unknown>),
                    userId: user.uid,
                    updatedAt: new Date().toISOString()
                  });
                  // Mark old wallet as migrated instead of deleting
                  transaction.update(oldWalletRef, {
                    status: 'migrated',
                    migratedToUid: user.uid,
                    updatedAt: new Date().toISOString()
                  });
                } else if (oldUserData.role === 'mitra') {
                  const targetWalletRef = doc(db, 'wallets', user.uid);
                  transaction.set(targetWalletRef, {
                    userId: user.uid,
                    balance: 0,
                    updatedAt: new Date().toISOString()
                  });
                }
              });
              
              console.log("Successfully migrated existing user with random ID to UID in an atomic transaction:", user.uid);
            }
          }
        } catch (queryErr) {
          console.error("Failed to migrate pre-created user:", queryErr);
        }
      }

      // [Solusi 3 Fallback] If user document is still not found, check pendaftaran_mitra to auto-heal
      if (!userDataObj && user.email) {
        try {
          const { query, collection, where, getDocs } = await import('firebase/firestore');
          const qMitra = query(collection(db, 'pendaftaran_mitra'), where('email', '==', user.email.toLowerCase().trim()));
          const mitraSnap = await getDocs(qMitra);
          if (!mitraSnap.empty) {
            const mit = mitraSnap.docs[0].data();
            let roleToRestore: Role = 'mitra';
            let subRoleToRestore: string | null = null;
            
            // Try to read cached roles if any
            const cachedRole = localStorage.getItem(`umaroh_cached_role_${user.uid}`);
            const cachedSubRole = localStorage.getItem(`umaroh_cached_subrole_${user.uid}`);
            if (cachedRole) roleToRestore = cachedRole as Role;
            if (cachedSubRole) subRoleToRestore = cachedSubRole;

            userDataObj = {
              uid: user.uid,
              id: user.uid,
              email: user.email.toLowerCase().trim(),
              role: roleToRestore,
              subRole: subRoleToRestore,
              namaLengkap: mit.nama || mit.namaLengkap || 'Mitra',
              name: mit.nama || mit.namaLengkap || 'Mitra',
              phone: mit.phone || '',
              brandName: mit.brandName || '',
              paketId: mit.paketId || '',
              uplineId: mit.uplineId || '',
              provinsi: mit.provinsi || '',
              kota: mit.kota || '',
              kecamatan: mit.kecamatan || '',
              desaKelurahan: mit.desaKelurahan || '',
              address: mit.alamatLengkap || mit.address || '',
              createdAt: mit.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, userDataObj);
            console.info("[LoginView Google Auto-Heal] Successfully restored Firestore users doc via pendaftaran_mitra match!");
          } else {
            // If not found in pendaftaran_mitra, but email contains role indicators
            const emailLower = user.email.toLowerCase();
            let roleToRestore: Role = 'jamaah';
            if (emailLower.includes('mitra')) {
              roleToRestore = 'mitra';
            } else if (emailLower.includes('vendor')) {
              roleToRestore = 'vendor';
            } else if (emailLower.includes('jamaah') || emailLower.includes('customer')) {
              roleToRestore = 'jamaah';
            }
            
            const cachedRole = localStorage.getItem(`umaroh_cached_role_${user.uid}`);
            if (cachedRole) roleToRestore = cachedRole as Role;

            if (roleToRestore !== 'jamaah' || cachedRole) {
              userDataObj = {
                uid: user.uid,
                id: user.uid,
                email: user.email.toLowerCase().trim(),
                role: roleToRestore,
                subRole: localStorage.getItem(`umaroh_cached_subrole_${user.uid}`) || null,
                namaLengkap: user.email.split('@')[0],
                name: user.email.split('@')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await setDoc(userDocRef, userDataObj);
              console.info(`[LoginView Google Auto-Heal] Restored user doc via email heuristics/cache as ${roleToRestore}`);
            }
          }
        } catch (autoHealErr) {
          console.error("Auto-heal in Google Login failed:", autoHealErr);
        }
      }

      if (userDataObj) {
        onLogin(userDataObj.role as Role, userDataObj.subRole);
      } else {
        // User doesn't exist, needs to register
        setTempUser(user);
        setNeedsRegistration(true);
      }
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      const errCode = authError.code || '';
      const errMsg = authError.message || '';
      const isExpectedAuthError = errCode === 'auth/user-not-found' || 
                                  errCode === 'auth/wrong-password' || 
                                  errCode === 'auth/invalid-credential' ||
                                  errCode === 'auth/popup-closed-by-user' ||
                                  errCode === 'auth/popup-blocked' ||
                                  errCode === 'auth/too-many-requests' ||
                                  errMsg.includes('invalid-credential') ||
                                  errMsg.includes('wrong-password') ||
                                  errMsg.includes('popup-closed-by-user') ||
                                  errMsg.includes('popup-blocked') ||
                                  errMsg.includes('too-many-requests');
      if (!isExpectedAuthError) {
        console.error(err);
      } else {
        console.warn("Expected Web Google Auth validation/popup behavior handled gracefully:", errCode || errMsg);
      }

      if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
        setError('Google Auth Gagal (auth/invalid-credential). Hal ini sering terjadi di web preview AI Studio (iframe) karena kebijakan browser membatasi cookie/pop-up pihak ketiga. Silakan login secara manual dengan mengetik Email & Password di atas.');
      } else if (errCode === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user')) {
        setError('Login dibatalkan karena jendela pop-up Google ditutup sebelum selesai.');
      } else if (errCode === 'auth/popup-blocked' || errMsg.includes('popup-blocked')) {
        setError('Pop-up Google diblokir oleh browser. Silakan izinkan pop-up untuk situs ini atau login secara manual.');
      } else {
        setError('Gagal login dengan Google: ' + (errMsg || String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!tempUser) return;
    setError('');
    setIsLoading(true);
    try {
      if (selectedRole === 'mitra') {
        if (onGoToRegister) {
          onGoToRegister(tempUser.email || '', tempUser.displayName || '', tempUser.uid);
        }
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', tempUser.uid);
      const newUserData = {
        uid: tempUser.uid,
        name: tempUser.displayName || 'User',
        email: tempUser.email || '',
        role: selectedRole,
        subRole: '',
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(userDocRef, newUserData);
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.WRITE, `users/${tempUser.uid}`);
      }

      onLogin(selectedRole);
    } catch (err: unknown) {
      console.error(err);
      setError('Gagal mendaftar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  if (needsRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="flex justify-center">
            <AutoplayVideoLogo className="w-[280px] sm:w-[350px] md:w-[400px] h-auto" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Selesaikan Pendaftaran
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pilih jenis akun Anda untuk melanjutkan
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setSelectedRole('jamaah')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  selectedRole === 'jamaah' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-500'
                }`}
              >
                <UserIcon className={`w-6 h-6 mb-2 ${selectedRole === 'jamaah' ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="text-xs font-bold uppercase tracking-wider">Jamaah</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('mitra')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  selectedRole === 'mitra' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 text-gray-500'
                }`}
              >
                <Code2 className={`w-6 h-6 mb-2 ${selectedRole === 'mitra' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-center">Mitra</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              onClick={handleCompleteRegistration}
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                selectedRole === 'jamaah' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Memproses...' : 'Selesaikan Pendaftaran'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
        <div className="mb-3 flex justify-center w-full px-4">
          <AutoplayVideoLogo className="w-[300px] sm:w-[380px] md:w-[440px] h-auto drop-shadow-2xl" />
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-t-[2.5rem] sm:rounded-2xl sm:px-10 border-t border-gray-100">
          
          {/* Tab Selector */}
          <div className="flex border-b border-gray-100 mb-6 font-sans">
            <button
              type="button"
              onClick={() => {
                setLoginMode('code');
                setError('');
              }}
              className={`flex-1 pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 text-center ${
                loginMode === 'code'
                  ? 'border-amber-600 text-amber-700 font-black'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              🔑 Portal Kode Jamaah
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('email');
                setError('');
              }}
              className={`flex-1 pb-3 text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 text-center ${
                loginMode === 'email'
                  ? 'border-amber-600 text-amber-700 font-black'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              🤝 Mitra/Marketplace
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 text-center font-bold">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {loginMode === 'code' ? (
              /* Portal Jamaah Code-based Login Form */
              <form onSubmit={handleCodeLogin} className="space-y-4 font-sans">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Kode Booking</label>
                  <div className="relative">
                    <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={inputKode}
                      onChange={(e) => setInputKode(e.target.value)}
                      placeholder="Contoh: ORD-2026-UMR-004127"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-sm font-bold tracking-wide placeholder-gray-300"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Kode Unik / Sandi</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showUniqCode ? "text" : "password"}
                      value={inputUniq}
                      onChange={(e) => setInputUniq(e.target.value)}
                      placeholder="Contoh: 5Z97W1"
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 text-sm font-mono tracking-widest placeholder-gray-300 font-bold"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowUniqCode(!showUniqCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-600 focus:outline-none"
                    >
                      {showUniqCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-900 leading-normal mb-2 font-sans">
                  🔑 <strong>Akses Khusus Berkas Mandiri:</strong> Akun Portal ini didaftarkan dari pihak Mitra/Agen Umaroh Anda. Paket Umroh Anda terkunci aman sesuai pilihan Mitra Anda dan tidak dapat diubah di sini. Silakan masukkan sandi untuk melengkapi biodata manifest & upload foto paspor/KTP.
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-black text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Memproses Otentikasi Kode...' : (
                    <>
                      Masuk Portal Mandiri Jamaah
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Standard Email-based Login Form */
              <form onSubmit={handleManualAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh@gmail.com"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? "Buat password baru" : "Masukkan password"}
                      className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Memproses...' : (
                    <>
                      {isSignUp ? 'Daftar Sekarang' : 'Login'}
                      {!isSignUp && <LogIn className="ml-2 h-4 w-4" />}
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-end mt-4">
                  {isSignUp ? (
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Sudah punya akun? Login
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Lupa Password? / Set Password
                    </button>
                  )}
                </div>
              </form>
            )}

            {loginMode === 'email' && (
              <div className="space-y-3 mt-4">
                {/* Registration Buttons Row */}
                {!isSignUp && (
                  <div className="grid grid-cols-2 gap-3">
                    {onGoToRegister && (
                      <button
                        type="button"
                        onClick={() => onGoToRegister()}
                        className="w-full flex justify-center items-center py-3 px-4 border border-amber-600 rounded-xl shadow-sm text-xs font-bold text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all cursor-pointer"
                      >
                        Daftar sebagai Mitra
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="w-full flex justify-center items-center py-3 px-4 border border-amber-600 rounded-xl shadow-sm text-xs font-bold text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all cursor-pointer"
                    >
                      Buat Akun Jamaah
                    </button>
                  </div>
                )}

                {/* Google Sign-In Button (Swapped to bottom) */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all cursor-pointer ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Memproses...' : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-3" />
                      Google
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Banner Lembaga Sertifikasi & Lisensi Resmi */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex justify-center items-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1Bt5EUjC9cKCggGgB6ZNe_vK0q1I9Zltn" 
                alt="Lisensi Resmi PT. NAWAITUL UMRAH HAJI" 
                className="w-full h-auto max-w-[420px] rounded-xl object-contain shadow-sm border border-gray-100"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
