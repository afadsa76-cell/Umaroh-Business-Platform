import React, { useState } from 'react';
import { HotelView } from './HotelView';
import { HandlingSaudiView } from './HandlingSaudiView';
import { TransportView } from './TransportView';
import { EquipmentView } from './EquipmentView';
import { VisaView } from './VisaView';
import { MutawifView } from './MutawifView';
import { MaskapaiView } from './MaskapaiView';
import { HandlingDomestikView } from './HandlingDomestikView';
import { ManasikView } from './ManasikView';
import { ZiarahView } from './ZiarahView';
import { KeretaCepatView } from './KeretaCepatView';
import { PaketMasterView } from './PaketMasterView';
import { KemitraanAdminView } from './database/KemitraanAdminView';
import { BandaraView } from './BandaraView';
import { PaketWisataView } from './PaketWisataView';
import { HotelMediaView } from './database/HotelMediaView';
import { Building2, Plane, Bus, Briefcase, FileText, Users, PlaneTakeoff, BookOpen, Map, Train, Package, Handshake, MapPin, Image as ImageIcon } from 'lucide-react';

type DatabaseTab = 'paketMaster' | 'kemitraan' | 'hotel' | 'hotelMedia' | 'maskapai' | 'bandara' | 'paketWisata' | 'handling' | 'transport' | 'equipment' | 'visa' | 'mutawif' | 'handlingDomestik' | 'manasik' | 'ziarah' | 'keretaCepat';

export const DatabaseView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DatabaseTab>('paketMaster');

  const tabs: { id: DatabaseTab; label: string; icon: React.ElementType }[] = [
    { id: 'paketMaster', label: 'Paket Master', icon: Package },
    { id: 'kemitraan', label: 'Kemitraan', icon: Handshake },
    { id: 'hotel', label: 'Hotel', icon: Building2 },
    { id: 'hotelMedia', label: 'Foto & Jarak Hotel', icon: ImageIcon },
    { id: 'maskapai', label: 'Maskapai', icon: PlaneTakeoff },

    { id: 'bandara', label: 'Bandara & Kota', icon: MapPin },
    { id: 'paketWisata', label: 'Paket Wisata', icon: Map },
    { id: 'handling', label: 'Handling Saudi', icon: Plane },
    { id: 'handlingDomestik', label: 'Handling Domestik', icon: Plane },
    { id: 'transport', label: 'Transportasi', icon: Bus },
    { id: 'keretaCepat', label: 'Kereta Cepat', icon: Train },
    { id: 'equipment', label: 'Perlengkapan', icon: Briefcase },
    { id: 'visa', label: 'Visa', icon: FileText },
    { id: 'manasik', label: 'Manasik', icon: BookOpen },
    { id: 'ziarah', label: 'Ziarah Tambahan', icon: Map },
    { id: 'mutawif', label: 'Data Mutawif', icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'paketMaster': return <PaketMasterView />;
      case 'kemitraan': return <KemitraanAdminView />;
      case 'hotel': return <HotelView />;
      case 'hotelMedia': return <HotelMediaView />;
      case 'maskapai': return <MaskapaiView />;
      case 'bandara': return <BandaraView />;
      case 'paketWisata': return <PaketWisataView />;
      case 'handling': return <HandlingSaudiView />;
      case 'handlingDomestik': return <HandlingDomestikView />;
      case 'transport': return <TransportView />;
      case 'keretaCepat': return <KeretaCepatView />;
      case 'equipment': return <EquipmentView />;
      case 'visa': return <VisaView />;
      case 'manasik': return <ManasikView />;
      case 'ziarah': return <ZiarahView />;
      case 'mutawif': return <MutawifView />;
      default: return <PaketMasterView />;
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
