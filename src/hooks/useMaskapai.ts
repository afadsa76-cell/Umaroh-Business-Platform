import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, getDocs, writeBatch, db } from '../firebase';
import { Maskapai, maskapaiData as initialData } from '../data/maskapai';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const useMaskapai = () => {
  const [maskapai, setMaskapai] = useState<Maskapai[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = collection(db, 'maskapai');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Maskapai[];
      
      // Filter out expired flights (tanggalKepulangan < today)
      const today = new Date().toISOString().split('T')[0];
      const activeFlights = data.filter(flight => flight.tanggalKepulangan >= today);
      
      setMaskapai(activeFlights);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching maskapai:', err);
      setError(err.message);
      setLoading(false);
      
      // Fallback to initial data if Firestore fails or is empty
      if (maskapai.length === 0) {
        setMaskapai(initialData);
      }
      handleFirestoreError(err, OperationType.GET, 'maskapai');
    });

    return () => unsubscribe();
  }, []);

  const decrementSeat = async (maskapaiId: string, count: number) => {
    try {
      const maskapaiRef = doc(db, 'maskapai', maskapaiId);
      const target = maskapai.find(m => m.id === maskapaiId);
      if (!target) throw new Error('Maskapai not found');
      
      if (target.availableSeats < count) {
        throw new Error('Not enough seats available');
      }

      await updateDoc(maskapaiRef, {
        availableSeats: target.availableSeats - count
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'maskapai');
      throw err;
    }
  };

  const seedData = async () => {
    try {
      const q = collection(db, 'maskapai');
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        const batch = writeBatch(db);
        initialData.forEach((item) => {
          const docRef = doc(collection(db, 'maskapai'), item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
        console.log('Data seeded successfully');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'maskapai');
    }
  };

  return { maskapai, loading, error, decrementSeat, seedData };
};
