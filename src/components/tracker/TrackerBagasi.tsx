import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  db, 
  handleFirestoreError, 
  OperationType 
} from '../../firebase';
import { 
  Barcode, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  PlaneTakeoff, 
  Luggage, 
  UserCheck
} from 'lucide-react';
import { PaketTracker, JamaahTracker, KeberangkatanTracker } from './types';

// Types inside file to prevent import path complexities
interface BaggageItem {
  id: string; // Barcode ID (e.g., BAGG-PK01-002)
  paketId: string;
  bagType: 'check-in' | 'cabin';
  status: 'REGISTERED' | 'ARRIVED_DESTINATION';
  registeredAt: string;
  arrivedAt?: string;
  scannedBy: string;
  jamaahNama?: string;
}

interface MitraTrackerBaggage {
  id: string;
  nama_brand?: string;
  nama_mitra?: string;
  paket_umroh?: string;
  tanggal_berangkat?: string;
  jumlah_seat?: number;
  status_keberangkatan?: string;
}

interface PaketMasterBaggage {
  id: string;
  nama?: string;
  nama_paket?: string;
  tglBerangkat?: string;
  tanggalBerangkat?: string;
  tanggal_berangkat?: string;
}

interface CostComponentBaggage {
  id: string;
  nama_komponen?: string;
  kategori_komponen?: string;
  package_id?: string;
  qty?: number;
  qty_used?: number;
  status_operasional?: string;
  seat_block?: number;
  tgl_keberangkatan?: string;
}

interface GroupedPaketTracker extends PaketTracker {
  constituentIds?: string[];
}

interface TrackerBagasiProps {
  paketIdProp?: string;
  defaultOperator?: string;
}

