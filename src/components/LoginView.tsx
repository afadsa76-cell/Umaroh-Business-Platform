import React, { useState } from 'react';
import { Code2, ArrowRight, User as UserIcon } from 'lucide-react';
import { logoBase64 } from '../utils/logoBase64';
import { auth, db, doc, getDoc, setDoc, signInWithEmailAndPassword, handleFirestoreError, OperationType } from '../firebase';
import { signInWithCredential, GoogleAuthProvider, User } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Mail, Lock, LogIn } from 'lucide-react';

export type Role = 'operasional' | 'mitra' | 'jamaah' | 'admin';

interface LoginViewProps {
  onLogin: (role: Role, subRole?: string) => void;
  onGoToRegister?: () => void;
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

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Masukkan email Anda terlebih dahulu untuk mengatur password');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
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
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } else {
        // Login existing account
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        onLogin(userData.role as Role, userData.subRole);
      } else {
        // If user just signed up or document missing, lead to registration
        // But first check if they are a hardcoded admin
        const isHardcodedAdmin = user.email === 'operationalumaroh@gmail.com' || user.email === 'afadsa76@gmail.com';
        if (isHardcodedAdmin) {
          onLogin('admin');
        } else {
          setTempUser(user);
          setNeedsRegistration(true);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const authError = err as { code?: string, message?: string };
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        const isTargetEmail = email === 'afadsa76@gmail.com';
        setError(isTargetEmail 
          ? 'Credential tidak valid. Karena email ini terdaftar lewat Google, Anda HARUS klik "Lupa Password" di bawah untuk mengatur password "D@rkman31" pertama kali agar bisa login manual.'
          : 'Email atau Password salah. Jika Anda biasanya login dengan Google, silakan klik "Lupa Password" di bawah untuk mengatur password pertama kali.');
      } else if (authError.code === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar via Google. Silakan klik "Lupa Password" untuk mengatur password manual Anda.');
      } else if (authError.code === 'auth/operation-not-allowed') {
        setError('Login Email & Password belum diaktifkan di Firebase Console. Silakan aktifkan di Authentication > Sign-in method.');
      } else if (authError.code === 'auth/weak-password') {
        setError('Password terlalu lemah. Minimal 6 karakter.');
      } else if (authError.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan login. Silakan tunggu beberapa saat atau reset password.');
      } else {
        setError('Terjadi kesalahan: ' + (authError.message || 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      let idToken: string | undefined;
      
      if (Capacitor.isNativePlatform()) {
        const result = await GoogleAuth.signIn();
        idToken = result.authentication.idToken;
      } else {
        // Fallback or handle differently on web if needed
        const provider = new GoogleAuthProvider();
        const { signInWithPopup } = await import('firebase/auth');
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        idToken = credential?.idToken;
      }

      if (!idToken) {
        throw new Error('ID Token tidak ditemukan dari Google Sign In');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (err: unknown) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        onLogin(userData.role as Role, userData.subRole);
      } else {
        // User doesn't exist, needs to register
        setTempUser(user);
        setNeedsRegistration(true);
      }
    } catch (err: unknown) {
      console.error(err);
      setError('Gagal login dengan Google: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!tempUser) return;
    setError('');
    setIsLoading(true);
    try {
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
      
      // If Mitra, create a wallet for them
      if (selectedRole === 'mitra') {
        const walletRef = doc(db, 'wallets', tempUser.uid);
        try {
          await setDoc(walletRef, {
            userId: tempUser.uid,
            balance: 0,
            updatedAt: new Date().toISOString()
          });
        } catch (err: unknown) {
          handleFirestoreError(err, OperationType.WRITE, `wallets/${tempUser.uid}`);
        }
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
            <img src={logoBase64} alt="Umaroh Logo" className="h-16" />
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
        <div className="mb-12">
          <img src={logoBase64} alt="Umaroh Logo" className="h-24 md:h-32 drop-shadow-2xl" />
        </div>
      </div>

      <div className="mt-auto sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl rounded-t-[2.5rem] sm:rounded-2xl sm:px-10 border-t border-gray-100">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          <div className="space-y-6">
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUp ? "Buat password baru" : "Masukkan password"}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm"
                    required
                  />
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
                onClick={onGoToRegister}
                className="mt-2 w-full flex justify-center items-center py-3 px-4 border border-amber-600 rounded-lg shadow-sm text-sm font-bold text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              >
                Daftar sebagai Mitra
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
