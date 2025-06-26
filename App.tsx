/// <reference types="@types/google.maps" />
import React, { useState, useCallback, useEffect, useRef } from 'react';
import InputForm from './components/InputForm';
import TripPlanDisplay from './components/TripPlanDisplay';
import LocationPointers from './components/LocationPointers';
import MapViewer from './components/MapViewer'; // Corrected import path
import { generateTripPlan } from './services/geminiService';
import { TripPlan, TripStyle } from './types';
import { 
  APP_TITLE, 
  API_KEY_ERROR_MESSAGE, 
  GOOGLE_MAPS_API_KEY_ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  LOCAL_STORAGE_TRIP_PLAN_KEY
} from './constants';
import { MapPinIcon, SaveIcon, FolderOpenIcon, TrashIcon, InfoCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from './components/icons';

declare global {
  interface Window {
    initMapApp?: () => void;
    google?: typeof google; // More specific type for Google Maps SDK
  }
}

const App: React.FC = () => {
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'info' | 'error', message: string} | null>(null);

  // Initialize API keys from environment variables
  const geminiApiKey = process.env.API_KEY;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const isGeminiApiKeyMissing = !geminiApiKey;
  const isGoogleMapsApiKeyMissing = !googleMapsApiKey;

  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  
  const notificationTimeoutRef = useRef<number | null>(null);

  const clearNotification = useCallback(() => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(null);
  }, []);

  const showNotification = useCallback((type: 'success' | 'info' | 'error', message: string, duration: number = 4000) => {
    clearNotification();
    setNotification({ type, message });
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
    }, duration);
  }, [clearNotification]);

  useEffect(() => {
    if (!isGoogleMapsApiKeyMissing && !window.google?.maps) {
      // Check if the script is already added to prevent duplicates if component re-renders fast
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // If script tag exists but window.google.maps is not set, it might be still loading
        // or failed. initMapApp should handle setting mapsApiLoaded.
        // console.log("Google Maps script tag already present.");
        if (window.google?.maps) { // It might have loaded between checks
           setMapsApiLoaded(true);
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=marker,places,geocoding&callback=initMapApp`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error("Google Maps script failed to load.");
        setMapsApiError("Failed to load Google Maps script. Map features will be unavailable.");
        showNotification('error', "Failed to load Google Maps script. Check console for details.", 5000);
      };
      
      window.initMapApp = () => {
        // console.log("Google Maps API script loaded and initMapApp called.");
        if (window.google && window.google.maps) {
            setMapsApiLoaded(true);
        } else {
            console.error("initMapApp called, but window.google.maps is not available.");
            setMapsApiError("Google Maps API initialized, but not available. Try refreshing.");
            showNotification('error', "Google Maps API initialized incompletely. Try refreshing.", 5000);
        }
      };
      document.head.appendChild(script);

      return () => {
        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
          // document.head.removeChild(existingScript); // Usually not needed to remove unless causing issues
        }
        if (window.initMapApp) {
             delete window.initMapApp; // Clean up the global callback
        }
      };
    } else if (window.google?.maps) {
        setMapsApiLoaded(true); 
    } else if (isGoogleMapsApiKeyMissing) {
        // console.log("Google Maps API key is missing. Map features disabled.");
    }
    
    loadPlanFromStorage(false); // silent load
    
    return () => {
      clearNotification(); 
    };
  }, [isGoogleMapsApiKeyMissing, googleMapsApiKey, showNotification, clearNotification]);


  const handlePlanRequest = useCallback(async (city: string, tripStyle: TripStyle) => {
    clearNotification();
    if (isGeminiApiKeyMissing) {
      setError(API_KEY_ERROR_MESSAGE);
      showNotification('error', API_KEY_ERROR_MESSAGE, 5000);
      return;
    }
    setIsLoading(true);
    setError(null);
    setTripPlan(null); // Clear previous plan before new request
    try {
      const plan = await generateTripPlan(city, tripStyle);
      setTripPlan(plan);
      showNotification('success', 'Trip plan generated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE;
      setError(errorMessage);
      showNotification('error', errorMessage, 5000);
      console.error("Error generating trip plan:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isGeminiApiKeyMissing, showNotification, clearNotification]);

  const savePlanToStorage = () => {
    clearNotification();
    if (tripPlan) {
      try {
        localStorage.setItem(LOCAL_STORAGE_TRIP_PLAN_KEY, JSON.stringify(tripPlan));
        showNotification('success', 'Trip plan saved successfully!');
      } catch (e) {
        console.error("Failed to save plan to LocalStorage:", e);
        showNotification('error', 'Failed to save trip plan. Storage might be full.');
      }
    } else {
      showNotification('info', 'No trip plan to save.');
    }
  };

  const loadPlanFromStorage = useCallback((verbose = true) => {
    clearNotification();
    try {
      const savedPlanJson = localStorage.getItem(LOCAL_STORAGE_TRIP_PLAN_KEY);
      if (savedPlanJson) {
        const plan = JSON.parse(savedPlanJson) as TripPlan;
        setTripPlan(plan);
        if (verbose) showNotification('success', 'Saved trip plan loaded!');
      } else {
        if (verbose) showNotification('info', 'No saved trip plan found.');
      }
    } catch (e) {
      console.error("Failed to load plan from LocalStorage:", e);
      if (verbose) showNotification('error', 'Failed to load saved trip plan.');
      localStorage.removeItem(LOCAL_STORAGE_TRIP_PLAN_KEY); 
    }
  }, [showNotification, clearNotification]);
  
  const clearSavedPlan = () => {
    clearNotification();
    try {
      localStorage.removeItem(LOCAL_STORAGE_TRIP_PLAN_KEY);
      showNotification('success', 'Saved trip plan cleared from storage.');
    } catch (e) {
        console.error("Failed to clear plan from LocalStorage:", e);
        showNotification('error', 'Failed to clear saved trip plan.');
    }
  };

  const clearCurrentPlan = () => {
    clearNotification();
    setTripPlan(null);
    setError(null); // Also clear any errors related to the previous plan
    showNotification('info', 'Current trip plan cleared.');
  };

  const currentDisablingCondition = isLoading || isGeminiApiKeyMissing;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 inline-flex items-center">
          <MapPinIcon className="w-10 h-10 md:w-12 md:h-12 mr-3 animate-bounce" />
          {APP_TITLE}
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
          ป้อนชื่อเมืองและสไตล์การท่องเที่ยวของคุณ แล้วให้ AI ช่วยวางแผนทริป 3 วัน 2 คืนสุดพิเศษ!
        </p>
      </header>

      {notification && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-md shadow-lg text-white max-w-sm transition-all duration-300 ease-in-out transform ${notification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0' }
          ${notification.type === 'success' ? 'bg-green-500' : ''}
          ${notification.type === 'info' ? 'bg-sky-500' : ''}
          ${notification.type === 'error' ? 'bg-red-500' : ''}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center">
            {notification.type === 'success' && <CheckCircleIcon className="w-6 h-6 mr-2 flex-shrink-0"/>}
            {notification.type === 'info' && <InfoCircleIcon className="w-6 h-6 mr-2 flex-shrink-0"/>}
            {notification.type === 'error' && <ExclamationTriangleIcon className="w-6 h-6 mr-2 flex-shrink-0"/>}
            <span className="flex-grow">{notification.message}</span>
            <button onClick={clearNotification} className="ml-3 -mr-1 -my-1.5 bg-transparent rounded-lg p-1.5 inline-flex h-8 w-8 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50" aria-label="Dismiss">
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <InputForm onSubmit={handlePlanRequest} isLoading={isLoading} />
          
          <div className="p-4 bg-white/80 backdrop-blur-md shadow-lg rounded-xl space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-3">จัดการแผนการเดินทาง</h3>
            <button
              onClick={savePlanToStorage}
              disabled={!tripPlan || isLoading}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <SaveIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              บันทึกแผนปัจจุบัน (Save Plan)
            </button>
            <button
              onClick={() => loadPlanFromStorage()}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <FolderOpenIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              โหลดแผนที่บันทึกไว้ (Load Saved)
            </button>
             <button
              onClick={clearCurrentPlan}
              disabled={(!tripPlan && !error) || isLoading} // Disable if no plan/error or loading
              className="w-full flex items-center justify-center px-4 py-2.5 bg-amber-500 text-white font-medium rounded-lg shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <TrashIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              ล้างแผนปัจจุบัน (Clear Current)
            </button>
            <button
              onClick={clearSavedPlan}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <TrashIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              ล้างแผนที่บันทึกไว้ (Clear Saved)
            </button>
          </div>

          {isGeminiApiKeyMissing && !isLoading && (
            <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-md" role="alert">
              <h3 className="font-bold flex items-center"><ExclamationTriangleIcon className="w-5 h-5 mr-2"/>เกิดข้อผิดพลาดในการตั้งค่า Gemini API</h3>
              <p>{API_KEY_ERROR_MESSAGE}</p>
            </div>
          )}

          {isGoogleMapsApiKeyMissing && (
            <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md" role="alert">
              <h3 className="font-bold flex items-center"><ExclamationTriangleIcon className="w-5 h-5 mr-2"/>คำเตือนการตั้งค่า Google Maps API</h3>
              <p>{GOOGLE_MAPS_API_KEY_ERROR_MESSAGE}</p>
              <p className="text-sm mt-1">ฟีเจอร์แผนที่จะไม่สามารถใช้งานได้</p>
            </div>
          )}
          {mapsApiError && ( // Display error from Google Maps script loading
             <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-md" role="alert">
              <h3 className="font-bold flex items-center"><ExclamationTriangleIcon className="w-5 h-5 mr-2"/>Google Maps API Error</h3>
              <p>{mapsApiError}</p>
            </div>
          )}

          {/* Display general error from Gemini or other issues */}
          {error && !isGeminiApiKeyMissing && (
            <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-md" role="alert">
              <h3 className="font-bold flex items-center"><ExclamationTriangleIcon className="w-5 h-5 mr-2"/>เกิดข้อผิดพลาด</h3>
              <p>{error}</p>
            </div>
          )}
          
          {isLoading && !isGeminiApiKeyMissing && (
            <div className="mt-10 text-center">
              <div role="status" className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-sky-700 bg-sky-100 transition ease-in-out duration-150">
                <svg aria-hidden="true" className="animate-spin -ml-1 mr-3 h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI กำลังคิดแผนเที่ยวสุดเจ๋งให้คุณ...
              </div>
            </div>
          )}
           <LocationPointers plan={tripPlan} />
        </div>

        <div className="md:col-span-2 space-y-8">
          {tripPlan && !isLoading && !error && (
            <TripPlanDisplay plan={tripPlan} />
          )}
          
          <div className="mt-8" aria-labelledby="map-heading">
             <h2 id="map-heading" className="sr-only">แผนที่แสดงตำแหน่งในแผนการเดินทาง</h2>
             <MapViewer 
                plan={tripPlan} 
                googleMapsApiKey={googleMapsApiKey} // Pass the key itself
                mapsApiLoaded={mapsApiLoaded}
                showNotification={showNotification}
             />
          </div>
        </div>
      </main>
      
      <footer className="text-center mt-12 py-6 border-t border-gray-300/70">
        <p className="text-sm text-gray-500">
          ขับเคลื่อนโดย Gemini API, Google Maps API & React. สร้างสรรค์โดย AI.
        </p>
         <p className="text-xs text-gray-400 mt-1">
          Smart Travel Planner v1.1.0
        </p>
      </footer>
    </div>
  );
};

export default App;