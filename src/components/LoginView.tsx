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
        }
      } else if (isMA) {
        userDataObj = { role: 'admin', subRole: null };
      } else if (user.email) {
        // Look up pre-created user via email query
        try {
          const { query, collection, where, getDocs, deleteDoc } = await import('firebase/firestore');
          const q = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase().trim()));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const preDoc = querySnap.docs[0];
            const preData = preDoc.data();
            userDataObj = {
              ...preData,
              uid: user.uid,
              id: user.uid,
              updatedAt: new Date().toISOString()
            };
            // Set the new user.uid document
            await setDoc(userDocRef, userDataObj);
            // Delete the temporary pre-created document if the ID is different
            if (preDoc.id !== user.uid) {
              // Also update wallet if it exists (must do before deleting the old user document,
              // as the wallet deletion permissions check relies on the user document's existence)
              const oldWalletRef = doc(db, 'wallets', preDoc.id);
              const walletSnap = await getDoc(oldWalletRef);
              if (walletSnap.exists()) {
                await setDoc(doc(db, 'wallets', user.uid), {
                  ...walletSnap.data(),
                  userId: user.uid,
                  updatedAt: new Date().toISOString()
                });
                await deleteDoc(oldWalletRef);
              }
              // Delete the old user document last
              await deleteDoc(doc(db, 'users', preDoc.id));
            }
          }
        } catch (queryErr) {
          console.error("Failed to migrate pre-created user:", queryErr);
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
        }
      } else if (isMA) {
        userDataObj = { role: 'admin', subRole: null };
      } else if (user.email) {
        // Look up pre-created user via email query
        try {
          const { query, collection, where, getDocs, deleteDoc } = await import('firebase/firestore');
          const q = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase().trim()));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const preDoc = querySnap.docs[0];
            const preData = preDoc.data();
            userDataObj = {
              ...preData,
              uid: user.uid,
              id: user.uid,
              updatedAt: new Date().toISOString()
            };
            // Set the new user.uid document
            await setDoc(userDocRef, userDataObj);
            // Delete the temporary pre-created document if the ID is different
            if (preDoc.id !== user.uid) {
              // Also update wallet if it exists (must do before deleting the old user document,
              // as the wallet deletion permissions check relies on the user document's existence)
              const oldWalletRef = doc(db, 'wallets', preDoc.id);
              const walletSnap = await getDoc(oldWalletRef);
              if (walletSnap.exists()) {
                await setDoc(doc(db, 'wallets', user.uid), {
                  ...walletSnap.data(),
                  userId: user.uid,
                  updatedAt: new Date().toISOString()
                });
                await deleteDoc(oldWalletRef);
              }
              // Delete the old user document last
              await deleteDoc(doc(db, 'users', preDoc.id));
            }
          }
        } catch (queryErr) {
          console.error("Failed to migrate pre-created user:", queryErr);
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
                
                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    {isSignUp ? 'Sudah punya akun? Login' : 'Buat akun manual baru'}
                  </button>
                  {!isSignUp && (
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
              <>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className={`w-full flex justify-center items-center py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? 'Memproses...' : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-3" />
                      Google
                    </>
                  )}
                </button>
                
                {onGoToRegister && (
                  <button
                    onClick={() => onGoToRegister()}
                    className="mt-2 w-full flex justify-center items-center py-3 px-4 border border-amber-600 rounded-lg shadow-sm text-sm font-bold text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                  >
                    Daftar sebagai Mitra
                  </button>
                )}
              </>
            )}
          </div>

          {/* Banner Lembaga Sertifikasi & Lisensi Resmi */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            {/* Grid 6 Sertifikasi Logo */}
            <div className="grid grid-cols-6 gap-2 items-center justify-items-center mb-4 leading-none">
              {/* 1. 5 Pasti Umroh */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 md:w-9 md:h-9 drop-shadow-sm" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#FFFBEB" stroke="#D97706" strokeWidth="2"/>
                  <path d="M16 42C16 30 20 20 32 20C44 20 48 30 48 42H16Z" fill="#0F172A"/>
                  <path d="M22 42V30H42V42H22Z" fill="#334155"/>
                  <path d="M22 30H42V33H22V30Z" fill="#FBBF24"/>
                  <circle cx="32" cy="32" r="10" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
                  <text x="32" y="36.5" fontSize="13" fontWeight="900" fill="#1E293B" textAnchor="middle" fontFamily="sans-serif">5</text>
                </svg>
                <span className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter mt-1 block h-3 text-center">5 PASTI</span>
              </div>

              {/* 2. IATA */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="24" r="14" stroke="#0284C7" strokeWidth="2" strokeDasharray="2 2" fill="#F0F9FF"/>
                  <path d="M10 24H54" stroke="#0284C7" strokeWidth="2"/>
                  <path d="M14 20H50" stroke="#0284C7" strokeWidth="1.5"/>
                  <path d="M18 28H46" stroke="#0284C7" strokeWidth="1.5"/>
                  <text x="32" y="49" fontSize="13" fontWeight="900" fill="#0284C7" textAnchor="middle" fontFamily="sans-serif" letterSpacing="0.05em">IATA</text>
                </svg>
                <span className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter mt-1 block h-3 text-center">MEMBER</span>
              </div>

              {/* 3. SISKOPATUH */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="14" y="14" width="36" height="36" rx="6" fill="#0D9488"/>
                  <path d="M23 31L29 37L41 25" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  <text x="32" y="58" fontSize="7" fontWeight="900" fill="#0D9488" textAnchor="middle" fontFamily="sans-serif">SISKO</text>
                </svg>
                <span className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter mt-1 block h-3 text-center">PATUH</span>
              </div>

              {/* 4. KEMENAG */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="32,4 58,22 48,56 16,56 6,22" fill="#15803D" stroke="#EAB308" strokeWidth="2"/>
                  <circle cx="32" cy="32" r="15" fill="#166534"/>
                  <path d="M32 20V44M20 32H44" stroke="#EAB308" strokeWidth="1.5"/>
                  <text x="32" y="35" fontSize="9" fontWeight="bold" fill="#FFFFFF" textAnchor="middle" fontFamily="serif">RI</text>
                </svg>
                <span className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter mt-1 block h-3 text-center">KEMENAG</span>
              </div>

              {/* 5. SAPUHI */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="28" fill="#FFFFFF" stroke="#EAB308" strokeWidth="2"/>
                  <rect x="22" y="22" width="20" height="20" fill="#1E293B" rx="1"/>
                  <rect x="22" y="22" width="20" height="4" fill="#EAB308"/>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#EAB308" strokeWidth="1" strokeDasharray="3 3"/>
                  <text x="32" y="54" fontSize="7.5" fontWeight="900" fill="#1E293B" textAnchor="middle" fontFamily="sans-serif">SAPUHI</text>
                </svg>
                <span className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter mt-1 block h-3 text-center">SAPUHI</span>
              </div>

              {/* 6. KAN */}
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 24L24 42L56 14" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                  <text x="32" y="52" fontSize="15" fontWeight="900" fill="#1E3A8A" textAnchor="middle" fontFamily="sans-serif">KAN</text>
                </svg>
                <span className="text-[6.5px] font-black text-gray-400 uppercase tracking-tighter mt-1 block h-3 text-center">KAN</span>
              </div>
            </div>

            {/* Bar Abu-Abu Credentials Lisensi Resmi */}
            <div className="bg-gray-50 border border-gray-150 rounded-xl py-2 px-1 text-center shadow-inner">
              <p className="text-[9.5px] font-black text-gray-700 tracking-wider uppercase font-sans leading-none">
                PT. NAWAITUL UMRAH HAJI <span className="text-gray-300 mx-1">|</span> PPIU : 28092200496140003
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
