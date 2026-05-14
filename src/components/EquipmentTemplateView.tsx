import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Download, MapPin, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { sanitizeForHtml2Canvas } from '../utils/exportUtils';
import { equipmentData } from '../data/equipment';
import { logoBase64 } from '../utils/logoBase64';

export const EquipmentTemplateView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currency, setCurrency] = useState<'IDR' | 'USD' | 'SAR'>('IDR');
  const [kursUSD, setKursUSD] = useState<number>(17000);
  const [kursSAR, setKursSAR] = useState<number>(4700);
  const [totalPax, setTotalPax] = useState<number>(45);
  const [margin, setMargin] = useState<number>(7);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [rows, setRows] = useState(Array(10).fill({ item: '', harga: '' }));

  const formatCurrency = (amount: number) => {
    let finalAmount = amount;
    let currencyCode = currency;
    
    if (currency === 'USD') {
      finalAmount = amount / kursUSD;
    } else if (currency === 'SAR') {
      finalAmount = amount / kursSAR;
    }

    return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
      maximumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(finalAmount);
  };

  useEffect(() => {
    const initialRows = equipmentData.map(item => ({
      item: item.name,
      harga: formatCurrency(item.roundedPrice)
    }));
    
    // Fill up to 10 rows
    const filledRows = [...initialRows];
    while (filledRows.length < 10) {
      filledRows.push({ item: '', harga: '' });
    }
    setRows(filledRows);
  }, [currency, kursUSD, kursSAR, margin]);

  const handleRowChange = (index: number, field: 'item' | 'harga', value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    
    setIsGeneratingImage(true);
    
    const originalElement = printRef.current;
    const originalInputs = originalElement.querySelectorAll('input, textarea, select');
    originalInputs.forEach((el: any) => {
      if (el.tagName === 'INPUT') {
        el.setAttribute('value', el.value);
      } else if (el.tagName === 'TEXTAREA') {
        el.innerHTML = el.value;
      }
    });

    const clone = originalElement.cloneNode(true) as HTMLElement;
    
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = `${originalElement.offsetWidth}px`;
    document.body.appendChild(clone);
    
    // Sanitize colors for html2canvas compatibility
    sanitizeForHtml2Canvas(clone.ownerDocument);
    
    try {
      const cloneInputs = clone.querySelectorAll('input, textarea, select');
      cloneInputs.forEach((el: any) => {
        const div = document.createElement('div');
        div.className = el.className;
        div.style.cssText = el.style.cssText;
        const computedStyle = window.getComputedStyle(el);
        div.style.textAlign = computedStyle.textAlign;
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        if (computedStyle.textAlign === 'center') {
            div.style.justifyContent = 'center';
        } else if (computedStyle.textAlign === 'right') {
            div.style.justifyContent = 'flex-end';
        } else {
            div.style.justifyContent = 'flex-start';
        }
        div.innerText = el.value || el.getAttribute('value') || '';
        if (el.parentNode) {
          el.parentNode.replaceChild(div, el);
        }
      });

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          sanitizeForHtml2Canvas(clonedDoc);
        }
      } as any);

      const image = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `Perlengkapan_Template_${selectedDate || 'Draft'}.jpg`;
      link.click();

    } catch (error) {
      console.error('Image generation failed:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      document.body.removeChild(clone);
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">
      
      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 w-full max-w-[210mm] flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-500 w-5 h-5" />
            <span className="font-medium text-gray-700 text-sm">Periode:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-36 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">Currency:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-24 text-sm"
            >
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
              <option value="SAR">SAR</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className="text-gray-500 w-4 h-4" />
            <span className="font-medium text-gray-700 text-sm">Kurs USD:</span>
            <input
              type="number"
              value={kursUSD}
              onChange={(e) => setKursUSD(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-24 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className="text-gray-500 w-4 h-4" />
            <span className="font-medium text-gray-700 text-sm">Kurs SAR:</span>
            <input
              type="number"
              value={kursSAR}
              onChange={(e) => setKursSAR(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-24 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 text-sm">Total PAX:</span>
            <input
              type="number"
              value={totalPax}
              onChange={(e) => setTotalPax(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-20 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-500 w-4 h-4 flex items-center justify-center text-xs">$</span>
            <span className="font-medium text-gray-700 text-sm">Margin (%):</span>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-20 text-sm"
            />
          </div>
        </div>
        
        <div className="flex justify-end border-t pt-3">
          <button 
            onClick={handleDownloadImage}
            disabled={isGeneratingImage}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isGeneratingImage ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGeneratingImage ? 'Generating JPG...' : 'Download JPG'}
          </button>
        </div>
      </div>

      {/* A4 Aspect Ratio Container */}
      <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-[#FDB913] shadow-2xl relative text-gray-900 font-sans flex flex-col print:shadow-none print:m-0 border-4 border-purple-500 p-8">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start relative z-10 mb-8">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
               <img src={logoBase64} alt="Umaroh Logo" className="h-14" />
            </div>
            <p className="text-[10px] italic font-semibold ml-1 tracking-wide">Platform Digital Umrah & Haji Pertama di Indonesia</p>
          </div>
          
          <div className="border-l-2 border-gray-900 pl-6 py-1">
            <h1 className="text-4xl font-bold leading-tight mb-2">Perlengkapan</h1>
            <div className="border-b-2 border-gray-900 w-full mb-2"></div>
            <h3 className="text-xl font-bold">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Periode'}
            </h3>
          </div>
        </div>

        {/* Table */}
        <div className="relative z-10 mb-6 flex-grow">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-900 text-[#FDB913] text-center font-bold uppercase text-sm tracking-wider">
                <th className="p-3 border-r border-gray-700 w-2/3">ITEM PERLENGKAPAN</th>
                <th className="p-3 w-1/3">HARGA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="border-r border-gray-200 p-0 h-12">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent px-4 outline-none font-medium text-sm"
                      value={row.item}
                      onChange={(e) => handleRowChange(index, 'item', e.target.value)}
                    />
                  </td>
                  <td className="p-0 h-12">
                    <input
                      type="text"
                      className="w-full h-full bg-transparent text-center outline-none font-bold text-emerald-700 text-lg"
                      value={row.harga}
                      onChange={(e) => handleRowChange(index, 'harga', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Contact Bar */}
        <div className="mt-auto pt-6 flex justify-between items-end relative z-10">
            <div>
                <h4 className="font-bold text-xl uppercase mb-1">Call admin Ops</h4>
                <div className="font-bold text-lg tracking-wide">+62 838 4497 4952</div>
            </div>

            <div className="text-left max-w-[250px] text-[10px] font-bold leading-tight">
                <div className="flex items-start gap-2">
                    <MapPin className="w-6 h-6 flex-shrink-0 fill-gray-900 text-[#FDB913]" />
                    <p>Jl. Tangkuban Prahu No.7, RT.01/RW.05, Babakan, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16128</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
