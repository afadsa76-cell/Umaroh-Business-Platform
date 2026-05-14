import React, { useState } from 'react';
import { QuotationView } from './QuotationView';
import { HandlingTemplateView } from './HandlingTemplateView';
import { HotelTemplateView } from './HotelTemplateView';
import { TransportTemplateView } from './TransportTemplateView';
import { MutawifTemplateView } from './MutawifTemplateView';
import { MaskapaiTemplateView } from './MaskapaiTemplateView';
import { VisaTemplateView } from './VisaTemplateView';
import { EquipmentTemplateView } from './EquipmentTemplateView';
import { HandlingDomestikTemplateView } from './HandlingDomestikTemplateView';
import { ZiarahTambahanTemplateView } from './ZiarahTambahanTemplateView';
import { FileSpreadsheet, LayoutTemplate, Building2, Bus, Users, PlaneTakeoff, FileCheck, Package, Home, Map } from 'lucide-react';

type TemplateTab = 'quotation' | 'handling' | 'hotel' | 'transport' | 'mutawif' | 'maskapai' | 'visa' | 'equipment' | 'handling-domestik' | 'ziarah-tambahan';

export const TemplatesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TemplateTab>('quotation');

  const tabs = [
    { id: 'quotation', label: 'Quotation', icon: FileSpreadsheet },
    { id: 'handling', label: 'Handling', icon: LayoutTemplate },
    { id: 'hotel', label: 'Hotel', icon: Building2 },
    { id: 'maskapai', label: 'Maskapai', icon: PlaneTakeoff },
    { id: 'transport', label: 'Transportasi', icon: Bus },
    { id: 'mutawif', label: 'Mutawif', icon: Users },
    { id: 'visa', label: 'Visa', icon: FileCheck },
    { id: 'equipment', label: 'Perlengkapan', icon: Package },
    { id: 'handling-domestik', label: 'Handling Domestik', icon: Home },
    { id: 'ziarah-tambahan', label: 'Ziarah Tambahan', icon: Map },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'quotation': return <QuotationView />;
      case 'handling': return <HandlingTemplateView />;
      case 'hotel': return <HotelTemplateView />;
      case 'maskapai': return <MaskapaiTemplateView />;
      case 'transport': return <TransportTemplateView />;
      case 'mutawif': return <MutawifTemplateView />;
      case 'visa': return <VisaTemplateView />;
      case 'equipment': return <EquipmentTemplateView />;
      case 'handling-domestik': return <HandlingDomestikTemplateView />;
      case 'ziarah-tambahan': return <ZiarahTambahanTemplateView />;
      default: return <QuotationView />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 print:hidden shadow-sm sticky top-0 z-10">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto md:overflow-x-visible md:flex-wrap no-scrollbar gap-2 pb-1 -mb-1 md:justify-center">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    isActive 
                      ? 'bg-amber-100 text-amber-800 shadow-sm ring-1 ring-amber-600/20' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? 'text-amber-700' : 'text-gray-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-grow">
        {renderContent()}
      </div>
    </div>
  );
};
