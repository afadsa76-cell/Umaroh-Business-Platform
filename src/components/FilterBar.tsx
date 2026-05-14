import React from 'react';
import { Search, Filter, Building, Calendar, RotateCcw, MapPin } from 'lucide-react';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  mealFilter: string;
  onMealFilterChange: (value: string) => void;
  vendorFilter: string;
  onVendorFilterChange: (value: string) => void;
  cityFilter: string;
  onCityFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  onResetFilters: () => void;
  vendors: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  mealFilter,
  onMealFilterChange,
  vendorFilter,
  onVendorFilterChange,
  cityFilter,
  onCityFilterChange,
  dateFilter,
  onDateFilterChange,
  onResetFilters,
  vendors,
}) => {
  return (
    <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8">
      <div className="flex flex-wrap gap-3 md:gap-4 items-center">
        <div className="relative flex-grow min-w-[250px] w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
          <input
            type="text"
            placeholder="Search hotels..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-[160px]">
          <Calendar className="text-gray-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            className="w-full p-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-gray-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-[160px]">
          <Filter className="text-gray-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <select
            value={mealFilter}
            onChange={(e) => onMealFilterChange(e.target.value)}
            className="w-full p-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
          >
            <option value="ALL">All Meal Plans</option>
            <option value="FB">Full Board (FB)</option>
            <option value="HB">Half Board (HB)</option>
            <option value="RO">Room Only (RO)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-[160px]">
          <MapPin className="text-gray-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <select
            value={cityFilter}
            onChange={(e) => onCityFilterChange(e.target.value)}
            className="w-full p-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
          >
            <option value="ALL">All Cities</option>
            <option value="Makkah">Makkah</option>
            <option value="Madinah">Madinah</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-[160px]">
          <Building className="text-gray-400 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
          <select
            value={vendorFilter}
            onChange={(e) => onVendorFilterChange(e.target.value)}
            className="w-full p-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
          >
            <option value="ALL">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onResetFilters}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors w-full sm:w-auto"
          title="Reset Filters"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="sm:hidden lg:inline">Reset</span>
        </button>
      </div>
    </div>
  );
};
