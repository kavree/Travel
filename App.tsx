
import React, { useState, useCallback, useEffect, useRef } from 'react';
import InputForm from './components/InputForm';
import TripPlanDisplay from './components/TripPlanDisplay';
import LocationPointers from './components/LocationPointers';
import MapViewer from './components/MapViewer';
import { generateTripPlan } from './services/geminiService';
import { TripPlan, TripStyle } from './types';
import {
  APP_TITLE,
  API_KEY_ERROR_MESSAGE,
  GOOGLE_MAPS_API_KEY_ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  LOCAL_STORAGE_TRIP_PLAN_KEY
} from './constants';
import { MapPinIcon, SaveIcon, FolderOpenIcon, TrashIcon, InfoCircleIcon, CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon } from './components/icons';

// --- Google Maps API Type Declarations ---
declare namespace google {
  namespace maps {
    // --- Interfaces for object literals ---
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface Icon {
        path: any; // string | google.maps.SymbolPath (which is a specific constant)
        scale?: number;
        fillColor?: string;
        fillOpacity?: number;
        strokeWeight?: number;
        strokeColor?: string;
    }

    interface MarkerOptions {
        position?: LatLng | LatLngLiteral;
        map?: Map;
        title?: string;
        icon?: string | Icon | any; // google.maps.Symbol
        animation?: any; // google.maps.Animation (which is a specific constant)
    }

    interface PolylineOptions {
        path?: LatLng[] | LatLngLiteral[];
        geodesic?: boolean;
        strokeColor?: string;
        strokeOpacity?: number;
        strokeWeight?: number;
        map?: Map;
    }

    interface InfoWindowOptions {
        content?: string | Node;
        pixelOffset?: Size;
        position?: LatLng | LatLngLiteral;
    }

    interface MapOptions {
        center?: LatLng | LatLngLiteral;
        zoom?: number;
        mapTypeControl?: boolean;
        streetViewControl?: boolean;
        fullscreenControl?: boolean;
        zoomControl?: boolean;
        gestureHandling?: string;
        styles?: any[]; // MapTypeStyle[]
    }

    interface GeocoderRequest {
        address: string;
    }

    interface GeocoderResult {
        geometry: {
            location: LatLng;
        };
    }

    interface MapsEventListener {
        remove: () => void;
    }

    // --- Classes & Objects/Enums (stubs) ---
    class Map {
      constructor(mapDiv: HTMLElement | null, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds | LatLngBoundsLiteral, padding?: number | any): void;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng | null;
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
    }

    class Polyline {
      constructor(opts?: PolylineOptions);
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      setContent(content: string | Node): void;
      open(mapOrStreetView?: Map | any /* StreetViewPanorama */, anchor?: MVCObject | Marker): void;
      close(): void;
    }

    class Geocoder {
      constructor();
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void): void;
    }

    enum GeocoderStatus {
      OK = "OK",
      ERROR = "ERROR",
      INVALID_REQUEST = "INVALID_REQUEST",
      OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
      REQUEST_DENIED = "REQUEST_DENIED",
      UNKNOWN_ERROR = "UNKNOWN_ERROR",
      ZERO_RESULTS = "ZERO_RESULTS"
    }

    class LatLng {
      constructor(lat: number, lng: number, noWrap?: boolean);
      lat(): number;
      lng(): number;
      equals(other: LatLng | null): boolean;
      toJSON(): LatLngLiteral;
    }

    interface LatLngBoundsLiteral {
        east: number;
        north: number;
        south: number;
        west: number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
      isEmpty(): boolean;
    }

    const SymbolPath: {
      CIRCLE: any;
    };

    const Animation: {
      DROP: any;
      BOUNCE: any;
    };

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      width: number;
      height: number;
    }

    class MVCObject {
        addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
    }
  }
}
// --- End Google Maps API Type Declarations ---


declare global {
  interface Window {
    initMapApp?: () => void;
    google?: {
      maps: typeof google.maps; // This will now correctly refer to the namespace defined above
    };
  }
}

