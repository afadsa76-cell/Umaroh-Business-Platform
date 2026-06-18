/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  CloudUpload, 
  RefreshCw, 
  CheckCircle2, 
  FolderOpen, 
  AlertCircle, 
  Database, 
  Play, 
  LogOut, 
  Activity
} from 'lucide-react';
import { 
  signInToGoogleDrive, 
  getDriveAccessToken, 
  getDriveUser, 
  disconnectGoogleDrive, 
  verifyFolderAccessibility, 
  createFolder, 
  uploadFile, 
  convertToCSV, 
  parseBase64ToBlob,
  TARGET_MAIN_FOLDER_ID
} from '../../services/googleDriveService';
import { collection, getDocs, db } from '../../firebase';

export const GoogleDriveSyncView: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isFolderAccessible, setIsFolderAccessible] = useState<boolean | null>(null);
  
  // Backup configurations
  const [backupJamaah, setBackupJamaah] = useState<boolean>(true);
  const [backupBerkas, setBackupBerkas] = useState<boolean>(true);
  const [backupMitra, setBackupMitra] = useState<boolean>(true);
  const [backupBookings, setBackupBookings] = useState<boolean>(true);
  const [backupPaket, setBackupPaket] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('google_drive_auto_sync') === 'true';
  });

  // Sync process status
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('google_drive_last_sync') || 'Belum pernah';
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Check login state on load
  useEffect(() => {
    const token = getDriveAccessToken();
    const user = getDriveUser();
    if (token && user) {
      setIsConnected(true);
      setGoogleUser(user);
      checkFolderAccess();
    }
  }, []);

  // Scroll terminal logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [syncLogs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    setSyncLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleLogin = async () => {
    try {
      setIsVerifying(true);
      const res = await signInToGoogleDrive();
      if (res) {
        setIsConnected(true);
        setGoogleUser(res.user);
        addLog('Koneksitas Google Drive berhasil dibangun!');
        
        // Verify folder right after login
        const access = await verifyFolderAccessibility(TARGET_MAIN_FOLDER_ID);
        setIsFolderAccessible(access);
        if (access) {
          addLog('Folder Bersama berhasil diidentifikasi.');
        } else {
          addLog('Peringatan: Folder bersama Marawa tidak dapat dibuka. Gunakan folder root untuk inisiasi.');
        }
      }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal terhubung ke Google Drive: ${error.message || error}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const checkFolderAccess = async () => {
    setIsVerifying(true);
    try {
      const access = await verifyFolderAccessibility(TARGET_MAIN_FOLDER_ID);
      setIsFolderAccessible(access);
    } catch {
      setIsFolderAccessible(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan integrasi Google Drive?')) {
      disconnectGoogleDrive();
      setIsConnected(false);
      setGoogleUser(null);
      setIsFolderAccessible(null);
      addLog('Akses Google Drive telah diputus.');
    }
  };

  const handleAutoSyncToggle = () => {
    const newVal = !autoSync;
    setAutoSync(newVal);
    localStorage.setItem('google_drive_auto_sync', String(newVal));
    addLog(`Sinkronisasi otomatis di-${newVal ? 'aktifkan' : 'non-aktifkan'}.`);
  };

  const runBackup = async () => {
    const confirmBackup = window.confirm(
      'Mulai pencadangan semua data penting (Jamaah, Mitra, Dokumen) ke Google Drive?'
    );
    if (!confirmBackup) return;

    setIsSyncing(true);
    setSyncProgress(5);
    setSyncLogs([]);
    addLog('🚀 Memulai pencadangan total sistem...');

    try {
      // 1. Inisiasi Folder Backup Utama
      const parentFolderId = TARGET_MAIN_FOLDER_ID;
      addLog(`Memverifikasi folder tujuan utama: ${parentFolderId}...`);
      
      const isTargetValid = await verifyFolderAccessibility(parentFolderId);
      if (!isTargetValid) {
        addLog('⚠️ Folder utama dari link tidak dapat diakses atau Anda tidak memiliki hak menulis.');
        addLog('Menggunakan folder default Google Drive MyDrive...');
      }

      // 2. Buat subfolder pencadangan dengan timestamp agar teratur
      const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      const backupFolderName = `Backup_Umrah_ERP_${timestamp}`;
      addLog(`Membuat folder pencadangan baru: "${backupFolderName}"...`);
      setSyncProgress(15);

      const currentBackupFolderId = await createFolder(backupFolderName, isTargetValid ? parentFolderId : undefined);
      addLog(`✅ Folder pencadangan berhasil dibuat! ID: ${currentBackupFolderId}`);
      setSyncProgress(25);

      // 3. Backup Data Jemaah (tracker_jamaah)
      if (backupJamaah) {
        addLog('Mengambil data jemaah dari database...');
        const snap = await getDocs(collection(db, 'tracker_jamaah'));
        const jamaahList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (jamaahList.length > 0) {
          addLog(`Ditemukan ${jamaahList.length} data jemaah. Mengonversi ke CSV...`);
          const csvText = convertToCSV(jamaahList);
          addLog('Mengunggah "Data_Jamaah.csv" ke Google Drive...');
          await uploadFile('Data_Jamaah.csv', 'text/csv', csvText, currentBackupFolderId);
          addLog('✅ CSV Data Jemaah berhasil diunggah.');
        } else {
          addLog('ℹ️ Tidak ada data jemaah untuk dicadangkan.');
        }
      }
      setSyncProgress(40);

      // 4. Backup Data Pendaftaran Mitra & Agen (pendaftaran_mitra & users)
      if (backupMitra) {
        addLog('Mengambil data kemitraan dari database...');
        const snapMitra = await getDocs(collection(db, 'pendaftaran_mitra'));
        const mitraList = snapMitra.docs.map(d => ({ id: d.id, ...d.data() }));

        const snapUsers = await getDocs(collection(db, 'users'));
        const userList = snapUsers.docs.map(d => ({ id: d.id, ...d.data() }));

        if (mitraList.length > 0) {
          addLog(`Ditemukan ${mitraList.length} aplikasi kemitraan. Mengonversi ke CSV...`);
          const csvText = convertToCSV(mitraList);
          await uploadFile('Daftar_Pendaftaran_Mitra.csv', 'text/csv', csvText, currentBackupFolderId);
          addLog('✅ CSV Pendaftaran Mitra berhasil dicadangkan.');
        }

        if (userList.length > 0) {
          addLog(`Ditemukan ${userList.length} daftar pengguna sistem. Mengonversi ke CSV...`);
          const csvTextUsers = convertToCSV(userList);
          await uploadFile('Daftar_Pengguna_Sistem.csv', 'text/csv', csvTextUsers, currentBackupFolderId);
          addLog('✅ CSV Pengguna & Mitra Aktif berhasil dicadangkan.');
        }
      }
      setSyncProgress(55);

      // 5. Backup Bookings & Transaksi Keuangan
      if (backupBookings) {
        addLog('Mengambil data transaksi dan tiket bookings...');
        const snapBookings = await getDocs(collection(db, 'bookings'));
        const bookingList = snapBookings.docs.map(d => ({ id: d.id, ...d.data() }));

        const snapTrans = await getDocs(collection(db, 'transactions'));
        const transList = snapTrans.docs.map(d => ({ id: d.id, ...d.data() }));

        if (bookingList.length > 0) {
          addLog(`Ditemukan ${bookingList.length} riwayat pemesanan/pack. Mengonversi ke CSV...`);
          const csvBookings = convertToCSV(bookingList);
          await uploadFile('Daftar_Bookings_Pemesanan.csv', 'text/csv', csvBookings, currentBackupFolderId);
          addLog('✅ CSV Daftar Booking berhasil dicadangkan.');
        }

        if (transList.length > 0) {
          addLog(`Ditemukan ${transList.length} mutasi invoice transaksi keuangan. Mengonversi ke CSV...`);
          const csvTrans = convertToCSV(transList);
          await uploadFile('Mutasi_Transaksi_Keuangan.csv', 'text/csv', csvTrans, currentBackupFolderId);
          addLog('✅ CSV Mutasi Transaksi berhasil dicadangkan.');
        }
      }
      setSyncProgress(70);

      // 6. Katalog Paket Master (paket_master)
      if (backupPaket) {
        addLog('Mengambil katalog paket perjalanan umrah...');
        const snapMaster = await getDocs(collection(db, 'paket_master'));
        const listMaster = snapMaster.docs.map(d => ({ id: d.id, ...d.data() }));

        if (listMaster.length > 0) {
          const csvText = convertToCSV(listMaster);
          await uploadFile('Katalog_Paket_Master.csv', 'text/csv', csvText, currentBackupFolderId);
          addLog('✅ CSV Katalog Paket Master berhasil dicadangkan.');
        }
      }
      setSyncProgress(80);

      // 7. Unggah Berkas Jemaah (KTP & Paspor scans)
      if (backupBerkas) {
        addLog('Mendeteksi lampiran digital jemaah (Base64 file scans)...');
        const snap = await getDocs(collection(db, 'tracker_jamaah'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const filesToUpload: { name: string, base64: string }[] = [];
        docs.forEach((item: any) => {
          if (item.filePassport && String(item.filePassport).startsWith('data:')) {
            filesToUpload.push({
              name: `PASPOR_${item.namaLengkap || 'TANPA_NAMA'}_${item.id}.jpg`,
              base64: item.filePassport
            });
          }
          if (item.fileKtp && String(item.fileKtp).startsWith('data:')) {
            filesToUpload.push({
              name: `KTP_${item.namaLengkap || 'TANPA_NAMA'}_${item.id}.jpg`,
              base64: item.fileKtp
            });
          }
          if (item.fileVaccine && String(item.fileVaccine).startsWith('data:')) {
            filesToUpload.push({
              name: `VAKSIN_${item.namaLengkap || 'TANPA_NAMA'}_${item.id}.jpg`,
              base64: item.fileVaccine
            });
          }
        });

        if (filesToUpload.length > 0) {
          addLog(`Menemukan total ${filesToUpload.length} berkas digital jemaah. Membuat subfolder "Berkas_Dokumen_Jemaah"...`);
          const docsFolderId = await createFolder('Berkas_Dokumen_Jemaah', currentBackupFolderId);
          
          for (let i = 0; i < filesToUpload.length; i++) {
            const fileItem = filesToUpload[i];
            addLog(`[${i+1}/${filesToUpload.length}] Mengunggah lampiran "${fileItem.name}"...`);
            const blob = parseBase64ToBlob(fileItem.base64);
            if (blob) {
              await uploadFile(fileItem.name, blob.type, blob, docsFolderId);
              addLog(`   -> Sukses.`);
            } else {
              addLog(`   -> Lampiran rusak, dilewati.`);
            }
            
            // Staggered progress update
            const progressRange = 80 + Math.ceil((i / filesToUpload.length) * 18);
            setSyncProgress(progressRange);
          }
          addLog('✅ Semua lampiran berkas digital jemaah berhasil disinkronkan.');
        } else {
          addLog('ℹ️ Tidak ditemukan berkas jemaah digital (Base64) di database.');
        }
      }

      setSyncProgress(100);
      const currentTimeStr = new Date().toLocaleString('id-ID');
      setLastSyncTime(currentTimeStr);
      localStorage.setItem('google_drive_last_sync', currentTimeStr);
      addLog('🎉 PENCADANGAN TOTAL SELESAI DENGAN SUKSES!');
      addLog(`Semua data tersimpan dengan rapi di Google Drive di dalam folder "${backupFolderName}".`);
    } catch (err: any) {
      console.error(err);
      addLog(`❌ KESALAHAN INTEGRASI: ${err.message || err}`);
      alert(`Cadangan gagal: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm max-w-5xl mx-auto my-6" id="google-drive-sync-panel">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm">
            <Cloud className="w-8 h-8 animate-pulse text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Google Drive Auto-Backup
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sinkronisasikan seluruh database pendaftar, data mitra, berkas fisik KTP/Paspor secara instan ke cloud penyimpanan Google Drive.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Terakhir Backup:</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
            {lastSyncTime}
          </span>
        </div>
      </div>

      {/* Target Folder Banner */}
      <div className="mb-6 bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <FolderOpen className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Folder Backup Bersama (Target)</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Seluruh data akan dicadangkan langsung ke folder Google Drive bersama Anda:
            </p>
            <code className="block mt-1 p-1 px-2.5 bg-white border border-amber-100 text-[10px] rounded-lg font-mono text-amber-700 select-all truncate max-w-full">
              {TARGET_MAIN_FOLDER_ID}
            </code>
          </div>
        </div>

        <a 
          href={`https://drive.google.com/drive/folders/${TARGET_MAIN_FOLDER_ID}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-2 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100/40 font-bold text-xs py-2 px-4 rounded-xl transition duration-150 shadow-sm text-center"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Buka Folder Drive
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection & Options */}
        <div className="lg:col-span-1 space-y-6">
          {/* Connection Status Box */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Status Koneksi Cloud</h3>

            {!isConnected ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500 leading-normal">
                    Belum terhubung ke akun Google. Hubungkan akun Anda untuk mengaktifkan sinkronisasi otomatis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isVerifying}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white font-extrabold text-xs uppercase rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer active:scale-95"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menghubungkan...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      Hubungkan Google Drive
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 leading-tight">Terhubung ke Google Drive</h5>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-none">
                      {googleUser?.email || 'Akun Aktif'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs py-2 px-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Izin Menulis Folder:</span>
                  <span className={`font-black ${isFolderAccessible ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {isFolderAccessible === null ? 'Memeriksa...' : isFolderAccessible ? '🟢 AKTIF & AMAN' : '🔴 TIDAK ADA AKSES'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-gray-200 hover:bg-rose-50 hover:border-rose-100 text-gray-600 hover:text-rose-600 font-bold text-[11px] uppercase rounded-xl transition shadow-sm cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Putus Hubungan
                </button>
              </div>
            )}
          </div>

          {/* Backup Configurations */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Parameter Cadangan</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-1">
                <input 
                  type="checkbox" 
                  checked={backupJamaah} 
                  onChange={e => setBackupJamaah(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-200"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Daftar Jamaah & Status</span>
                  <span className="text-[10px] text-gray-400">Pendaftaran & status logistik koper</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-1">
                <input 
                  type="checkbox" 
                  checked={backupBerkas} 
                  onChange={e => setBackupBerkas(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-200"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Unggahan Berkas Jemaah</span>
                  <span className="text-[10px] text-gray-400">Auto konversi Base64 paspor/KTP ke JPG</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-1">
                <input 
                  type="checkbox" 
                  checked={backupMitra} 
                  onChange={e => setBackupMitra(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-200"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Pendaftaran Mitra & Network</span>
                  <span className="text-[10px] text-gray-400">Data agen penjualan, upline/downline</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-1">
                <input 
                  type="checkbox" 
                  checked={backupBookings} 
                  onChange={e => setBackupBookings(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-200"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Riwayat Transaksi Keuangan</span>
                  <span className="text-[10px] text-gray-400">Invoices, mutasi, dan pembayaran bookings</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-1">
                <input 
                  type="checkbox" 
                  checked={backupPaket} 
                  onChange={e => setBackupPaket(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-gray-200"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Katalog Paket Perjalanan</span>
                  <span className="text-[10px] text-gray-400">Paket master ERP aktif</span>
                </div>
              </label>
            </div>

            {/* Auto Backup Toggle */}
            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-800 block">Sinkronisasi Real-time</span>
                <span className="text-[10px] text-gray-400">Simulasikan cadangan berkala</span>
              </div>
              <button 
                type="button" 
                onClick={handleAutoSyncToggle}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-250 cursor-pointer ${autoSync ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-250 ${autoSync ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Runner Terminal & Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[450px]">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Konsol Status Pencadangan</h3>
              </div>

              {isConnected && (
                <button
                  type="button"
                  onClick={runBackup}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-extrabold text-xs uppercase rounded-xl shadow-md shadow-emerald-600/10 transition cursor-pointer active:scale-95 shrink-0"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Proses Backup...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Mulai Backup Sekarang
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Console Log Terminal Screen */}
            <div className="flex-grow bg-slate-950 p-4 rounded-2xl font-mono text-[11px] text-emerald-400/90 leading-relaxed overflow-y-auto h-80 flex flex-col shadow-inner">
              <div className="flex-grow space-y-1.5">
                {syncLogs.length === 0 ? (
                  <div className="text-slate-500 h-full flex flex-col items-center justify-center text-center p-8">
                    <Database className="w-10 h-10 mb-3 opacity-30 text-slate-400" />
                    <p>Status Konsol Siap.</p>
                    <p className="text-[10px] mt-1 opacity-75">
                      {isConnected 
                        ? 'Klik tombol "Mulai Backup Sekarang" diatas untuk mentransfer seluruh berkas CSV & lampiran fisik ke Google Drive.'
                        : 'Hubungkan akun Google Anda terlebih dahulu untuk memulai backup.'}
                    </p>
                  </div>
                ) : (
                  syncLogs.map((log, idx) => {
                    let colorClass = 'text-emerald-400/95';
                    if (log.includes('🔴') || log.includes('❌') || log.includes('error') || log.includes('failed')) {
                      colorClass = 'text-rose-400 font-bold';
                    } else if (log.includes('⚠️') || log.includes('Peringatan')) {
                      colorClass = 'text-amber-300';
                    } else if (log.includes('✅') || log.includes('🎉')) {
                      colorClass = 'text-sky-300 font-extrabold';
                    } else if (log.includes('🚀')) {
                      colorClass = 'text-indigo-300 font-black';
                    }
                    return (
                      <div key={idx} className={`${colorClass} hover:bg-slate-900 px-1 py-0.5 rounded transition`}>
                        {log}
                      </div>
                    );
                  })
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Sync Progress Bar */}
            {isSyncing && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1.5 px-0.5">
                  <span>Mentransfer Berkas ke Google Drive...</span>
                  <span className="text-indigo-600">{syncProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 animate-pulse"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Auto Simulation Informational footer */}
            {autoSync && !isSyncing && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between gap-3 text-indigo-950">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mode Real-time Aktif</span>
                </div>
                <span className="text-[10px] opacity-80 leading-normal text-right">
                  Pencadangan berkas otomatis di latar belakang disimulasikan setiap data baru disimpan.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
