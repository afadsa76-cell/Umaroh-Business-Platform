import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Building2, User, Mail, Phone, Lock, CreditCard, ArrowRight, MapPin, Network, Landmark, QrCode, Upload, Eye, EyeOff } from 'lucide-react';
import { db, collection, getDocs, addDoc, query, where, handleFirestoreError, OperationType } from '../../firebase';
import { logoBase64 } from '../../utils/logoBase64';

interface PaketKemitraan {
  id: string;
  nama: string;
  harga: number;
  deskripsi: string;
}

interface RegisterMitraViewProps {
  onBack: () => void;
  prefilledEmail?: string;
  prefilledName?: string;
  prefilledUid?: string;
}

interface Upline {
  id: string;
  name: string;
  brandName?: string;
  subRole?: string;
  role?: string;
}

interface AddressSuggestion {
  place_id: number;
  display_name: string;
  address: {
    state?: string;
    province?: string;
    city?: string;
    town?: string;
    county?: string;
    municipality?: string;
    suburb?: string;
    village?: string;
    district?: string;
    [key: string]: string | number | boolean | undefined;
  };
  [key: string]: string | number | boolean | undefined | object;
}

export const RegisterMitraView: React.FC<RegisterMitraViewProps> = ({ 
  onBack,
  prefilledEmail,
  prefilledName,
  prefilledUid
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [paketList, setPaketList] = useState<PaketKemitraan[]>([]);
  const [uplineList, setUplineList] = useState<Upline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    paketId: '',
    agreeToTerms: false,
    nama: '',
    email: '',
    password: '',
    phone: '',
    brandName: '',
    nikKtp: '',
    provinsi: '',
    kota: '',
    kecamatan: '',
    desaKelurahan: '',
    alamatLengkap: '',
    uplineId: '',
    metodePembayaran: 'transfer',
    buktiTransfer: ''
  });

  useEffect(() => {
    if (prefilledEmail || prefilledName) {
      setFormData(prev => ({
        ...prev,
        email: prefilledEmail || prev.email,
        nama: prefilledName || prev.nama
      }));
    }
  }, [prefilledEmail, prefilledName]);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const searchAddress = async () => {
      if (addressQuery.length < 3) {
        setAddressSuggestions([]);
        return;
      }

      setIsSearchingAddress(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&addressdetails=1&countrycodes=id&limit=5`);
        const data = await response.json();
        setAddressSuggestions(data);
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setIsSearchingAddress(false);
      }
    };

    const timeoutId = setTimeout(() => {
      if (showSuggestions) {
        searchAddress();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [addressQuery, showSuggestions]);

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    const addressDetails = suggestion.address;
    
    const rawProvinsi = addressDetails.state || addressDetails.province || '';
    const provinsi = typeof rawProvinsi === 'string' ? rawProvinsi : '';
    
    const rawKota = addressDetails.city || addressDetails.town || addressDetails.county || addressDetails.municipality || '';
    const kota = typeof rawKota === 'string' ? rawKota : '';
    
    const rawKecamatan = addressDetails.suburb || addressDetails.district || addressDetails.village || '';
    const kecamatan = typeof rawKecamatan === 'string' ? rawKecamatan : '';
    
    const rawDesa = addressDetails.village || addressDetails.subdistrict || addressDetails.hamlet || addressDetails.neighbourhood || '';
    const desaKelurahan = typeof rawDesa === 'string' ? rawDesa : '';
    
    setFormData(prev => ({
      ...prev,
      provinsi,
      kota,
      kecamatan,
      desaKelurahan
    }));
    
    setAddressQuery(suggestion.display_name);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const paketSnapshot = await getDocs(collection(db, 'paket_kemitraan'));
        const paketData = paketSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PaketKemitraan[];
        
        paketData.sort((a, b) => b.harga - a.harga);
        setPaketList(paketData);
        
        if (paketData.length > 0) {
          setFormData(prev => ({ ...prev, paketId: paketData[0].id }));
        }

        const uplineQuery = query(collection(db, 'users'), where('role', '==', 'mitra'));
        const uplineSnapshot = await getDocs(uplineQuery);
        const uplines = uplineSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Upline[];
        setUplineList(uplines);

      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Gagal memuat data. Silakan coba lagi.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Ukuran file maksimal 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, buktiTransfer: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.paketId) {
        setError("Silakan pilih paket kemitraan terlebih dahulu.");
        return;
      }
      if (!formData.agreeToTerms) {
        setError("Anda harus menyetujui Syarat & Ketentuan.");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.nama || !formData.email || !formData.password || !formData.phone) {
        setError("Mohon lengkapi semua data diri.");
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.brandName || !formData.nikKtp) {
        setError("Mohon lengkapi semua data usaha.");
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.provinsi || !formData.kota || !formData.kecamatan || !formData.desaKelurahan || !formData.alamatLengkap) {
        setError("Mohon lengkapi semua data lokasi (Provinsi, Kota, Kecamatan, Desa/Kelurahan, dan Alamat Lengkap).");
        return;
      }
    }
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setError('');
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.metodePembayaran === 'transfer' && !formData.buktiTransfer) {
      setError("Mohon upload bukti transfer.");
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const selectedPaket = paketList.find(p => p.id === formData.paketId);
      if (!selectedPaket) throw new Error("Paket tidak valid");

      const upline = uplineList.find(u => u.id === formData.uplineId);

      await addDoc(collection(db, 'pendaftaran_mitra'), {
        nama: formData.nama,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        brandName: formData.brandName,
        nikKtp: formData.nikKtp,
        provinsi: formData.provinsi,
        kota: formData.kota,
        kecamatan: formData.kecamatan,
        desaKelurahan: formData.desaKelurahan,
        alamatLengkap: formData.alamatLengkap,
        uplineId: formData.uplineId,
        uplineName: upline ? upline.name : '',
        paketId: formData.paketId,
        paketNama: selectedPaket.nama,
        paketHarga: selectedPaket.harga,
        metodePembayaran: formData.metodePembayaran,
        buktiTransfer: formData.buktiTransfer,
        status: 'PENDING',
        uid: prefilledUid || '',
        createdAt: new Date().toISOString()
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      console.error("Error submitting registration:", err);
      handleFirestoreError(err, OperationType.CREATE, 'pendaftaran_mitra');
      setError("Gagal mengirim pendaftaran: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white py-12 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Pendaftaran Berhasil!
            </h2>
            <p className="text-gray-600 mb-8">
              Terima kasih telah mendaftar sebagai Mitra Umaroh. Tim kami akan segera menghubungi Anda melalui WhatsApp atau Email untuk proses validasi dan pembayaran.
            </p>
            <button
              onClick={onBack}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 bg-[url('https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Kembali
        </button>

        <div className="flex justify-center mb-4 md:mb-6">
          <img src={logoBase64} alt="Umaroh Logo" className="h-10 md:h-16" />
        </div>
        <h2 className="text-center text-xl md:text-3xl font-extrabold text-gray-900 mb-1 md:mb-2 px-4 text-balance">
          Pendaftaran Mitra Baru
        </h2>
        <p className="text-center text-[10px] md:text-sm text-gray-600 mb-6 md:mb-8 px-6">
          Bergabunglah bersama kami dan mulai bisnis travel umrah Anda sendiri
        </p>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0 rounded-full"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-amber-500 z-0 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            ></div>
            
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${
                  currentStep >= step 
                    ? 'bg-amber-500 border-amber-100 text-white' 
                    : 'bg-white border-gray-200 text-gray-400'
                }`}>
                  {currentStep > step ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : step}
                </div>
                <span className={`mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center ${
                  currentStep >= step ? 'text-amber-700' : 'text-gray-400'
                }`}>
                  {step === 1 ? 'Paket' : step === 2 ? 'Data Diri' : step === 3 ? 'Usaha' : step === 4 ? 'Lokasi' : 'Bayar'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white py-6 md:py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 text-red-700 text-xs md:text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* STEP 1: Paket & S&K */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">1. Pilih Paket Kemitraan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {paketList.map((paket) => (
                        <div 
                          key={paket.id}
                          onClick={() => setFormData(prev => ({ ...prev, paketId: paket.id }))}
                          className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                            formData.paketId === paket.id 
                              ? 'border-amber-500 bg-amber-50' 
                              : 'border-gray-200 hover:border-amber-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className={`font-bold ${formData.paketId === paket.id ? 'text-amber-900' : 'text-gray-900'}`}>
                              {paket.nama}
                            </h3>
                            {formData.paketId === paket.id && (
                              <CheckCircle2 className="w-5 h-5 text-amber-600" />
                            )}
                          </div>
                          <p className={`text-lg font-black mb-2 ${formData.paketId === paket.id ? 'text-amber-700' : 'text-gray-900'}`}>
                            {formatCurrency(paket.harga)}
                          </p>
                          <p className={`text-xs ${formData.paketId === paket.id ? 'text-amber-600' : 'text-gray-500'}`}>
                            {paket.deskripsi}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Syarat & Ketentuan</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-40 overflow-y-auto text-sm text-gray-600 mb-4">
                      <p className="font-bold mb-2">Perjanjian Kemitraan Umaroh</p>
                      <ol className="list-decimal pl-4 space-y-2">
                        <li>Mitra wajib memberikan data yang valid dan dapat dipertanggungjawabkan.</li>
                        <li>Pembayaran paket kemitraan dilakukan setelah proses validasi oleh tim Operasional.</li>
                        <li>Mitra berhak mendapatkan komisi sesuai dengan paket yang dipilih.</li>
                        <li>Umaroh berhak menonaktifkan akun mitra jika ditemukan pelanggaran atau kecurangan.</li>
                        <li>Biaya pendaftaran kemitraan tidak dapat dikembalikan (non-refundable).</li>
                        <li>Mitra wajib menjaga nama baik brand Umaroh.</li>
                      </ol>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          name="agreeToTerms"
                          checked={formData.agreeToTerms}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                        />
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Saya setuju dengan Syarat & Ketentuan di atas</span>
                        <p className="text-gray-500">Dengan mencentang kotak ini, Anda menyetujui seluruh kebijakan kemitraan kami.</p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-1"
                    >
                      Selanjutnya <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Data Diri */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">2. Data Diri</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="nama"
                          required
                          value={formData.nama}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="Masukkan nama lengkap sesuai KTP"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="email@contoh.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          required
                          value={formData.password}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="Buat password untuk akun Anda"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">No. WhatsApp</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="08123456789"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-2 sm:order-1"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" /> Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-1 sm:order-2"
                    >
                      Selanjutnya <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Data Usaha */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">3. Data Usaha</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Brand / Travel</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="brandName"
                          required
                          value={formData.brandName}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="Masukkan nama brand travel Anda"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">NIK KTP</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="nikKtp"
                          required
                          value={formData.nikKtp}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="Masukkan 16 digit NIK KTP"
                          maxLength={16}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-2 sm:order-1"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" /> Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-1 sm:order-2"
                    >
                      Selanjutnya <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Lokasi & Upline */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">4. Lokasi & Jaringan</h3>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700">Cari Alamat *</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={addressQuery}
                          onChange={(e) => {
                            setAddressQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onFocus={() => setShowSuggestions(true)}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="Ketik nama kota, kecamatan, atau jalan..."
                        />
                        {addressQuery && (
                          <div 
                            className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                            onClick={() => {
                              setAddressQuery('');
                              setAddressSuggestions([]);
                              setShowSuggestions(false);
                            }}
                          >
                            <span className="text-gray-400 hover:text-gray-600">✕</span>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Alamat otomatis mengisi Provinsi, Kota, Kecamatan</p>

                      {showSuggestions && addressQuery.length >= 3 && (
                        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {isSearchingAddress ? (
                            <div className="px-4 py-2 text-sm text-gray-500">Mencari alamat...</div>
                          ) : addressSuggestions.length > 0 ? (
                            addressSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-amber-50"
                                onClick={() => handleSelectAddress(suggestion)}
                              >
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                                  <span className="block truncate text-gray-900">{suggestion.display_name}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">Alamat tidak ditemukan</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Provinsi *</label>
                        <input
                          type="text"
                          name="provinsi"
                          required
                          value={formData.provinsi}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-gray-300 rounded-lg py-3 px-4 border"
                          placeholder="Contoh: Jawa Barat"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Kota / Kabupaten *</label>
                        <input
                          type="text"
                          name="kota"
                          required
                          value={formData.kota}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-gray-300 rounded-lg py-3 px-4 border"
                          placeholder="Contoh: Bandung"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Kecamatan *</label>
                        <input
                          type="text"
                          name="kecamatan"
                          required
                          value={formData.kecamatan}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-gray-300 rounded-lg py-3 px-4 border"
                          placeholder="Contoh: Coblong"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Desa / Kelurahan *</label>
                        <input
                          type="text"
                          name="desaKelurahan"
                          required
                          value={formData.desaKelurahan}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-amber-500 focus:border-amber-500 block w-full sm:text-sm border-gray-300 rounded-lg py-3 px-4 border"
                          placeholder="Contoh: Sadang Serang"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Alamat Lengkap *</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                          name="alamatLengkap"
                          required
                          rows={3}
                          value={formData.alamatLengkap}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border"
                          placeholder="Nama jalan, nomor rumah, RT/RW"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Jaringan / Upline (Opsional)</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Network className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          name="uplineId"
                          value={formData.uplineId}
                          onChange={handleInputChange}
                          className="focus:ring-amber-500 focus:border-amber-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3 border bg-white"
                        >
                          <option value="">-- Daftar Langsung ke Pusat --</option>
                          {uplineList.map(upline => (
                            <option key={upline.id} value={upline.id}>
                              {upline.brandName || upline.name} {upline.subRole ? `(${upline.subRole})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Pilih mitra di atas Anda jika Anda mendaftar melalui referensi mereka.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-2 sm:order-1"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" /> Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-1 sm:order-2"
                    >
                      Selanjutnya <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: Pembayaran */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">5. Metode Pembayaran</h3>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-amber-800 font-medium mb-1">Total Tagihan:</p>
                    <p className="text-2xl font-black text-amber-900">
                      {formatCurrency(paketList.find(p => p.id === formData.paketId)?.harga || 0)}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Paket: {paketList.find(p => p.id === formData.paketId)?.nama}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Metode Pembayaran</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div 
                        onClick={() => setFormData(prev => ({ ...prev, metodePembayaran: 'transfer' }))}
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all ${
                          formData.metodePembayaran === 'transfer' 
                            ? 'border-amber-500 bg-amber-50 text-amber-700' 
                            : 'border-gray-200 hover:border-amber-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        <Landmark className={`w-8 h-8 mb-2 ${formData.metodePembayaran === 'transfer' ? 'text-amber-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-bold text-center">Transfer Manual</span>
                      </div>
                      <div 
                        onClick={() => setFormData(prev => ({ ...prev, metodePembayaran: 'va' }))}
                        className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all ${
                          formData.metodePembayaran === 'va' 
                            ? 'border-amber-500 bg-amber-50 text-amber-700' 
                            : 'border-gray-200 hover:border-amber-200 hover:bg-gray-50 text-gray-500'
                        }`}
                      >
                        <QrCode className={`w-8 h-8 mb-2 ${formData.metodePembayaran === 'va' ? 'text-amber-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-bold text-center">Virtual Account (V.A)</span>
                      </div>
                    </div>

                    {formData.metodePembayaran === 'transfer' && (
                      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 animate-in fade-in duration-300">
                        <h4 className="font-bold text-gray-900 mb-2">Instruksi Transfer</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Silakan transfer ke rekening berikut:
                        </p>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
                          <p className="text-xs text-gray-500 uppercase font-bold">Bank Syariah Indonesia (BSI)</p>
                          <p className="text-lg font-black text-gray-900 tracking-wider">5577 7750 03</p>
                          <p className="text-sm text-gray-600">a.n PT NAWAITUL UMRAH HAJI</p>
                        </div>
                        
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Bukti Transfer</label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-amber-500 transition-colors bg-white">
                            <div className="space-y-1 text-center">
                              {formData.buktiTransfer ? (
                                <div className="flex flex-col items-center">
                                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                                  <p className="text-sm text-emerald-600 font-medium mt-2">Bukti transfer berhasil diunggah</p>
                                  <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({ ...prev, buktiTransfer: '' }))}
                                    className="text-xs text-red-500 mt-2 hover:underline"
                                  >
                                    Hapus & Upload Ulang
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                  <div className="flex text-sm text-gray-600 justify-center">
                                    <label 
                                      className="relative cursor-pointer bg-white rounded-md font-medium text-amber-600 hover:text-amber-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-amber-500"
                                      onClick={async (e) => {
                                        const { Capacitor } = await import('@capacitor/core');
                                        if (Capacitor.isNativePlatform()) {
                                          e.preventDefault();
                                          try {
                                            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
                                            const image = await Camera.getPhoto({
                                              quality: 90,
                                              allowEditing: false,
                                              resultType: CameraResultType.Base64,
                                              source: CameraSource.Prompt
                                            });
                                            if (image.base64String) {
                                              setFormData(prev => ({ ...prev, buktiTransfer: `data:image/jpeg;base64,${image.base64String}` }));
                                            }
                                          } catch (err) {
                                            console.error("Camera fail", err);
                                          }
                                        }
                                      }}
                                    >
                                      <span>Upload file</span>
                                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                    <p className="pl-1">atau drag and drop</p>
                                  </div>
                                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.metodePembayaran === 'va' && (
                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 animate-in fade-in duration-300">
                        <div className="flex items-start gap-3">
                          <QrCode className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-blue-900 mb-1">Virtual Account</h4>
                            <p className="text-sm text-blue-800">
                              Nomor Virtual Account akan di-generate secara otomatis setelah Anda menyelesaikan pendaftaran ini. Anda dapat melihatnya di halaman sukses atau melalui email yang kami kirimkan.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center justify-center py-3 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors order-2 sm:order-1"
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" /> Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex items-center justify-center py-3 px-6 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors order-1 sm:order-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Memproses...' : 'Selesaikan Pendaftaran'}
                    </button>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
