import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Use lazy initialization for Gemini to avoid crashing when the API key is not yet set at startup
  let aiClient: GoogleGenAI | null = null;
  const getAIClient = (): GoogleGenAI => {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined. Please configure it in your Secrets/Settings panel.');
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  };

  // API Route for AI Marketing Copywriter
  app.post('/api/ai/marketing', async (req, res) => {
    try {
      const { packageName, targetChannel, tone, customInstructions, duration, price, airline } = req.body;

      if (!packageName) {
        return res.status(400).json({ error: 'Nama paket wajib diisi' });
      }

      const prompt = `Buatkan copywriting pemasaran profesional dan persuasif untuk paket perjalanan ibadah Umroh / Wisata dengan rincian berikut:
      - Nama Paket: ${packageName}
      ${duration ? `- Durasi Tour: ${duration} Hari` : ''}
      ${price ? `- Estimasi Harga Mulai Dari: Rp ${Number(price).toLocaleString('id-ID')}` : ''}
      ${airline ? `- Maskapai Penerbangan: ${airline}` : ''}

      Media / Saluran Pemasaran: ${targetChannel || 'WhatsApp Broadcast'}
      Gaya Bahasa / Tone: ${tone || 'Inspirational & Persuasive'}
      Catatan atau Instruksi Kustom Tambahan: ${customInstructions || 'Berikan call to action yang jelas, tambahkan emoji-emoji relevan untuk menarik ketertarikan calon jamaah.'}

      Pastikan struktur teks tertata rapi, elegan, menyentuh hati sanubari calon jamaah untuk beribadah ke Baitullah, dan mencantumkan keunggulan paket. JANGAN menggunakan kutipan kode atau markdown di luar pemformatan teks tebal/miring biasa.`;

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ result: response.text });
    } catch (error) {
      const err = error as Error;
      console.error('Gemini Marketing Assistant Error:', err);
      res.status(500).json({ error: err.message || 'Gagal generate copywriting pemasaran' });
    }
  });

  // API Route for Smart Engine Analytics
  app.post('/api/ai/analytics', async (req, res) => {
    try {
      const { bookingsData, packagesData } = req.body;

      const prompt = `Anda adalah konsultan operasional bisnis travel umrah senior.
      Analisis tren dan performa bisnis dari data real-time ERP di bawah ini:
      1. Data Booking Aktif (Jamaah): ${JSON.stringify(bookingsData || [])}
      2. Data Katalog Paket: ${JSON.stringify(packagesData || [])}

      Lakukan evaluasi anomali, risiko keuangan (piutang tertunggak), kelengkapan dokumen paspor/ktp/vaksin, dan berikan insight strategi pasar yang tajam.
      Berikan respon dalam format JSON murni terstruktur dengan format berikut:
      {
        "marketInsights": [
          "string: Insight analitis pendaftaran atau preferensi akomodasi/kamar",
          "string: Analisis produk yang paling populer atau paling menguntungkan",
          "string: Rekomendasi taktis promosi di musim berjalan"
        ],
        "fraudAlerts": [
          {
            "level": "high" | "warning" | "info",
            "message": "string: Deskripsi deteksi risiko atau anomali piutang / dokumen"
          }
        ],
        "recommendations": [
          "string: Saran pengisian dokumen atau penagihan sisa pembayaran",
          "string: Saran optimasi harga jual atau markup produk",
          "string: Strategi perluasan agen jaringan penjualan"
        ],
        "forecasting": "string: Analisis prediktif singkat keberangkatan dan potensi omzet komisi dalam 3 bulan ke depan"
      }

      Berikan hanya struktur JSON instan di atas tanpa markdown block (no \`\`\`json).`;

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error) {
      const err = error as Error;
      console.error('Gemini Smart Analytics Error:', err);
      res.status(500).json({ error: err.message || 'Gagal memuat analisis cerdas' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