export const TrackerBagasi: React.FC<TrackerBagasiProps> = ({ paketIdProp, defaultOperator }) => {
  const [pakets, setPakets] = useState<PaketTracker[]>([]);
  const [selectedPaketId, setSelectedPaketId] = useState<string>(paketIdProp || '');
  const [jamaahs, setJamaahs] = useState<JamaahTracker[]>([]);
  const [keberangkatan, setKeberangkatan] = useState<KeberangkatanTracker | null>(null);
  const [baggages, setBaggages] = useState<BaggageItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'scanner' | 'daftar' | 'cetak'>('status');

  // Integrasi dwi-fungsi tracker eksternal (Mitra Tracker dan Vendor Tracker)
  const [mitraTrackers, setMitraTrackers] = useState<MitraTrackerBaggage[]>([]);
  const [paketMasters, setPaketMasters] = useState<PaketMasterBaggage[]>([]);
  const [costComponents, setCostComponents] = useState<CostComponentBaggage[]>([]);

  // Scanning States
  const [manualCode, setManualCode] = useState<string>('');
  const [scanType, setScanType] = useState<'check-in' | 'cabin'>('check-in');
  const [currentScanStep, setCurrentScanStep] = useState<'boarding' | 'unboarding'>('boarding');
  const [scannedBy, setScannedBy] = useState<string>(defaultOperator || 'Tour Leader');
  const [simNameTag, setSimNameTag] = useState<string>('');
  
  // Custom alerts/status feedback
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [scannerFocused, setScannerFocused] = useState<boolean>(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Print Settings
  const [printQty, setPrintQty] = useState<number>(30);
  const [printStartNum, setPrintStartNum] = useState<number>(1);

  // Live Camera Scanner States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (paketIdProp) {
      setSelectedPaketId(paketIdProp);
    }
  }, [paketIdProp]);

  // Load Packages (Groups)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tracker_paket'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaketTracker));
      setPakets(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tracker_paket');
    });
    return () => unsub();
  }, [paketIdProp]);

  // Sinkronisasi data real-time dengan mitra_tracker, paket_master, dan cost components vendor
  useEffect(() => {
    const unsubMitra = onSnapshot(collection(db, 'mitra_tracker'), (snapshot) => {
      setMitraTrackers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Gagal berlangganan data mitra_tracker", error);
    });

    const unsubMasters = onSnapshot(collection(db, 'paket_master'), (snapshot) => {
      setPaketMasters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Gagal berlangganan data paket_master", error);
    });

    const unsubCosts = onSnapshot(collection(db, 'package_cost_components'), (snapshot) => {
      setCostComponents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Gagal berlangganan data vendor cost components", error);
    });

    return () => {
      unsubMitra();
      unsubMasters();
      unsubCosts();
    };
  }, []);

  // Menggabungkan seluruh paket, menyesuaikan jumlah kursi (pax) real-time secara dinamis
  const computedUnifiedPakets = useMemo<GroupedPaketTracker[]>(() => {
    const rawList: {
      id: string;
      namaPaket: string;
      tanggalBerangkat: string;
      status: string;
      targetJamaah: number;
      terdaftar: number;
      paketMasterId?: string;
      checklist?: PaketTracker['checklist'];
    }[] = [];

    // 1. Tambahkan paket internal standard dari tracker_paket
    pakets.forEach(p => {
      // Temukan dokumen mitra_tracker yang bersesuaian guna menyelaraskan jumlah kursi booking
      const matchingMitras = mitraTrackers.filter(m => {
        const titleMatch = m.paket_umroh?.toLowerCase().includes(p.namaPaket.toLowerCase()) ||
                           p.namaPaket.toLowerCase().includes(m.paket_umroh?.toLowerCase() || '');
        const dateMatch = m.tanggal_berangkat && p.tanggalBerangkat && m.tanggal_berangkat === p.tanggalBerangkat;
        return titleMatch || dateMatch;
      });

      // Temukan komponen vendor (Airlines block seat) yang bersesuaian guna menyerap kuota kursi vendor
      const matchingVendors = costComponents.filter(c => {
        const idMatch = c.package_id && p.paketMasterId && c.package_id === p.paketMasterId;
        const nameMatch = c.nama_komponen?.toLowerCase().includes(p.namaPaket.toLowerCase()) ||
                          c.nama_komponen?.toLowerCase().includes('all packages');
        const dateMatch = c.tgl_keberangkatan && p.tanggalBerangkat && c.tgl_keberangkatan === p.tanggalBerangkat;
        return idMatch || (c.kategori_komponen === 'Airlines' && (nameMatch || dateMatch));
      });

      // Akumulasikan total seat dari para Mitra Agen
      const mitraSeatSum = matchingMitras.reduce((sum, m) => sum + (m.jumlah_seat || 0), 0);

      // Ambil kapasitas blok kursi maskapai tertinggi dari vendor logistik
      const vendorSeatSum = matchingVendors
        .filter(c => c.kategori_komponen === 'Airlines')
        .reduce((max, c) => Math.max(max, c.seat_block || c.qty || 0), 0);

      // Pilih kapasitas Pax tepercaya (nilai maksimum diantara data internal, jumlah booking mitra, atau block vendor)
      const finalPax = Math.max(p.terdaftar || 0, mitraSeatSum || 0, vendorSeatSum || 0);

      rawList.push({
        ...p,
        terdaftar: finalPax > 0 ? finalPax : (p.terdaftar || 0)
      });
    });

    // 2. Tambahkan paket-paket dari Tracker Mitra yang belum terdaftar di internal
    mitraTrackers.forEach(m => {
      if (!m.paket_umroh) return;

      // Skip jika paket atau sub-booking ini sudah terabsorb di internal
      const matchesAnyInternal = pakets.some(p => {
        const titleMatch = m.paket_umroh?.toLowerCase().includes(p.namaPaket.toLowerCase()) ||
                           p.namaPaket.toLowerCase().includes(m.paket_umroh?.toLowerCase() || '');
        const dateMatch = m.tanggal_berangkat && p.tanggalBerangkat && m.tanggal_berangkat === p.tanggalBerangkat;
        return titleMatch || dateMatch;
      });

      if (!matchesAnyInternal) {
        rawList.push({
          id: m.id,
          namaPaket: m.paket_umroh,
          tanggalBerangkat: m.tanggal_berangkat || '',
          status: 'Booking Seat',
          targetJamaah: m.jumlah_seat || 45,
          terdaftar: m.jumlah_seat || 0,
          checklist: {
            pasporTerkumpul: 0,
            meningitisTerkumpul: 0,
            biometrikSelesai: 0,
            ktpKkTerkumpul: 0,
            dpMasuk: 0,
            pelunasanMasuk: 0,
            statusTiket: m.status_keberangkatan === 'Aman' ? 'Issued' : 'Pending',
            statusHotelMakkah: 'Pending',
            statusHotelMadinah: 'Pending',
            statusVisa: 'Pending',
            statusBus: 'Pending',
            koperDibagikan: 0,
            statusManasik: 'Pending',
            statusSiskopatuh: 'Pending'
          }
        });
      }
    });

    // 3. Tambahkan paket-paket kuota Vendor Master (paket_master) yang belum terdaftar di internal
    paketMasters.forEach(pm => {
      const pName = pm.nama || pm.nama_paket || pm.id;
      if (!pName) return;
      
      const matchesAnyInternal = pakets.some(p => {
        const nameMatch = pName.toLowerCase().includes(p.namaPaket.toLowerCase()) || 
                          p.namaPaket.toLowerCase().includes(pName.toLowerCase());
        const idMatch = p.paketMasterId && p.paketMasterId === pm.id;
        return nameMatch || idMatch;
      });

      if (!matchesAnyInternal) {
        // Cari alokasi block penerbangan jika ada
        const relatedCosts = costComponents.filter(c => c.package_id === pm.id);
        const airlineSeatSum = relatedCosts
          .filter(c => c.kategori_komponen === 'Airlines')
          .reduce((max, c) => Math.max(max, c.seat_block || c.qty || 0), 0);
        
        const totalPax = airlineSeatSum || 30;

        rawList.push({
          id: pm.id,
          paketMasterId: pm.id,
          namaPaket: pName,
          tanggalBerangkat: pm.tglBerangkat || pm.tanggal_berangkat || pm.tanggalBerangkat || '',
          status: 'Persiapan',
          targetJamaah: totalPax,
          terdaftar: totalPax,
          checklist: {
            pasporTerkumpul: 0,
            meningitisTerkumpul: 0,
            biometrikSelesai: 0,
            ktpKkTerkumpul: 0,
            dpMasuk: 0,
            pelunasanMasuk: 0,
            statusTiket: 'Pending',
            statusHotelMakkah: 'Pending',
            statusHotelMadinah: 'Pending',
            statusVisa: 'Pending',
            statusBus: 'Pending',
            koperDibagikan: 0,
            statusManasik: 'Pending',
            statusSiskopatuh: 'Pending'
          }
        });
      }
    });

    // Helper untuk membersihkan prefix kurung siku jika ada
    const cleanName = (n: string) => {
      if (!n) return 'Paket Umroh Tanpa Nama';
      const s = n.replace(/^\[[^\]]+\]\s*/i, '');
      return s.trim() || 'Paket Umroh Tanpa Nama';
    };

    // 4. Lakukan pengelompokan (grouping) dinamis berasaskan NAMA PAKET yang telah dibersihkan
    const groupsMap: { [key: string]: GroupedPaketTracker } = {};

    rawList.forEach(item => {
      const displayLabel = cleanName(item.namaPaket);
      const key = displayLabel.toLowerCase();

      if (!groupsMap[key]) {
        groupsMap[key] = {
          id: item.id,
          namaPaket: displayLabel,
          tanggalBerangkat: item.tanggalBerangkat,
          status: (item.status as PaketTracker['status']) || 'Persiapan',
          targetJamaah: item.targetJamaah,
          terdaftar: item.terdaftar,
          checklist: item.checklist,
          constituentIds: [item.id]
        };
        if (item.paketMasterId) {
          groupsMap[key].paketMasterId = item.paketMasterId;
        }
      } else {
        const group = groupsMap[key];
        group.terdaftar += item.terdaftar;
        group.targetJamaah = Math.max(group.targetJamaah, item.targetJamaah);
        if (!group.tanggalBerangkat && item.tanggalBerangkat) {
          group.tanggalBerangkat = item.tanggalBerangkat;
        }
        if (group.constituentIds && !group.constituentIds.includes(item.id)) {
          group.constituentIds.push(item.id);
        }
      }
    });

    return Object.values(groupsMap);
  }, [pakets, mitraTrackers, paketMasters, costComponents]);

  // Set-up inisialisasi pilihan rombongan terpilih pertama kali
  useEffect(() => {
    if (computedUnifiedPakets.length > 0 && !selectedPaketId && !paketIdProp) {
      setSelectedPaketId(computedUnifiedPakets[0].id);
    }
  }, [computedUnifiedPakets, selectedPaketId, paketIdProp]);

  // Selected Group's relative information and baggages
  useEffect(() => {
    if (!selectedPaketId) {
      setBaggages([]);
      setJamaahs([]);
      setKeberangkatan(null);
      return;
    }

    const targetGroup = computedUnifiedPakets.find(p => p.id === selectedPaketId);
    const ids = targetGroup?.constituentIds && targetGroup.constituentIds.length > 0
      ? targetGroup.constituentIds
      : [selectedPaketId];

    // Load Group's Jamaah to match name tags
    const qJamaah = query(collection(db, 'tracker_jamaah'), where('paketId', 'in', ids));
    const unsubJamaah = onSnapshot(qJamaah, (snapshot) => {
      setJamaahs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JamaahTracker)));
    });

    // Load flight details if any
    const qKeberangkatan = query(collection(db, 'tracker_keberangkatan'), where('paketId', 'in', ids));
    const unsubFlight = onSnapshot(qKeberangkatan, (snapshot) => {
      const flights = snapshot.docs.map(doc => doc.data() as KeberangkatanTracker);
      setKeberangkatan(flights.length > 0 ? flights[0] : null);
    });

    // Load Baggages
    const qBaggage = query(collection(db, 'tracker_bagasi'), where('paketId', 'in', ids));
    const unsubBaggage = onSnapshot(qBaggage, (snapshot) => {
      setBaggages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaggageItem)));
    }, (error) => {
      console.warn("Baggage read denied or offline. Working with local representation.", error);
    });

    return () => {
      unsubJamaah();
      unsubFlight();
      unsubBaggage();
    };
  }, [selectedPaketId, computedUnifiedPakets]);

  const selectedPaket = computedUnifiedPakets.find(p => p.id === selectedPaketId);

  // Sound generator helper for pleasant barcode scan beep!
  const playBeep = (freq: number = 880, duration: number = 0.12) => {
    try {
      const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      console.warn("Beep audio blocked by browser safety context.", err);
    }
  };

  // Keep focus on hidden input for physical USB scanner gun
  useEffect(() => {
    if (activeSubTab === 'scanner' && scannerFocused && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [activeSubTab, scannerFocused]);

  const handleUSBScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processBarcodeScan(manualCode.trim());
    setManualCode('');
  };

  // Master controller for processing barcode scans
  const processBarcodeScan = async (code: string) => {
    if (!selectedPaketId) {
      setScanStatus({ type: 'error', msg: 'Mohon pilih rombongan paket terlebih dahulu.' });
      playBeep(440, 0.3); // Low buzzer error tone
      return;
    }

    const sanitizedCode = code.toUpperCase().trim();
    
    // Core format validator: BAGG-XXX-NNN
    if (!sanitizedCode.startsWith('BAGG-')) {
      setScanStatus({ type: 'error', msg: `Barcode salah format [${sanitizedCode}]. Format harus BAGG-XXXX-NNN` });
      playBeep(440, 0.3);
      return;
    }

    try {
      const existingBag = baggages.find(b => b.id === sanitizedCode);

      if (currentScanStep === 'boarding') {
        // Mode 1: Registrasi di Bandara Asal (Boarding)
        if (existingBag) {
          setScanStatus({ type: 'error', msg: `Bagasi ${sanitizedCode} sudah terdaftar sebelumnya di bandara keberangkatan.` });
          playBeep(550, 0.25);
          return;
        }

        const newBag: BaggageItem = {
          id: sanitizedCode,
          paketId: selectedPaketId,
          bagType: scanType,
          status: 'REGISTERED',
          registeredAt: new Date().toISOString(),
          scannedBy: scannedBy,
          jamaahNama: simNameTag || undefined
        };

        await setDoc(doc(db, 'tracker_bagasi', sanitizedCode), newBag);
        setScanStatus({ type: 'success', msg: `BERHASIL DAFTAR: ${sanitizedCode} (${scanType === 'check-in' ? 'Bagasi Koper' : 'Kabin carry-on'})` });
        playBeep(1000, 0.1); 
        setSimNameTag(''); // Reset simulated nametag input
      } else {
        // Mode 2: Verifikasi Kedatangan di Tujuan (Unboarding / Destination Check)
        if (!existingBag) {
          // Auto register as check-in first if it wasn't scanned at origin (Airport error fallback)
          const newVerifiedBag: BaggageItem = {
            id: sanitizedCode,
            paketId: selectedPaketId,
            bagType: scanType,
            status: 'ARRIVED_DESTINATION',
            registeredAt: new Date().toISOString(),
            arrivedAt: new Date().toISOString(),
            scannedBy: scannedBy,
            jamaahNama: simNameTag || undefined
          };
          await setDoc(doc(db, 'tracker_bagasi', sanitizedCode), newVerifiedBag);
          setScanStatus({ type: 'success', msg: `TIBA & VERIFIKASI SEKETIKA: ${sanitizedCode} (tidak sempat diskor di awal)` });
          playBeep(1100, 0.15);
        } else {
          // Bag exists, check if already verified at destination
          if (existingBag.status === 'ARRIVED_DESTINATION') {
            setScanStatus({ type: 'success', msg: `Koper ${sanitizedCode} sudah diverifikasi aman di pos kedatangan.` });
            playBeep(880, 0.08);
          } else {
            // Update to ARRIVED
            const updatedBag: BaggageItem = {
              ...existingBag,
              status: 'ARRIVED_DESTINATION',
              arrivedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'tracker_bagasi', sanitizedCode), updatedBag);
            setScanStatus({ type: 'success', msg: `SELESAI VERIFIKASI TIBA: ${sanitizedCode} (${existingBag.bagType === 'check-in' ? 'Bagasi Koper' : 'Kabin'})` });
            playBeep(1200, 0.1);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setScanStatus({ type: 'error', msg: 'Gagal mengupdate database bagasi.' });
    }
  };

  // Manage Html5Qrcode camera stream lifecycle
  useEffect(() => {
    let htQr: Html5Qrcode | null = null;
    let isMounted = true;

    if (isCameraActive && activeSubTab === 'scanner') {
      const initAndStart = async () => {
        try {
          setCameraError('');
          // Let screen render first
          await new Promise((r) => setTimeout(r, 200));
          if (!isMounted) return;

          const readerId = "reader-camera";
          const el = document.getElementById(readerId);
          if (!el) {
            console.warn("Camera container element not found yet, retrying");
            return;
          }

          htQr = new Html5Qrcode(readerId);
          html5QrCodeRef.current = htQr;

          const config = {
            fps: 15,
            qrbox: (w: number, h: number) => {
              const limit = Math.min(w, h);
              const size = Math.floor(limit * 0.75);
              return { width: size, height: Math.floor(size * 0.6) };
            },
          };

          const handleScanSuccess = (decodedText: string) => {
            // Beep sound
            playBeep(880, 0.12);
            
            const sanitized = decodedText.trim();
            processBarcodeScan(sanitized);

            setScanStatus({
              type: 'success',
              msg: `✓ Barcode [${sanitized.toUpperCase()}] berhasil dideteksi!`
            });

            // Auto clear success alert after 3 seconds
            setTimeout(() => {
              if (isMounted) {
                setScanStatus(p => p.msg?.includes(sanitized) ? { type: null, msg: '' } : p);
              }
            }, 3000);
          };

          try {
            // Priority 1: Environment (Back camera)
            await htQr.start(
              { facingMode: "environment" },
              config,
              handleScanSuccess,
              () => {}
            );
          } catch (errEnvironment) {
            console.warn("Could not start with environment camera, trying user camera", errEnvironment);
            if (!isMounted) return;
            
            try {
              // Priority 2: User (Front camera as fallback)
              await htQr.start(
                { facingMode: "user" },
                config,
                handleScanSuccess,
                () => {}
              );
            } catch (errUser) {
              console.warn("Could not start with user camera, enumerating devices", errUser);
              if (!isMounted) return;
              
              // Priority 3: Grab any listed camera device
              const devices = await Html5Qrcode.getCameras().catch(() => []);
              if (devices && devices.length > 0) {
                // Choose the last device (often the primary back camera on modern multi-lens phones)
                const chosenDevice = devices[devices.length - 1];
                await htQr.start(
                  chosenDevice.id,
                  config,
                  handleScanSuccess,
                  () => {}
                );
              } else {
                throw new Error(
                  "Tidak menemukan hardware kamera di perangkat ini. " + (errUser instanceof Error ? errUser.message : String(errUser)),
                  { cause: errUser }
                );
              }
            }
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Camera setup failed:", err);
          if (isMounted) {
            setCameraError(errMsg || "Kamera tidak dapat diakses atau izin ditolak.");
            setIsCameraActive(false);
          }
        }
      };

      initAndStart();
    } else {
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        if (scanner.isScanning) {
          scanner.stop().then(() => {
            try {
              scanner.clear();
            } catch (errClear) {
              console.log("No scanner clear needed", errClear);
            }
          }).catch((e) => console.warn("Stop camera fail:", e));
        }
      }
    }

    return () => {
      isMounted = false;
      if (htQr) {
        try {
          if (htQr.isScanning) {
            htQr.stop().catch((e) => console.warn("Clean up on unmount fail:", e));
          }
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, [isCameraActive, activeSubTab]);

  // Quick Action Buttons
  const markAsArrived = async (bagId: string) => {
    const bagObj = baggages.find(b => b.id === bagId);
    if (!bagObj) return;
    try {
      await setDoc(doc(db, 'tracker_bagasi', bagId), {
        ...bagObj,
        status: 'ARRIVED_DESTINATION',
        arrivedAt: new Date().toISOString()
      });
      playBeep(1200, 0.08);
    } catch (error) {
      console.error(error);
    }
  };

  const removeBaggage = async (bagId: string) => {
    if (!confirm(`Hapus registrasi bagasi ${bagId}?`)) return;
    try {
      await deleteDoc(doc(db, 'tracker_bagasi', bagId));
      playBeep(350, 0.2);
    } catch (e) {
      console.error(e);
    }
  };

  // Statistics Computations
  const totalCheckInBase = baggages.filter(b => b.bagType === 'check-in').length;
  const totalCabinBase = baggages.filter(b => b.bagType === 'cabin').length;
  const arrivedCheckIn = baggages.filter(b => b.bagType === 'check-in' && b.status === 'ARRIVED_DESTINATION').length;
  const arrivedCabin = baggages.filter(b => b.bagType === 'cabin' && b.status === 'ARRIVED_DESTINATION').length;

  const checkInPercent = totalCheckInBase > 0 ? Math.round((arrivedCheckIn / totalCheckInBase) * 100) : 0;
  const cabinPercent = totalCabinBase > 0 ? Math.round((arrivedCabin / totalCabinBase) * 100) : 0;
  const grandTotalPercent = baggages.length > 0 ? Math.round((baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length / baggages.length) * 100) : 0;

  // Prefix generator based on package ID
  const getBaggagePrefix = () => {
    if (!selectedPaketId) return 'BAGG-PK00';
    const cleanId = selectedPaketId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
    return `BAGG-${cleanId.toUpperCase()}`;
  };

  // Mock generator of scanned barcodes for testing
  const triggerMockScan = (num: number, simulateAtDestination: boolean = false) => {
    const generatedCode = `${getBaggagePrefix()}-${String(num).padStart(3, '0')}`;
    const selectedJamaah = jamaahs[num % Math.max(1, jamaahs.length)];
    if (selectedJamaah) {
      setSimNameTag(selectedJamaah.namaLengkap);
    }
    
    // Set parameters
    setScanType(num % 3 === 0 ? 'cabin' : 'check-in');
    setCurrentScanStep(simulateAtDestination ? 'unboarding' : 'boarding');
    
    // Trigger
    processBarcodeScan(generatedCode);
  };

  // Generate label cards sheet layout helper
  const printSheetRef = useRef<HTMLDivElement>(null);
  const handlePrintLabels = () => {
    const printContent = printSheetRef.current?.innerHTML;
    if (!printContent) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert("Popup blocker menghalangi pencetakan label.");
      return;
    }
    
    newWindow.document.write(`
      <html>
        <head>
          <title>Cetak Barcode Label Group - ${selectedPaket?.namaPaket || 'Umaroh'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { padding: 0; margin: 0; }
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body class="bg-white p-6" onload="window.print();">
          <div class="max-w-4xl mx-auto">
            <h1 class="text-lg font-bold border-b pb-2 mb-6 text-gray-700">PRINT SHEET: ${selectedPaket?.namaPaket || 'GROUP'}</h1>
            ${printContent}
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6">
      
      {/* Dynamic Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
        <div>
          <span className="bg-indigo-50 text-indigo-750 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
            <Barcode className="w-3.5 h-3.5" /> Barcoding Group System
          </span>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Pelacakan Bagasi Berbasis Barcode Group</h2>
          <p className="text-sm text-gray-500 mt-1">Cetak satu barcode identitas per group, tempelkan ke bagasi bandara, scan, dan kalkulasi otomatis kesesuaian jumlah awal vs akhir.</p>
        </div>

        {/* Group Selector */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Rombongan:</span>
          <select 
            value={selectedPaketId}
            onChange={(e) => setSelectedPaketId(e.target.value)}
            className="flex-1 lg:flex-none py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-colors"
          >
            {computedUnifiedPakets.map(p => (
              <option key={p.id} value={p.id}>{p.namaPaket} ({p.terdaftar} Pax/Jamaah)</option>
            ))}
            {computedUnifiedPakets.length === 0 && <option value="">Belum ada paket tersedia</option>}
          </select>
        </div>
      </div>

      {/* Selected Group Quick Metadata Panel */}
      {selectedPaket && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150/60 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-750 p-2.5 rounded-lg shrink-0">
              <Luggage className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">ID PREFIX BARCODE</p>
              <p className="font-extrabold text-sm text-gray-800 uppercase mt-1">{getBaggagePrefix()}-XXX</p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t md:border-t-0 md:border-x border-gray-200 md:px-4">
            <div className="bg-amber-100 text-amber-700 p-2.5 rounded-lg shrink-0">
              <PlaneTakeoff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">LOGISTIK PENERBANGAN</p>
              <p className="font-bold text-xs text-gray-700 mt-1 truncate">
                {keberangkatan ? `${keberangkatan.maskapai} (${keberangkatan.nomorPenerbangan})` : 'Belum dimapping'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t md:border-t-0 border-gray-200 md:pl-2">
            <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-lg shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">PESERTA GROUP</p>
              <p className="font-extrabold text-sm text-gray-800 mt-1">{jamaahs.length} Jamaah terdaftar</p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-gray-150 mb-6 font-medium text-xs">
        <button 
          onClick={() => setActiveSubTab('status')}
          className={`pb-3 px-4 uppercase tracking-wider font-extrabold transition-colors border-b-2 -mb-[2px] ${activeSubTab === 'status' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          📈 Status & Grafik Ringkasan
        </button>
        <button 
          onClick={() => {
            setActiveSubTab('scanner');
            // Enable visual simulator focus
            setScannerFocused(true);
          }}
          className={`pb-3 px-4 uppercase tracking-wider font-extrabold transition-colors border-b-2 -mb-[2px] ${activeSubTab === 'scanner' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          📷 Scan Barcode Simulator
        </button>
        <button 
          onClick={() => setActiveSubTab('daftar')}
          className={`pb-3 px-4 uppercase tracking-wider font-extrabold transition-colors border-b-2 -mb-[2px] ${activeSubTab === 'daftar' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          📂 Daftar Bagasi Terpindai ({baggages.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('cetak')}
          className={`pb-3 px-4 uppercase tracking-wider font-extrabold transition-colors border-b-2 -mb-[2px] ${activeSubTab === 'cetak' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          🖨️ Cetak Label Sticker
        </button>
      </div>

      {/* SUB-TAB 1: STATUS & CHART */}
      {activeSubTab === 'status' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Bento summary stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">TOTAL BAGASI TERDAFTAR</span>
                <div className="text-3xl font-black text-indigo-950 mt-1">{baggages.length}</div>
              </div>
              <p className="text-[10px] text-indigo-600 font-medium mt-3">Discan di bandara awal</p>
            </div>

            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">SELESAI VERIFIKASI TIBA</span>
                <div className="text-3xl font-black text-emerald-950 mt-1">
                  {baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length}
                </div>
              </div>
              <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-300" style={{ width: `${grandTotalPercent}%` }} />
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-2">{grandTotalPercent}% koper tiba selamat</p>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider">KOPER BAGASI PESAWAT</span>
                <div className="text-2xl font-black text-blue-950 mt-1">{arrivedCheckIn} <span className="text-xs text-blue-500 font-bold">dari {totalCheckInBase} koper</span></div>
              </div>
              <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${checkInPercent}%` }} />
              </div>
              <p className="text-[10px] text-blue-600 font-bold mt-2">{checkInPercent}% terverifikasi di tujuan</p>
            </div>

            <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-purple-700 font-extrabold uppercase tracking-wider">KOPER BAWAAN KABIN</span>
                <div className="text-2xl font-black text-purple-950 mt-1">{arrivedCabin} <span className="text-xs text-purple-500 font-bold">dari {totalCabinBase} koper</span></div>
              </div>
              <div className="w-full bg-purple-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full transition-all duration-300" style={{ width: `${cabinPercent}%` }} />
              </div>
              <p className="text-[10px] text-purple-600 font-bold mt-2">{cabinPercent}% terverifikasi di tujuan</p>
            </div>

          </div>

          {/* Verification Status Alerte Banner */}
          {baggages.length > 0 && (
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
              baggages.length === baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {baggages.length === baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {baggages.length === baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length
                    ? 'Status Kliring Rombongan: LENGKAP & AMAN (100%)'
                    : 'Menunggu Verifikasi Kliring Bagasi'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {baggages.length === baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length
                    ? 'Semua koper bawaan telah sampai dengan selamat di tujuan (Hotel/Sektor) tanpa ada kekurangan koper bawaan!'
                    : `Saat ini sebanyak ${baggages.filter(b => b.status === 'REGISTERED').length} koper belum diverifikasi kedatangannya di tujuan bandara / hotel. Silakan lakukan scanning kedatangan.`}
                </p>
              </div>
            </div>
          )}

          {/* Flow visual helper explaining the one-barcode per group scan workflow */}
          <div className="border border-gray-150 rounded-2xl p-6 bg-white">
            <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide mb-4">ALUR PEMANTAUAN BAGASI GROUP UMAROH (ONE-BARCODE SYSTEM)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              <div className="relative">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0">1</div>
                  <div>
                    <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wide">Cetak & Tempel</h5>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">Petugas / Mitra mencetak label sticker barcode berkode grup (contoh: <code>BAGG-VIPA-001</code> dst). Tempelkan silih koper bawaan jamaah saat berkumpul di bandara keberangkatan.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0">2</div>
                  <div>
                    <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wide">Pindai Bandara Awal</h5>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">Tour Leader / Petugas memindai koper sebelum dimasukkan timbangan bagasi atau kabin. Menentukan jenis koper (Masuk Bagasi vs Kabin).</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0">3</div>
                  <div>
                    <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wide">Kliring Bandara Tujuan/Hotel</h5>
                    <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">Local handler / Muthawwif bandara Saudi atau petugas porter hotel memindai ulang koper-koper yang dibongkar dari kargo bus. Sistem mencocokkan total kedatangan secara real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: SCANNER & SIMULATOR PORT */}
      {activeSubTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          
          {/* Scanner Simulation Window */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Live Camera Scanner Activator */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex-1">
                  <h4 className="font-extrabold text-xs text-indigo-850 uppercase tracking-widest">SCANNER KAMERA HANDPHONE / WEB</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Tekan tombol di sebelah kanan untuk menyalakan kamera handphone secara langsung guna memindai sticker koper fisik.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={`py-3 px-5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md text-white shrink-0 ${
                    isCameraActive 
                      ? 'bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-100' 
                      : 'bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-100'
                  }`}
                >
                  <Barcode className="w-4 h-4" />
                  {isCameraActive ? '⏹ MATIKAN KAMERA' : '🚀 AKTIFKAN KAMERA HP'}
                </button>
              </div>
              {cameraError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                  ⚠ Error: {cameraError}
                </div>
              )}
            </div>

            <div className="bg-gray-950 text-white rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between border-4 border-gray-800 shadow-2xl aspect-[4/3] max-w-xl mx-auto">
              
              {/* Actual Live Video Container when active */}
              {isCameraActive ? (
                <div id="reader-camera" className="absolute inset-0 w-full h-full object-cover z-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_a]:hidden" />
              ) : (
                <>
                  {/* Virtual camera indicators */}
                  <div className="absolute inset-0 opacity-12 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center pointer-events-none" />
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80 pointer-events-none" />
                </>
              )}
              
              {/* Scanner HUD Overlay */}
              <div className="relative z-10 flex justify-between items-center text-xs text-indigo-400 font-extrabold font-mono uppercase tracking-widest bg-black/40 backdrop-blur-sm p-2 rounded-lg leading-none border border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-ping'}`} />
                  <span>{isCameraActive ? 'LIVE KAMERA AKTIF' : 'PREVIEW KAMERA SCANNER'}</span>
                </div>
                <span>POS: {currentScanStep === 'boarding' ? 'PEMBERANGKATAN' : 'KEDATANGAN TIBA'}</span>
              </div>

              {/* Aiming Reticle area */}
              <div className="relative my-8 flex items-center justify-center flex-1">
                <div className="w-48 h-32 border-2 border-indigo-400/40 rounded-xl relative flex flex-col justify-between p-3 shrink-0 z-10">
                  <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-indigo-500" />
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-indigo-500" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-indigo-500" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-indigo-500" />
                  
                  {/* Laser Scan line animation */}
                  <div className="w-full h-[3px] bg-rose-500 shadow-[0_0_12px_#ef4444] animate-bounce my-auto" />
                </div>
              </div>

              {/* Scanner Status Display */}
              <div className="relative z-10">
                {scanStatus.type ? (
                  <div className={`p-3 rounded-2xl border text-xs font-bold leading-relaxed flex items-center gap-2 animate-pulse ${
                    scanStatus.type === 'success' 
                      ? 'bg-emerald-950/95 border-emerald-500 text-emerald-300' 
                      : 'bg-rose-950/95 border-rose-500 text-rose-300'
                  }`}>
                    {scanStatus.type === 'success' ? '✓' : '⚠'} {scanStatus.msg}
                  </div>
                ) : (
                  <div className="bg-black/60 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-center text-xs text-gray-400 font-medium">
                    {isCameraActive 
                      ? 'Posisikan barcode stiker koper tepat di dalam kotak bidik di atas.' 
                      : 'Aktivasi kamera HP di atas, masukkan kode manual di samping, atau gunakan simulator di bawah.'}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Emulator / Simulator Shortcuts */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150">
              <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-3">TOMBOL SIMULATOR SCAN CEPAT (KLIK UNTUK SCAN)</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(num => {
                  const simulatedId = `${getBaggagePrefix()}-${String(num).padStart(3, '0')}`;
                  const isRegistered = baggages.some(b => b.id === simulatedId);
                  const isArrived = baggages.some(b => b.id === simulatedId && b.status === 'ARRIVED_DESTINATION');
                  
                  return (
                    <button
                      key={num}
                      onClick={() => triggerMockScan(num, currentScanStep === 'unboarding')}
                      className={`py-3 px-2 rounded-xl border text-[11px] font-bold transition-all text-center leading-normal cursor-pointer ${
                        isArrived
                          ? 'bg-emerald-100/60 border-emerald-300 text-emerald-800 font-extrabold'
                          : isRegistered
                            ? 'bg-indigo-100/60 border-indigo-300 text-indigo-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      <div className="font-extrabold text-xs">BAG-#{num}</div>
                      <div className="text-[9px] text-gray-400 font-mono mt-0.5">{simulatedId}</div>
                      <div className="text-[8px] font-bold uppercase tracking-wide mt-1">
                        {isArrived ? '🟢 DI TUJUAN' : isRegistered ? '🔵 REGD DI AWAL' : '⚪ BELUM PRINT'}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 text-center leading-relaxed">Gunakan tombol pintas di atas untuk mensimulasikan pemindaian barcode fisik di bandara / hotel secara instan!</p>
            </div>
          </div>

          {/* Scanner Option Panels */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. Scan Mode configuration */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5">
              <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest mb-4">PENGATURAN ALAT SCAN</h3>

              <div className="space-y-4">
                
                {/* Pos Step */}
                <div>
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">POS PENEMPATAN SCANNER:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrentScanStep('boarding')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                        currentScanStep === 'boarding'
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                          : 'bg-gray-55/60 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>1. POS BANDARA AWAL</span>
                      <span className="text-[9px] opacity-75">(Registrasi Bagasi)</span>
                    </button>
                    <button
                      onClick={() => setCurrentScanStep('unboarding')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                        currentScanStep === 'unboarding'
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                          : 'bg-gray-55/60 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>2. POS ARIVAL / HOTEL</span>
                      <span className="text-[9px] opacity-75">(Kliring Kedatangan)</span>
                    </button>
                  </div>
                </div>

                {/* Bag Type (only shown / used during origin registration) */}
                {currentScanStep === 'boarding' && (
                  <div>
                    <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">KLASIFIKASI KOPER BAWAAN:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setScanType('check-in')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          scanType === 'check-in'
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-gray-55 hover:bg-gray-100 border-gray-200 text-gray-650'
                        }`}
                      >
                        🧳 KOPER BAGASI (Check-in)
                      </button>
                      <button
                        onClick={() => setScanType('cabin')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          scanType === 'cabin'
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-gray-55 hover:bg-gray-100 border-gray-200 text-gray-650'
                        }`}
                      >
                        🎒 KOPER KABIN (Cabin)
                      </button>
                    </div>
                  </div>
                )}

                {/* Operator Name */}
                <div>
                  <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">PETUGAS OPERATOR SCANNER:</label>
                  <input
                    type="text"
                    value={scannedBy}
                    onChange={(e) => setScannedBy(e.target.value)}
                    placeholder="Contoh: Budi Santoso (TL)"
                    className="w-full py-2 px-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-gray-50"
                  />
                </div>

                {/* Simulated Jamaah Tag */}
                {currentScanStep === 'boarding' && (
                  <div>
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">SIMULASI TAG NAMA JAMAAH (OPSIONAL):</label>
                    <select
                      value={simNameTag}
                      onChange={(e) => setSimNameTag(e.target.value)}
                      className="w-full py-2 px-3 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-gray-50"
                    >
                      <option value="">-- Tempelkan Polos / Tanpa Nama --</option>
                      {jamaahs.map(j => (
                        <option key={j.id} value={j.namaLengkap}>{j.namaLengkap}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
            </div>

            {/* 2. Manual Keyboard Code Typing & USB Gun focus detection */}
            <div className={`bg-white border rounded-2xl p-5 transition-all ${scannerFocused ? 'border-indigo-500 ring-4 ring-indigo-100' : 'border-gray-150'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wide">PENGGUNAAN ALAT BARCODE PHYSICAL USB</h4>
                <span className={`w-2.5 h-2.5 rounded-full ${scannerFocused ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              </div>

              <form onSubmit={handleUSBScanSubmit} className="space-y-3">
                <p className="text-[11px] text-gray-500 leading-normal mb-2">Gunakan input berikut jika Anda menggunakan <strong>pistol scanner USB/Bluetooth</strong> atau masukkan kode barcode secara manual (Contoh: <code>{getBaggagePrefix()}-001</code>).</p>
                
                <div className="flex gap-2">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onFocus={() => setScannerFocused(true)}
                    onBlur={() => setScannerFocused(false)}
                    placeholder="Masukan manual / scan disini..."
                    className="flex-1 py-3 px-3.5 border border-gray-200 rounded-xl text-sm font-mono font-bold uppercase placeholder-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase px-4 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Kirim scan
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Status Fokus: {scannerFocused ? '🟢 SIAP TERIMA PHYSICAL GUN' : '⚪ KLIK INPUT UNTUK MEMPERSIAPKAN'}</span>
                  <button 
                    type="button" 
                    onClick={() => scannerInputRef.current?.focus()}
                    className="text-xs text-indigo-600 font-extrabold hover:underline"
                  >
                    Ambil Fokus Scanner
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 3: BAGGAGE LIST TABLE */}
      {activeSubTab === 'daftar' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Filters / Search */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-150">
            <div className="font-extrabold text-xs text-gray-700 uppercase">
              REPLIKA DATA BAGASI GROUP ({baggages.length} item koper terdaftar)
            </div>
            
            <div className="flex gap-2 items-center text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider">Status:</span>
              <span className="font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-extrabold">
                {baggages.filter(b => b.status === 'ARRIVED_DESTINATION').length} Arrived
              </span>
              <span className="font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-extrabold">
                {baggages.filter(b => b.status === 'REGISTERED').length} Airport
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-150 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-650 border-b border-gray-150 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3 font-semibold text-center w-12">No</th>
                  <th className="p-3 font-semibold">Barcode ID</th>
                  <th className="p-3 font-semibold text-center w-36">Tipe Bawaan</th>
                  <th className="p-3 font-semibold">Nama Tag / Jamaah</th>
                  <th className="p-3 font-semibold">Status Alur</th>
                  <th className="p-3 font-semibold">Tgl Registrasi</th>
                  <th className="p-3 font-semibold">Tgl Selesai Tiba</th>
                  <th className="p-3 font-semibold text-right">Aksi Manual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {baggages.map((bag, idx) => (
                  <tr key={bag.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 text-center text-gray-400 font-bold font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-gray-900 font-mono text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-gray-400" />
                      {bag.id}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        bag.bagType === 'check-in' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-150' 
                          : 'bg-purple-50 text-purple-700 border border-purple-150'
                      }`}>
                        {bag.bagType === 'check-in' ? '🧳 Koper Bagasi' : '🎒 Bawaan Kabin'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-750">
                      {bag.jamaahNama ? (
                        <span className="text-gray-800">{bag.jamaahNama}</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Polos (Tanpa data penempel)</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        bag.status === 'ARRIVED_DESTINATION'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${bag.status === 'ARRIVED_DESTINATION' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                        {bag.status === 'ARRIVED_DESTINATION' ? '✓ Tiba di Tujuan' : '✈ Pos Bandara Awal'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-450 font-mono text-[10px]">
                      {new Date(bag.registeredAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-gray-450 font-mono text-[10px]">
                      {bag.arrivedAt ? (
                        new Date(bag.arrivedAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-gray-300 italic">--</span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        {bag.status !== 'ARRIVED_DESTINATION' && (
                          <button
                            onClick={() => markAsArrived(bag.id)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Tandai Tiba
                          </button>
                        )}
                        <button
                          onClick={() => removeBaggage(bag.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {baggages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400 font-bold">
                      Belum ada koper terdaftar untuk rombongan ini. Mulailah mencetak barcode atau memindai register koper di tab sebelah!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* SUB-TAB 4: LABEL BARCODE PRINTER SHEET */}
      {activeSubTab === 'cetak' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Label Printing Controller Settings */}
          <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-tight">KONTROL CETAK LABEL STICKER rombongan</h4>
              <p className="text-xs text-gray-500 leading-normal max-w-xl">Ubah parameter kuantiti koper untuk melahirkan cetak sticker bulk secara instan. Format sticker dapat di-print menggunakan printer thermal standard.</p>
              
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-500 uppercase">Jumlah Cetak:</span>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={printQty}
                    onChange={(e) => setPrintQty(Math.max(1, Number(e.target.value)))}
                    className="w-16 p-1 border rounded-lg text-center font-bold"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-gray-500 uppercase">Mulai Nomor:</span>
                  <input
                    type="number"
                    min="1"
                    value={printStartNum}
                    onChange={(e) => setPrintStartNum(Math.max(1, Number(e.target.value)))}
                    className="w-16 p-1 border rounded-lg text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handlePrintLabels}
              className="bg-indigo-700 hover:bg-indigo-800 text-white font-black text-xs uppercase py-4 px-6 rounded-xl shadow-lg flex items-center gap-2.5 transition-all cursor-pointer w-full md:w-auto justify-center active:scale-95"
            >
              <Printer className="w-4 h-4 text-white" /> Cetak Lembar Label ({printQty} Sticker)
            </button>
          </div>

          <h3 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest leading-none">PREVIEW LABEL THERMAL SEBELUM PRINT</h3>

          {/* Render target sticker sheet container */}
          <div className="border border-gray-200 bg-gray-100/50 p-6 rounded-2xl overflow-y-auto max-h-[500px]">
            <div ref={printSheetRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: printQty }).map((_, i) => {
                const labelIndex = printStartNum + i;
                const barcodeStr = `${getBaggagePrefix()}-${String(labelIndex).padStart(3, '0')}`;
                
                return (
                  <div key={i} className="bg-white border-2 border-dashed border-gray-300 p-4 rounded-xl flex flex-col justify-between items-center text-center shadow-sm w-full h-56 relative overflow-hidden bg-white">
                    
                    {/* Header group card */}
                    <div className="w-full text-center pb-2 border-b border-gray-150">
                      <p className="text-[12px] font-black text-indigo-750 uppercase truncate leading-none">{selectedPaket.namaPaket}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">UMAROH BAGGAGE TAG</p>
                    </div>

                    {/* Standard looking simulated barcode vector */}
                    <div className="my-2 flex flex-col items-center">
                      <div className="flex items-end gap-[2px] h-12 mb-1.5">
                        {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 1, 2].map((w, barIdx) => (
                          <div 
                            key={barIdx} 
                            style={{ width: `${w * 1.3}px` }} 
                            className={`h-full ${barIdx % 2 === 0 ? 'bg-black' : 'bg-transparent'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-mono text-xs font-extrabold text-gray-800 tracking-wider bg-gray-100 px-2 py-0.5 rounded uppercase">{barcodeStr}</span>
                    </div>

                    {/* Footer writeable tags */}
                    <div className="w-full grid grid-cols-2 text-left text-[9px] font-bold text-gray-500 pt-2 border-t border-gray-100 leading-tight">
                      <div className="border-r pr-1 truncate">
                        <span className="text-[8px] opacity-60 uppercase block">Nama Jamaah:</span>
                        <span className="font-extrabold text-gray-700">_________________</span>
                      </div>
                      <div className="pl-1 text-center">
                        <span className="text-[8px] opacity-60 uppercase block">Tipe Tas:</span>
                        <span className="font-extrabold text-gray-700">BAGASI / KABIN</span>
                      </div>
                    </div>

                    {/* Left & Right feed punches */}
                    <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-4 h-4 bg-gray-100 rounded-full border border-gray-200" />
                    <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-4 bg-gray-100 rounded-full border border-gray-200" />
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
};
