import { db, doc, setDoc, deleteDoc, getDocs, collection, query, where } from '../firebase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeJsonParse(rawText: string): any {
  if (!rawText) return null;
  let clean = rawText.trim();
  
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  const isArray = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace));
  
  const startIdx = isArray ? firstBracket : firstBrace;
  const endIdx = isArray ? clean.lastIndexOf(']') : clean.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    clean = clean.substring(startIdx, endIdx + 1);
  } else {
    clean = clean.replace(/```json/gi, '')
                 .replace(/```/g, '')
                 .trim();
  }
  
  try {
    return JSON.parse(clean);
  } catch (err) {
    console.warn("JSON parsing failed, returning raw text or custom error:", err);
    if (rawText.includes('Asisten AI') || rawText.includes('koneksi API') || rawText.includes('kredit kuota')) {
      throw new Error(rawText, { cause: err });
    }
    throw new Error(rawText || "Gagal mengurai respons JSON dari AI.", { cause: err });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncBookingToTracker(bookingId: string, bookingData: any) {
  try {
    if (!bookingId || !bookingData) return;

    // 1. Locate corresponding tracker_paket container
    let targetPaketId = bookingData.paketId || '';
    if (bookingData.paketId) {
      // Find tracker_paket where packageMasterId is the selected program ID
      const qMaster = query(collection(db, 'tracker_paket'), where('paketMasterId', '==', bookingData.paketId));
      const snapMaster = await getDocs(qMaster);
      if (!snapMaster.empty) {
        targetPaketId = snapMaster.docs[0].id;
      } else {
        // Or if it matches a partner-specific package
        const qMitra = query(collection(db, 'tracker_paket'), where('paketMitraId', '==', bookingData.paketId));
        const snapMitra = await getDocs(qMitra);
        if (!snapMitra.empty) {
          targetPaketId = snapMitra.docs[0].id;
        }
      }
    }

    const roomType = bookingData.roomType || 'Quad';

    // 2. Draft matching manifest structure
    const trackerPayload = {
      bookingId: bookingId,
      jamaahId: bookingData.jamaahId || '',
      mitraId: bookingData.mitraId || '',
      paketId: targetPaketId,
      title: bookingData.title || 'MR',
      namaLengkap: (bookingData.namaJamaah || bookingData.nama || '').toUpperCase(),
      status_kesiapan: bookingData.statusKeberangkatan || 'READY',
      nik: bookingData.nik || '',
      nama_paspor: (bookingData.nama_paspor || bookingData.namaJamaah || bookingData.nama || '').toUpperCase(),
      no_paspor: (bookingData.no_paspor || bookingData.nomorPassport || '').toUpperCase(),
      tanggal_lahir: bookingData.tanggal_lahir || '',
      tgl_issue_paspor: bookingData.tgl_issue_paspor || '',
      tgl_exp_paspor: bookingData.tgl_exp_paspor || '',
      kota_paspor: (bookingData.kota_paspor || '').toUpperCase(),
      tempat_lahir: (bookingData.tempat_lahir || '').toUpperCase(),
      alamat: (bookingData.alamat || '').toUpperCase(),
      kewarganegaraan: bookingData.kewarganegaraan || 'WNI',
      telepon: bookingData.noHp || bookingData.phone || '',
      emergency_contact: bookingData.emergency_contact || '',
      jenisKelamin: bookingData.jenisKelamin || 'L',
      roomType: roomType,
      
      // Match document checkboxes
      docPassport: !!bookingData.docPassport,
      docKtp: !!bookingData.docKtp,
      docVaccine: !!bookingData.docVaccine,
      docFoto: !!bookingData.docFoto,
      
      // Match digital document files
      filePassport: bookingData.filePassport || '',
      fileKtp: bookingData.fileKtp || '',
      fileVaccine: bookingData.fileVaccine || '',
      fileFoto: bookingData.fileFoto || '',
      
      // Operational properties
      statusPembayaran: bookingData.statusPembayaran || 'Belum Lunas',
      statusPaspor: (bookingData.no_paspor || bookingData.nomorPassport) ? 'Sudah Ada' : 'Belum Ada',
      statusVaksin: bookingData.docVaccine ? 'Sudah' : 'Belum',
      updatedAt: new Date().toISOString(),
    };

    // 3. Write with the SAME document ID to ensure perfect 1:1 synchronization
    await setDoc(doc(db, 'tracker_jamaah', bookingId), trackerPayload);

    // 4. Handle additional passengers in manifestList
    if (bookingData.manifestList && Array.isArray(bookingData.manifestList)) {
      // Delete any pre-existing sub-pax records first (in case the count decreased)
      for (let i = 1; i <= 10; i++) {
        try {
          await deleteDoc(doc(db, 'tracker_jamaah', `${bookingId}_pax_${i}`));
        } catch {
          // ignore
        }
      }

      // Add other passengers
      for (let i = 1; i < bookingData.manifestList.length; i++) {
        const pax = bookingData.manifestList[i];
        const paxPayload = {
          bookingId: bookingId,
          jamaahId: bookingData.jamaahId || '',
          mitraId: bookingData.mitraId || '',
          paketId: targetPaketId,
          title: pax.title || 'MR',
          namaLengkap: (pax.namaLengkap || '').toUpperCase(),
          status_kesiapan: bookingData.statusKeberangkatan || 'READY',
          nik: pax.nik || '',
          nama_paspor: (pax.nama_paspor || pax.namaLengkap || '').toUpperCase(),
          no_paspor: (pax.no_paspor || '').toUpperCase(),
          tanggal_lahir: pax.tanggal_lahir || '',
          tgl_issue_paspor: pax.tgl_issue_paspor || '',
          tgl_exp_paspor: pax.tgl_exp_paspor || '',
          kota_paspor: (pax.kota_paspor || '').toUpperCase(),
          tempat_lahir: (pax.tempat_lahir || '').toUpperCase(),
          alamat: (pax.alamat || bookingData.alamat || '').toUpperCase(),
          kewarganegaraan: pax.kewarganegaraan || 'WNI',
          telepon: pax.telepon || '',
          emergency_contact: pax.emergency_contact || '',
          jenisKelamin: pax.jenisKelamin || (pax.title === 'MR' || pax.title === 'LAKI-LAKI' || pax.title === 'MSTR' ? 'L' : 'P'),
          roomType: roomType,
          
          docPassport: false,
          docKtp: false,
          docVaccine: false,
          docFoto: false,
          filePassport: '',
          fileKtp: '',
          fileVaccine: '',
          fileFoto: '',
          
          statusPembayaran: bookingData.statusPembayaran || 'Belum Lunas',
          statusPaspor: pax.no_paspor ? 'Sudah Ada' : 'Belum Ada',
          statusVaksin: 'Belum',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'tracker_jamaah', `${bookingId}_pax_${i}`), paxPayload);
      }
    }
    console.log(`[Firebase Sync] Synchronized booking: ${bookingId} successfully.`);
  } catch (error) {
    console.error(`[Firebase Sync] Failed to synchronize booking ${bookingId}:`, error);
  }
}

export async function deleteBookingFromTracker(bookingId: string) {
  try {
    if (!bookingId) return;
    await deleteDoc(doc(db, 'tracker_jamaah', bookingId));
    // Also delete any other pax rows
    for (let i = 1; i <= 10; i++) {
      try {
        await deleteDoc(doc(db, 'tracker_jamaah', `${bookingId}_pax_${i}`));
      } catch {
        // ignore
      }
    }
    console.log(`[Firebase Sync] Removed tracker items for booking: ${bookingId}`);
  } catch (error) {
    console.error(`[Firebase Sync] Failed to delete booking ${bookingId}:`, error);
  }
}
