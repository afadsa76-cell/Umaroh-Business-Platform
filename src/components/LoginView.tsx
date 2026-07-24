import React, { useState, useEffect } from 'react';
import { logoBase64 } from '../utils/logoBase64';
import { Code2, ArrowRight, User as UserIcon } from 'lucide-react';
import { auth, db, doc, getDoc, setDoc, signInWithEmailAndPassword, handleFirestoreError, OperationType, query, collection, where, getDocs, runTransaction, onSnapshot } from '../firebase';
import { signInWithCredential, GoogleAuthProvider, User, sendPasswordResetEmail, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Mail, Lock, LogIn, Eye, EyeOff, Play, ExternalLink, Video } from 'lucide-react';
import { JamaahSession, BookingRecord } from '../types';
import { normalizeEmail } from '../utils/email';
import { getMediaInfo, getYouTubeEmbedUrl } from '../utils/youtube';

const YouTubeVideoCard: React.FC<{ url: string; title: string; label?: string }> = ({ url, title, label }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const media = getMediaInfo(url);

  if (!url) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-3xl p-4 shadow-2xl text-white space-y-3 transform transition hover:scale-[1.01] w-full max-w-md mx-auto font-sans">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase truncate max-w-[200px]">
            {label || '📹 MEDIA & Bimbingan UMAROH'}
          </span>
        </div>
        <a
          href={media.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${media.badgeBg} hover:brightness-110 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 transition shrink-0 shadow-sm`}
        >
          <span>{media.platformName}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden relative shadow-inner border border-slate-800 group">
        {media.platform === 'direct' ? (
          <video
            src={media.embedUrl}
            controls
            className="w-full h-full rounded-2xl object-contain bg-black"
          />
        ) : isPlaying ? (
          <iframe
            className="w-full h-full rounded-2xl"
            src={media.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        ) : (
          <div 
            onClick={() => setIsPlaying(true)}
            className="w-full h-full relative cursor-pointer flex items-center justify-center overflow-hidden bg-slate-950"
          >
            {media.thumbnailUrl ? (
              <img 
                src={media.thumbnailUrl} 
                alt={title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2">
                <Video className="w-12 h-12 text-amber-400/80" />
                <span className="text-xs font-bold text-slate-200">{media.platformName}</span>
                <span className="text-[10px] text-slate-400">Klik untuk memutar atau buka media</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className={`w-14 h-14 rounded-full ${media.badgeBg} text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                <Play className="w-7 h-7 fill-current ml-1" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold truncate flex items-center justify-between">
              <span>▶️ Putar Media {media.platformName}</span>
              <span className="text-[9px] text-amber-300 underline font-normal">atau Buka Langsung ↗</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="space-y-0.5 pr-2">
          <h4 className="text-xs font-black text-amber-100 leading-snug line-clamp-2">
            {title}
          </h4>
          <p className="text-[10px] text-slate-400 font-medium">
            ✨ Umaroh Syariah Digital Media
          </p>
        </div>
        <a
          href={media.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[10px] font-extrabold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
        >
          Buka {media.platformName} <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

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

  // Video Config state for Landing / Login page
  const [videoConfig, setVideoConfig] = useState({
    landingVideoEnabled: true,
    landingVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    landingVideoTitle: 'SAATNYA KAMU YANG JADI OWNERNYA!',
    landingVideoUrlRight: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    landingVideoTitleRight: 'BIMBINGAN MANASIK & PROFIL UMAROH SYNERGY',
    landingVideoPosition: 'both' as 'left' | 'right' | 'both' | 'bottom'
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'ad_network_config', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setVideoConfig({
          landingVideoEnabled: data.landingVideoEnabled ?? true,
          landingVideoUrl: data.landingVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          landingVideoTitle: data.landingVideoTitle || 'SAATNYA KAMU YANG JADI OWNERNYA!',
          landingVideoUrlRight: data.landingVideoUrlRight || data.landingVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          landingVideoTitleRight: data.landingVideoTitleRight || data.landingVideoTitle || 'BIMBINGAN MANASIK & PROFIL UMAROH SYNERGY',
          landingVideoPosition: data.landingVideoPosition || 'both'
        });
      }
    }, (err) => {
      console.warn("Offline or permission warning reading video config:", err);
      try {
        const cached = localStorage.getItem('ad_network_config');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed) {
            setVideoConfig({
              landingVideoEnabled: parsed.landingVideoEnabled ?? true,
              landingVideoUrl: parsed.landingVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              landingVideoTitle: parsed.landingVideoTitle || 'SAATNYA KAMU YANG JADI OWNERNYA!',
              landingVideoUrlRight: parsed.landingVideoUrlRight || parsed.landingVideoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              landingVideoTitleRight: parsed.landingVideoTitleRight || parsed.landingVideoTitle || 'BIMBINGAN MANASIK & PROFIL UMAROH SYNERGY',
              landingVideoPosition: parsed.landingVideoPosition || 'both'
            });
          }
        }
      } catch (e) {
        console.warn(e);
      }
    });

    return () => unsub();
  }, []);

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKode || !inputUniq) {
      setError('Kode Booking dan Kode Unik wajib diisi');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
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
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setError('Masukkan email Anda terlebih dahulu untuk mengatur password');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      alert('Email pengaturan ulang password telah dikirim ke ' + cleanEmail + '. Silakan cek inbox/spam Anda.');
    } catch (err: unknown) {
      setError('Gagal mengirim email: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = normalizeEmail(email);
    const enteredPassword = password;
    if (!cleanEmail || !enteredPassword) {
      setError('Email dan Password wajib diisi');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      let user;
      if (isSignUp) {
        // Create new account
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        user = userCredential.user;
      } else {
        // Login existing account
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
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
              const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
        const isMA = user.email ? (
          user.email.toLowerCase() === 'operationalumaroh@gmail.com' || 
          user.email.toLowerCase() === 'afadsa76@gmail.com' ||
          user.email.toLowerCase() === 'admin@umaroh.com'
        ) : false;
        if (isMA) {
          console.warn("Firestore error bypassed for Master Admin:", errorMsg);
        } else if (isOffline) {
          console.warn("Firestore offline error in LoginView:", errorMsg);
        } else {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }

      let userDataObj = null;
      const isMA = user.email ? (
        user.email.toLowerCase() === 'operationalumaroh@gmail.com' || 
        user.email.toLowerCase() === 'afadsa76@gmail.com' ||
        user.email.toLowerCase() === 'admin@umaroh.com'
      ) : false;
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
                const oldWalletRef = doc(db, 'wallets', oldUserDoc.id);
                
                // Perform all reads first to satisfy Firestore transaction order
                const oldWalletSnap = await transaction.get(oldWalletRef);
                
                // Set the users/{uid} doc
                transaction.set(targetUserRef, userDataObj);
                
                // Update old users document status to 'migrated' instead of deleting
                transaction.update(sourceUserRef, {
                  status: 'migrated',
                  migratedAt: new Date().toISOString(),
                  migratedToUid: user.uid
                });
                
                // Keep wallet compatibility
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
        const isHardcodedAdmin = user.email ? (
          user.email.toLowerCase() === 'operationalumaroh@gmail.com' || 
          user.email.toLowerCase() === 'afadsa76@gmail.com' ||
          user.email.toLowerCase() === 'admin@umaroh.com'
        ) : false;
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
        if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
          console.warn("Warning\n Expected Auth validation handled gracefully:\n  auth/invalid-credential");
        } else {
          console.warn("Expected Auth validation handled gracefully:", errCode || errMsg);
        }
      }
      const isTargetEmail = email ? (normalizeEmail(email) === 'afadsa76@gmail.com') : false;

      const isInvalidCredOrNotFound = errCode === 'auth/user-not-found' || 
                                      errCode === 'auth/wrong-password' || 
                                      errCode === 'auth/invalid-credential' ||
                                      errMsg.includes('invalid-credential') ||
                                      errMsg.includes('wrong-password') ||
                                      errMsg.includes('user-not-found');

      if (isInvalidCredOrNotFound) {
        let isMismatchedPassword = false;
        try {
          const qU = query(collection(db, 'users'), where('email', '==', cleanEmail));
          const snapU = await getDocs(qU);
          if (!snapU.empty) {
            const uData = snapU.docs[0].data();
            if (uData.passwordAwal && enteredPassword === uData.passwordAwal) {
              isMismatchedPassword = true;
            }
          }
        } catch (checkErr) {
          console.error("Non-blocking check of passwordAwal failed:", checkErr);
        }

        if (isMismatchedPassword) {
          setError(`Password "${enteredPassword}" cocok dengan data pendaftaran awal Anda di database, namun akun Firebase Authentication Anda memiliki password berbeda. Silakan klik "Lupa Password / Set Password" di bawah untuk menyinkronkan password Anda.`);
        } else {
          setError(isTargetEmail 
            ? 'Credential tidak valid. Karena email ini terdaftar lewat Google, Anda HARUS klik "Lupa Password" di bawah untuk mengatur password "D@rkman31" pertama kali agar bisa login manual.'
            : 'Email atau Password salah. Jika Anda biasanya login dengan Google, silakan klik "Lupa Password" di bawah untuk mengatur password pertama kali.');
        }
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
        const isMA = user.email ? (
          user.email.toLowerCase() === 'operationalumaroh@gmail.com' || 
          user.email.toLowerCase() === 'afadsa76@gmail.com' ||
          user.email.toLowerCase() === 'admin@umaroh.com'
        ) : false;
        if (isMA) {
          console.warn("Firestore error bypassed for Master Admin:", errorMsg);
        } else if (isOffline) {
          console.warn("Firestore offline error in LoginView:", errorMsg);
        } else {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      }

      let userDataObj = null;
      const isMA = user.email ? (
        user.email.toLowerCase() === 'operationalumaroh@gmail.com' || 
        user.email.toLowerCase() === 'afadsa76@gmail.com' ||
        user.email.toLowerCase() === 'admin@umaroh.com'
      ) : false;
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
                const oldWalletRef = doc(db, 'wallets', oldUserDoc.id);
                
                // Perform all reads first to satisfy Firestore transaction order
                const oldWalletSnap = await transaction.get(oldWalletRef);
                
                // Set the users/{uid} doc
                transaction.set(targetUserRef, userDataObj);
                
                // Update old users document status to 'migrated' instead of deleting
                transaction.update(sourceUserRef, {
                  status: 'migrated',
                  migratedAt: new Date().toISOString(),
                  migratedToUid: user.uid
                });
                
                // Keep wallet compatibility
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
        if (errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential')) {
          console.warn("Warning\n Expected Auth validation handled gracefully:\n  auth/invalid-credential");
        } else {
          console.warn("Expected Web Google Auth validation/popup behavior handled gracefully:", errCode || errMsg);
        }
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

  const leftUrl = videoConfig.landingVideoUrl;
  const leftTitle = videoConfig.landingVideoTitle || 'SAATNYA KAMU YANG JADI OWNERNYA!';

  const rightUrl = videoConfig.landingVideoUrlRight || videoConfig.landingVideoUrl;
  const rightTitle = videoConfig.landingVideoTitleRight || videoConfig.landingVideoTitle || 'BIMBINGAN MANASIK & PROFIL UMAROH SYNERGY';

  const isVideoVisible = videoConfig.landingVideoEnabled && Boolean(getYouTubeEmbedUrl(leftUrl) || getYouTubeEmbedUrl(rightUrl));
  const pos = videoConfig.landingVideoPosition || 'both';

  const showLeft = isVideoVisible && (pos === 'left' || pos === 'both');
  const showRight = isVideoVisible && (pos === 'right' || pos === 'both');
  const showBottom = isVideoVisible && pos === 'bottom';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
      
      {/* App Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center mb-2">
        <div className="mb-2 flex justify-center w-full px-4">
          <AutoplayVideoLogo className="w-[300px] sm:w-[380px] md:w-[440px] h-auto drop-shadow-2xl" />
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className={`grid grid-cols-1 ${showLeft || showRight ? 'lg:grid-cols-12' : ''} gap-6 items-center justify-center`}>
          
          {/* Left Video Card (Desktop Side) */}
          {showLeft && (
            <div className={`order-2 lg:order-1 ${showRight ? 'lg:col-span-3' : 'lg:col-span-5'} flex justify-center`}>
              <YouTubeVideoCard 
                url={leftUrl} 
                title={leftTitle} 
                label="📹 PROFIL & SYARIAH (KIRI)" 
              />
            </div>
          )}

          {/* Login Form Card */}
          <div className={`order-1 lg:order-2 ${showLeft && showRight ? 'lg:col-span-6' : showLeft || showRight ? 'lg:col-span-7' : 'max-w-md mx-auto w-full'}`}>
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

          {/* Right Video Card (Desktop Side) */}
          {showRight && (
            <div className="order-3 lg:col-span-3 flex justify-center">
              <YouTubeVideoCard 
                url={rightUrl} 
                title={rightTitle} 
                label="📹 BIMBINGAN MANASIK (KANAN)" 
              />
            </div>
          )}

        </div>

        {/* Bottom Video Slot (If position is bottom) */}
        {showBottom && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <YouTubeVideoCard 
              url={leftUrl} 
              title={leftTitle} 
              label="📹 PROFIL & SYARIAH" 
            />
            {rightUrl && (
              <YouTubeVideoCard 
                url={rightUrl} 
                title={rightTitle} 
                label="📹 BIMBINGAN MANASIK" 
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
};
