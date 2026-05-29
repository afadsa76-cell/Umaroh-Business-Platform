import { db, doc, setDoc, deleteDoc, getDocs, collection, query, where } from '../firebase';

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
    console.log(`[Firebase Sync] Synchronized booking: ${bookingId} successfully.`);
  } catch (error) {
    console.error(`[Firebase Sync] Failed to synchronize booking ${bookingId}:`, error);
  }
}

export async function deleteBookingFromTracker(bookingId: string) {
  try {
    if (!bookingId) return;
    await deleteDoc(doc(db, 'tracker_jamaah', bookingId));
    console.log(`[Firebase Sync] Removed tracker item for booking: ${bookingId}`);
  } catch (error) {
    console.error(`[Firebase Sync] Failed to delete booking ${bookingId}:`, error);
  }
}