const App: React.FC = () => {
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'info' | 'error', message: string} | null>(null);

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
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        if (window.google?.maps) {
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
        showNotification('error', "Failed to load Google Maps. Map features disabled.", 5000);
      };

      window.initMapApp = () => {
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
        if (window.initMapApp) {
             delete window.initMapApp;
        }
      };
    } else if (window.google?.maps) {
        setMapsApiLoaded(true);
    }

    loadPlanFromStorage(false);

    return () => {
      clearNotification();
    };
  }, [isGoogleMapsApiKeyMissing, googleMapsApiKey, showNotification, clearNotification]);


  const handlePlanRequest = useCallback(async (city: string, tripStyle: TripStyle, tripDays: number) => {
    clearNotification();
    if (isGeminiApiKeyMissing) {
      setError(API_KEY_ERROR_MESSAGE);
      showNotification('error', API_KEY_ERROR_MESSAGE, 5000);
      return;
    }
    setIsLoading(true);
    setError(null);
    setTripPlan(null);
    try {
      const plan = await generateTripPlan(city, tripStyle, tripDays);
      setTripPlan(plan);
      showNotification('success', 'แผนการเดินทางของคุณพร้อมแล้ว!');
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
        showNotification('success', 'บันทึกแผนการเดินทางสำเร็จ!');
      } catch (e) {
        console.error("Failed to save plan to LocalStorage:", e);
        showNotification('error', 'ไม่สามารถบันทึกแผนได้ พื้นที่จัดเก็บอาจเต็ม');
      }
    } else {
      showNotification('info', 'ไม่มีแผนการเดินทางให้บันทึก');
    }
  };

  const loadPlanFromStorage = useCallback((verbose = true) => {
    clearNotification();
    try {
      const savedPlanJson = localStorage.getItem(LOCAL_STORAGE_TRIP_PLAN_KEY);
      if (savedPlanJson) {
        const plan = JSON.parse(savedPlanJson) as TripPlan;
        setTripPlan(plan);
        if (verbose) showNotification('success', 'โหลดแผนที่บันทึกไว้สำเร็จ!');
      } else {
        if (verbose) showNotification('info', 'ไม่พบแผนการเดินทางที่บันทึกไว้');
      }
    } catch (e) {
      console.error("Failed to load plan from LocalStorage:", e);
      if (verbose) showNotification('error', 'ไม่สามารถโหลดแผนที่บันทึกไว้ได้');
      localStorage.removeItem(LOCAL_STORAGE_TRIP_PLAN_KEY);
    }
  }, [showNotification, clearNotification]);

  const clearSavedPlan = () => {
    clearNotification();
    try {
      localStorage.removeItem(LOCAL_STORAGE_TRIP_PLAN_KEY);
      setTripPlan(null); // Also clear current plan if it was the saved one
      showNotification('success', 'ลบแผนที่บันทึกไว้ออกจากที่จัดเก็บแล้ว');
    } catch (e) {
        console.error("Failed to clear plan from LocalStorage:", e);
        showNotification('error', 'ไม่สามารถลบแผนที่บันทึกไว้ได้');
    }
  };

  const clearCurrentPlan = () => {
    clearNotification();
    setTripPlan(null);
    setError(null);
    showNotification('info', 'ล้างแผนการเดินทางปัจจุบันแล้ว');
  };

  const getNotificationStyles = () => {
    if (!notification) return '';
    switch (notification.type) {
      case 'success': return 'bg-green-500 border-green-600';
      case 'info': return 'bg-sky-500 border-sky-600';
      case 'error': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-700 border-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
      <header className="text-center mb-10 md:mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-full shadow-lg mb-4">
          <SparklesIcon className="w-10 h-10 md:w-12 md:h-12 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-800">
          {APP_TITLE}
        </h1>
        <p className="mt-4 text-base md:text-lg text-gray-600 max-w-xl mx-auto">
          ให้ AI อัจฉริยะของเราช่วยคุณวางแผนการเดินทางครั้งต่อไป! เพียงระบุเมือง สไตล์ และจำนวนวัน แล้วปล่อยให้เวทมนตร์เกิดขึ้น
        </p>
      </header>

      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-xl text-white max-w-md transition-all duration-300 ease-in-out border-l-4 ${getNotificationStyles()} ${notification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0' }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center">
            {notification.type === 'success' && <CheckCircleIcon className="w-7 h-7 mr-3 flex-shrink-0"/>}
            {notification.type === 'info' && <InfoCircleIcon className="w-7 h-7 mr-3 flex-shrink-0"/>}
            {notification.type === 'error' && <ExclamationTriangleIcon className="w-7 h-7 mr-3 flex-shrink-0"/>}
            <span className="flex-grow text-sm font-medium">{notification.message}</span>
            <button
              onClick={clearNotification}
              className="ml-4 -mr-1 -my-1.5 bg-transparent rounded-md p-1.5 inline-flex items-center justify-center text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Dismiss notification"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
            </button>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
        <div className="md:col-span-1 space-y-6">
          <InputForm onSubmit={handlePlanRequest} isLoading={isLoading} />

          <div className="p-5 bg-white/70 backdrop-blur-md shadow-xl rounded-xl">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-300 pb-3 mb-4">จัดการแผนการเดินทาง</h3>
            <div className="space-y-3">
              <button
                onClick={savePlanToStorage}
                disabled={!tripPlan || isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                <SaveIcon className="w-5 h-5 mr-2.5 group-hover:scale-110 transition-transform" />
                บันทึกแผนปัจจุบัน
              </button>
              <button
                onClick={() => loadPlanFromStorage()}
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-sky-600 text-white font-medium rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                <FolderOpenIcon className="w-5 h-5 mr-2.5 group-hover:scale-110 transition-transform" />
                โหลดแผนที่บันทึกไว้
              </button>
               <button
                onClick={clearCurrentPlan}
                disabled={(!tripPlan && !error) || isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-amber-500 text-white font-medium rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                <TrashIcon className="w-5 h-5 mr-2.5 group-hover:rotate-[15deg] transition-transform" />
                ล้างแผนปัจจุบัน
              </button>
              <button
                onClick={clearSavedPlan}
                disabled={isLoading} // Consider disabling if no saved plan exists (check localStorage)
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                <TrashIcon className="w-5 h-5 mr-2.5 group-hover:rotate-[15deg] transition-transform" />
                ล้างแผนที่บันทึกไว้
              </button>
            </div>
          </div>

          {isGeminiApiKeyMissing && !isLoading && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md" role="alert">
              <div className="flex">
                <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-red-500 flex-shrink-0"/>
                <div>
                  <h3 className="font-semibold">เกิดข้อผิดพลาดในการตั้งค่า Gemini API</h3>
                  <p className="text-sm">{API_KEY_ERROR_MESSAGE}</p>
                </div>
              </div>
            </div>
          )}

          {isGoogleMapsApiKeyMissing && (
             <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 rounded-lg shadow-md" role="alert">
              <div className="flex">
                <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-yellow-500 flex-shrink-0"/>
                <div>
                  <h3 className="font-semibold">คำเตือนการตั้งค่า Google Maps API</h3>
                  <p className="text-sm">{GOOGLE_MAPS_API_KEY_ERROR_MESSAGE}</p>
                  <p className="text-xs mt-1">ฟีเจอร์แผนที่จะไม่สามารถใช้งานได้</p>
                </div>
              </div>
            </div>
          )}
          {mapsApiError && (
             <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md" role="alert">
              <div className="flex">
                <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-red-500 flex-shrink-0"/>
                <div>
                  <h3 className="font-semibold">Google Maps API Error</h3>
                  <p className="text-sm">{mapsApiError}</p>
                </div>
              </div>
            </div>
          )}

          {error && !isGeminiApiKeyMissing && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md" role="alert">
              <div className="flex">
                <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-red-500 flex-shrink-0"/>
                <div>
                  <h3 className="font-semibold">เกิดข้อผิดพลาด</h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {isLoading && !isGeminiApiKeyMissing && (
            <div className="mt-10 text-center">
              <div role="status" className="inline-flex items-center px-6 py-3 font-semibold leading-6 text-sm shadow-md rounded-lg text-sky-700 bg-sky-100 transition ease-in-out duration-150">
                <svg aria-hidden="true" className="animate-spin -ml-1 mr-3 h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI กำลังสร้างสรรค์แผนเที่ยวให้คุณ...
              </div>
            </div>
          )}
           <LocationPointers plan={tripPlan} />
        </div>

        <div className="md:col-span-2 space-y-8 lg:space-y-10">
          {tripPlan && !isLoading && !error && (
            <TripPlanDisplay plan={tripPlan} />
          )}

          <div className="mt-8" aria-labelledby="map-heading">
             <h2 id="map-heading" className="sr-only">แผนที่แสดงตำแหน่งในแผนการเดินทาง</h2>
             <MapViewer
                plan={tripPlan}
                googleMapsApiKey={googleMapsApiKey}
                mapsApiLoaded={mapsApiLoaded}
                showNotification={showNotification}
             />
          </div>
        </div>
      </main>

      <footer className="text-center mt-16 py-8 border-t border-gray-300/60">
        <p className="text-sm text-gray-500">
          ขับเคลื่อนโดย Gemini API, Google Maps API & React.
        </p>
         <p className="text-xs text-gray-400 mt-2">
          Smart Travel Planner &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default App;
