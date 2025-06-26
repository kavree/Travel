
import React, { useState } from 'react';
import { TripStyle } from '../types';
import { TRIP_STYLES_OPTIONS } from '../constants';
import { SparklesIcon } from './icons';

interface InputFormProps {
  onSubmit: (city: string, tripStyle: TripStyle, tripDays: number) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [city, setCity] = useState<string>('');
  const [tripStyle, setTripStyle] = useState<TripStyle>(TRIP_STYLES_OPTIONS[0].value);
  const [tripDays, setTripDays] = useState<number>(3); // Default to 3 days

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) {
      alert('กรุณาใส่ชื่อเมืองหรือจังหวัด');
      return;
    }
    onSubmit(city, tripStyle, tripDays);
  };

  const dayOptions = [
    { value: 1, label: "1 วัน (ทริปวันเดียว)" },
    { value: 2, label: "2 วัน 1 คืน" },
    { value: 3, label: "3 วัน 2 คืน" },
    { value: 4, label: "4 วัน 3 คืน" },
    { value: 5, label: "5 วัน 4 คืน" },
    { value: 6, label: "6 วัน 5 คืน" },
    { value: 7, label: "7 วัน 6 คืน" },
  ];

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-6 bg-white/70 backdrop-blur-md shadow-xl rounded-xl space-y-6 transition-all duration-300 ease-in-out hover:shadow-2xl"
      aria-labelledby="form-title"
    >
      <h2 id="form-title" className="text-xl font-semibold text-gray-800 text-center mb-2">สร้างแผนการเดินทางของคุณ</h2>
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
          เมืองหรือจังหวัด (City/Province)
        </label>
        <input
          type="text"
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="เช่น เชียงใหม่, ภูเก็ต, Tokyo"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 ease-in-out text-gray-700 placeholder-gray-400"
          disabled={isLoading}
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="tripStyle" className="block text-sm font-medium text-gray-700 mb-1.5">
          สไตล์การท่องเที่ยว (Trip Style)
        </label>
        <select
          id="tripStyle"
          value={tripStyle}
          onChange={(e) => setTripStyle(e.target.value as TripStyle)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 ease-in-out bg-white text-gray-700"
          disabled={isLoading}
          aria-label="Select trip style"
        >
          {TRIP_STYLES_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="tripDays" className="block text-sm font-medium text-gray-700 mb-1.5">
          ระยะเวลาทริป (Trip Duration)
        </label>
        <select
          id="tripDays"
          value={tripDays}
          onChange={(e) => setTripDays(parseInt(e.target.value, 10))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-150 ease-in-out bg-white text-gray-700"
          disabled={isLoading}
          aria-label="Select number of trip days"
        >
          {dayOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading || !city.trim()}
        className="w-full flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-sky-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed group transform active:scale-95"
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
            <SparklesIcon className="w-6 h-6 mr-2.5 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
            เริ่มวางแผนทริป!
          </>
        )}
      </button>
    </form>
  );
};

export default InputForm;