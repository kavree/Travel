
import React, { useState } from 'react';
import { TripStyle } from '../types';
import { TRIP_STYLES_OPTIONS } from '../constants';
import { SparklesIcon } from './icons';

interface InputFormProps {
  onSubmit: (city: string, tripStyle: TripStyle) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [city, setCity] = useState<string>('');
  const [tripStyle, setTripStyle] = useState<TripStyle>(TRIP_STYLES_OPTIONS[0].value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      alert('กรุณาใส่ชื่อเมืองหรือจังหวัด');
      return;
    }
    onSubmit(city, tripStyle);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white/80 backdrop-blur-md shadow-xl rounded-xl space-y-6 transform transition-all hover:scale-[1.01]">
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อเมืองหรือจังหวัด (City/Province)
        </label>
        <input
          type="text"
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="เช่น เชียงใหม่, ภูเก็ต, กรุงเทพฯ"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="tripStyle" className="block text-sm font-medium text-gray-700 mb-1">
          สไตล์การท่องเที่ยว (Trip Style)
        </label>
        <select
          id="tripStyle"
          value={tripStyle}
          onChange={(e) => setTripStyle(e.target.value as TripStyle)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors bg-white"
          disabled={isLoading}
        >
          {TRIP_STYLES_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed group"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            กำลังวางแผน...
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
            วางแผนทริป (Plan Trip)
          </>
        )}
      </button>
    </form>
  );
};

export default InputForm;
