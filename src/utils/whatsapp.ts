import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export type WATemplateType = 'PAYMENT_REMINDER' | 'DOCUMENT_REMINDER' | 'EQUIPMENT_INFO' | 'GENERAL_INFO';

export const generateWALink = (phone: string, message: string) => {
  // Format phone number: remove leading 0, add 62
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '62' + formattedPhone.substring(1);
  }
  const encodedMessage = encodeURIComponent(message);
  // Using api.whatsapp.com/send instead of wa.me for better compatibility on some Android versions
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
};

export const openWhatsApp = async (url: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
    } else {
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    // Fallback
    window.open(url, '_blank');
  }
};

export const getWATemplate = (type: WATemplateType, data: any): string => {
  switch (type) {
    case 'PAYMENT_REMINDER':
      return `Assalamu'alaikum Bapak/Ibu ${data.nama},

Mengingatkan untuk pembayaran paket Umrah *${data.paket}*.
Sisa tagihan yang belum dibayarkan adalah sebesar *Rp ${data.sisaTagihan.toLocaleString('id-ID')}*.

Mohon untuk segera melakukan pelunasan sebelum tanggal jatuh tempo.
Abaikan pesan ini jika sudah melakukan pembayaran.

Terima kasih,
Admin Travel`;

    case 'DOCUMENT_REMINDER':
      return `Assalamu'alaikum Bapak/Ibu ${data.nama},

Mengingatkan untuk kelengkapan dokumen keberangkatan Umrah paket *${data.paket}*.
Berikut dokumen yang belum kami terima:
${data.missingDocs.map((doc: string) => `- ${doc}`).join('\n')}

Mohon untuk segera menyerahkan dokumen tersebut ke kantor kami agar proses visa dan tiket dapat berjalan lancar.

Terima kasih,
Tim Operasional`;

    case 'EQUIPMENT_INFO':
      return `Assalamu'alaikum Bapak/Ibu ${data.nama},

Alhamdulillah, perlengkapan Umrah untuk paket *${data.paket}* sudah siap diambil di kantor kami.
Perlengkapan yang akan diterima:
${data.equipmentList.map((eq: string) => `- ${eq}`).join('\n')}

Silakan datang pada jam kerja (09.00 - 16.00).

Terima kasih,
Tim Operasional`;

    default:
      return `Assalamu'alaikum Bapak/Ibu ${data.nama},\n\n`;
  }
};
