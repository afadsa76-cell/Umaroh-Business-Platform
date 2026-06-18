import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Serve the video logo explicitly to ensure Range requests are supported correctly (essential for iOS/macOS Safari & Chrome)
  app.get('/umaroh_logo.mp4', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'umaroh_logo.mp4'), {
      headers: {
        'Content-Type': 'video/mp4'
      }
    });
  });

  // Use lazy initialization for Gemini to avoid crashing when the API key is not yet set at startup
  let aiClient: GoogleGenAI | null = null;
  const getAIClient = (): GoogleGenAI => {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined. Please configure it in your Secrets/Settings panel or as an environment variable (VITE_GEMINI_API_KEY / GEMINI_API_KEY).');
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
      let errMsg = err.message || '';
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access') || errMsg.includes('restricted')) {
        errMsg = 'Akses API Key Gemini ditolak (PERMISSION_DENIED). Hal ini biasanya terjadi jika kuota habis, kartu kredit kedaluwarsa pada billing Google Cloud, atau API Key ditangguhkan. Silakan periksa keaktifan Key di Google AI Studio.';
      }
      res.status(500).json({ error: errMsg || 'Gagal generate copywriting pemasaran' });
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
      let errMsg = err.message || '';
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access') || errMsg.includes('restricted')) {
        errMsg = 'Akses API Key Gemini ditolak (PERMISSION_DENIED). Hal ini biasanya terjadi jika kuota habis, kartu kredit kedaluwarsa pada billing Google Cloud, atau API Key ditangguhkan. Silakan periksa keaktifan Key di Google AI Studio.';
      }
      res.status(500).json({ error: errMsg || 'Gagal memuat analisis cerdas' });
    }
  });

  // API Route for Jamaah CS Chat Assistant (Shopee Premium style)
  app.post('/api/ai/jamaah-chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Pesan wajib diisi' });
      }

      const systemInstruction = `Anda adalah asisten AI pintar "Sahabat Marawa" dari UMAROH Marketplace (Aplikasi Marketplace Haji & Umroh terlengkap nomor 1).
      Tugas Anda adalah memandu calon Jamaah dengan ramah, komunikatif, profesional, dan menyejukkan hati.
      Aturan berkomunikasi:
      - Sapa dengan sebutan "Kakak / Sahabat" layaknya Customer Service Shopee yang interaktif dan antusias.
      - Jawab dengan bahasa Indonesia yang santun, sopan, dan mudah dipahami.
      - Berikan informasi akurat seputar rukun Umroh & Haji, syarat pembuatan dokumen/paspor/visa, perlengkapan yang wajib dibawa, tips akomodasi hotel di Mekkah dan Madinah, maupun perbandingan paket.
      - Selalu akhiri dengan doa terbaik agar impian ibadah ke tanah suci segera terwujud.
      - Jawablah secara padat, bersahabat, menggunakan format bullet points terstruktur jika diperlukan dan bubuhkan emoji yang ramah (seperti 🕋, ✨, 🕌, 🙏).`;

      const ai = getAIClient();
      const chatHistory = (history || []).map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }));

      // Add user message
      chatHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: chatHistory,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error) {
      const err = error as Error;
      console.error('Gemini Jamaah Chat Error:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access') || errMsg.includes('restricted')) {
        res.status(500).json({ reply: 'Maaf Kak, Akses API Key Gemini Sahabat Marawa saat ini sedang ditolak (PERMISSION_DENIED). Silakan hubungi admin untuk memeriksa limit kuota & billing di Google AI Studio! 🙏✨' });
      } else {
        res.status(500).json({ reply: 'Maaf Kak, Sahabat Marawa saat ini sedang kesulitan terhubung dengan sistem. Silakan coba lagi sebentar ya Kak! 🙏✨' });
      }
    }
  });

  // API Route for general client-side Gemini requests proxying
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { model, contents, config } = req.body;

      if (!contents) {
        return res.status(400).json({ error: 'Payload "contents" wajib diisi' });
      }

      // Map deprecated or legacy model names to the recommended gemini-3.5-flash
      let targetModel = model || 'gemini-3.5-flash';
      if (
        targetModel.includes('1.5') || 
        targetModel.includes('2.0') || 
        targetModel.includes('3-flash-preview') || 
        targetModel.includes('3.1-flash-lite')
      ) {
        targetModel = 'gemini-3.5-flash';
      }

      const ai = getAIClient();
      let response;
      try {
        response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config,
        });
      } catch (innerError) {
        const errMessage = (innerError as Error).message || '';
        console.warn('First attempt failed:', errMessage);
        // If it failed because of permission/denied access and googleSearch tools was requested, retry without tools
        if ((errMessage.includes('PERMISSION_DENIED') || errMessage.includes('denied access') || errMessage.includes('restricted')) && config?.tools) {
          console.warn('API key has no search grounding permission. Retrying without search tools...');
          const fallbackConfig = { ...config };
          delete fallbackConfig.tools;
          response = await ai.models.generateContent({
            model: targetModel,
            contents,
            config: fallbackConfig,
          });
        } else {
          throw innerError;
        }
      }

      res.json({ text: response.text || '', response });
    } catch (error) {
      const err = error as Error;
      console.error('Gemini Universal Proxy Error:', err);
      let errMsg = err.message || '';
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access') || errMsg.includes('restricted')) {
        errMsg = 'Akses API Key Gemini ditolak (PERMISSION_DENIED). Hal ini biasanya terjadi jika kuota habis, kartu kredit kedaluwarsa pada billing Google Cloud, atau API Key ditangguhkan. Silakan periksa keaktifan Key di Google AI Studio.';
      }
      res.status(500).json({ error: errMsg || 'Gagal memproses permintaan AI' });
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
