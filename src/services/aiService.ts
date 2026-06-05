/* eslint-disable @typescript-eslint/no-explicit-any */

export const generateItinerary = async (packageData: any) => {
  const prompt = `Generate a detailed day-by-day itinerary for an Umrah package with the following details:
  Package Name: ${packageData.nama}
  Duration: ${packageData.durasiHari} days
  Makkah Hotel: ${packageData.hotelMakkahNama} (Stay: ${packageData.durasiMakkah} days)
  Madinah Hotel: ${packageData.hotelMadinahNama} (Stay: ${packageData.durasiMadinah} days)
  Category: ${packageData.kategori}
  Departure Date: ${packageData.tglBerangkat}

  Please provide a professional, engaging, and detailed itinerary. Format the output in Markdown. 
  Include religious activities (Umrah, Ziarah), travel days, and leisure time.`;

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        contents: prompt
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Fail to call AI API');
    }
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

export const generateMarketingCopy = async (packageData: any) => {
  const prompt = `Create a marketing social media post and a persuasive description for this Umrah package:
  Package Name: ${packageData.nama}
  Duration: ${packageData.durasiHari} days
  Prices: Double ${packageData.priceDouble}, Triple ${packageData.priceTriple}, Quad ${packageData.priceQuad} (IDR)
  Makkah Hotel: ${packageData.hotelMakkahNama}
  Madinah Hotel: ${packageData.hotelMadinahNama}
  Hotels stars: Makkah (${packageData.hotelMakkahStars}*), Madinah (${packageData.hotelMadinahStars}*)
  Airlines: ${packageData.maskapaiNama}
  
  The tone should be spiritual, persuasive, and professional. Target Indonesian audience. Use emojis.
  Format the output in Markdown.`;

  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-3.5-flash',
        contents: prompt
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Fail to call AI API');
    }
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
