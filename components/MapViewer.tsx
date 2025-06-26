
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TripPlan, GeocodedLocation, LatLngLiteral } from '../types';
import { GOOGLE_MAPS_API_KEY_ERROR_MESSAGE, DAY_COLORS } from '../constants';
import { MapPinIcon, ExclamationTriangleIcon, SparklesIcon } from './icons';

interface MapViewerProps {
  plan: TripPlan | null;
  googleMapsApiKey: string | undefined;
  mapsApiLoaded: boolean;
  showNotification: (type: 'success' | 'info' | 'error', message: string, duration?: number) => void;
}

const MapViewer: React.FC<MapViewerProps> = ({ plan, googleMapsApiKey, mapsApiLoaded, showNotification }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [geocodedLocations, setGeocodedLocations] = useState<GeocodedLocation[]>([]);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const clearMapElements = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);
  
  useEffect(() => {
    if (mapsApiLoaded && mapRef.current && !googleMapRef.current) {
      if (!window.google || !window.google.maps) {
        const errMsg = "Google Maps library is not available even after API load. Try refreshing.";
        setMapError(errMsg);
        showNotification('error', errMsg, 5000);
        return;
      }
      try {
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 13.7563, lng: 100.5018 }, 
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          styles: [ 
            {featureType: "poi.business", stylers: [{visibility: "off"}]},
            {featureType: "transit", elementType: "labels.icon", stylers: [{visibility: "off"}]},
            {
              featureType: "all",
              elementType: "labels.text.stroke",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#747474" }] // Darker label fill for better contrast
            },
            {
              featureType: "road", // Softer road colors
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "road",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "water", // Pleasant water color
              elementType: "geometry",
              stylers: [{ color: "#a_d8f0e8" }] // Softer blue: e.g. Tailwind sky-200
            },
            {
              featureType: "landscape", // Natural landscape color
              elementType: "geometry",
              stylers: [{ color: "#f_5f_6f_7" }] // e.g. Tailwind neutral-100
            },
          ]
        });
        infoWindowRef.current = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -10) // Adjust InfoWindow position
        });
        setMapError(null);
      } catch (e) {
        console.error("Error initializing Google Map:", e);
        const errMsg = "Failed to initialize Google Map. Ensure the API key is valid and has Maps JavaScript API enabled.";
        setMapError(errMsg);
        showNotification('error', errMsg, 5000);
      }
    }
  }, [mapsApiLoaded, showNotification]);

  useEffect(() => {
    clearMapElements();
    if (!plan || !mapsApiLoaded || !googleMapRef.current || !window.google?.maps?.Geocoder) {
      setGeocodedLocations([]); 
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    const locationsToGeocode: { 
        locationName: string; 
        day: number; 
        type: GeocodedLocation['type'];
        title: string;
        time?: string;
    }[] = [];

    plan.days.forEach(dayPlan => {
      dayPlan.activities.forEach(activity => locationsToGeocode.push({ ...activity, day: dayPlan.day, type: 'activity', title: activity.description, time: activity.time }));
      if (dayPlan.afternoonActivities) {
        dayPlan.afternoonActivities.forEach(activity => locationsToGeocode.push({ ...activity, day: dayPlan.day, type: 'afternoon-activity', title: activity.description, time: activity.time }));
      }
      if (dayPlan.lunch) locationsToGeocode.push({ ...dayPlan.lunch, day: dayPlan.day, type: 'lunch', title: dayPlan.lunch.name, time: dayPlan.lunch.time });
      if (dayPlan.dinner) locationsToGeocode.push({ ...dayPlan.dinner, day: dayPlan.day, type: 'dinner', title: dayPlan.dinner.name, time: dayPlan.dinner.time });
      if (dayPlan.accommodation) locationsToGeocode.push({ ...dayPlan.accommodation, day: dayPlan.day, type: 'accommodation', title: dayPlan.accommodation.name });
    });
    
    const significantLocations = locationsToGeocode.filter(loc => 
        loc.locationName && 
        !loc.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && 
        !loc.locationName.toLowerCase().includes("แนะนำ") &&
        !loc.locationName.toLowerCase().includes("ย่าน") && // Keep "ย่าน" if it's specific like "ย่านเมืองเก่า"
        !loc.locationName.toLowerCase().startsWith("โรงแรม") && // Allow specific hotel names
        !loc.locationName.toLowerCase().startsWith("ที่พัก") && // Allow specific accommodation names
        loc.locationName.trim() !== "" &&
        loc.locationName.length > 3 // Basic filter for very short/generic names
    );


    if (significantLocations.length === 0) {
        setGeocodedLocations([]);
        if (googleMapRef.current && plan?.tripTitle) {
            const cityFromNameRegex = plan.tripTitle.match(/ที่\s(.*?)\s\(/);
            const cityFromName = cityFromNameRegex ? cityFromNameRegex[1] : null;
            if (cityFromName) {
                geocoder.geocode({address: cityFromName }, (results, status) => {
                    if (status === 'OK' && results && results[0] && googleMapRef.current) {
                        googleMapRef.current.setCenter(results[0].geometry.location);
                        googleMapRef.current.setZoom(10);
                    }
                });
            }
        }
        return;
    }

    setIsGeocoding(true);
    setMapError(null);
    const promises = significantLocations.map(loc =>
      new Promise<GeocodedLocation>((resolve) => {
        const cityFromNameRegex = plan.tripTitle.match(/ที่\s(.*?)\s\(/);
        const cityContext = cityFromNameRegex ? cityFromNameRegex[1] : '';
        const addressToGeocode = loc.locationName.includes(cityContext) || cityContext === '' ? loc.locationName : `${loc.locationName}, ${cityContext}`;

        geocoder.geocode({ address: addressToGeocode }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            resolve({ 
                ...loc, 
                position: { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() } 
            });
          } else {
            console.warn(`Geocoding failed for ${loc.locationName} (address: "${addressToGeocode}"): ${status}`);
            resolve({ ...loc, position: null });
          }
        });
      })
    );

    Promise.all(promises).then(results => {
      setGeocodedLocations(results.filter(r => r.position !== null));
      setIsGeocoding(false);
      if (results.some(r => r.position === null) && results.filter(r => r.position !== null).length > 0) { // only show if some were successful
        showNotification('info', 'สถานที่บางแห่งไม่สามารถแสดงบนแผนที่ได้', 3000);
      } else if (results.every(r => r.position === null) && significantLocations.length > 0) {
        showNotification('error', 'ไม่สามารถค้นหาสถานที่ใดๆ บนแผนที่ได้', 3000);
      }
    }).catch(err => {
        console.error("Error during geocoding batch:", err);
        showNotification('error', "เกิดข้อผิดพลาดขณะเตรียมตำแหน่งบนแผนที่", 3000);
        setIsGeocoding(false);
    });

  }, [plan, mapsApiLoaded, showNotification, clearMapElements]);

  useEffect(() => {
    if (!googleMapRef.current || !mapsApiLoaded || !window.google?.maps?.Marker || !window.google?.maps?.LatLngBounds || !window.google?.maps?.Polyline) return;
    
    clearMapElements();

    if (geocodedLocations.length === 0) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();

    geocodedLocations.forEach((loc) => {
      if (loc.position && googleMapRef.current && infoWindowRef.current && window.google?.maps?.Marker && window.google?.maps?.SymbolPath) {
        const markerIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8.5,
            fillColor: DAY_COLORS[(loc.day - 1) % DAY_COLORS.length] || '#FE7569',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          };

        const marker = new window.google.maps.Marker({
          position: loc.position,
          map: googleMapRef.current,
          title: `${loc.title} (${loc.locationName})`,
          icon: markerIcon,
          animation: google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
          if (infoWindowRef.current && googleMapRef.current) { 
            let content = `
              <div style="font-family: 'Inter', sans-serif; padding: 4px; max-width: 280px;">
                <h3 style="font-weight: 600; font-size: 1rem; margin-bottom: 4px; color: #1f2937;">${loc.title}</h3>
                <p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 2px;">${loc.locationName}</p>`;
            if (loc.time) {
                content += `<p style="font-size: 0.75rem; color: #6b7280; margin-top: 4px;">เวลา: ${loc.time}</p>`;
            }
            content += `
                <p style="margin-top: 6px;">
                  <a href="https://maps.google.com/?q=${encodeURIComponent(loc.locationName)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: #2563eb; text-decoration: none; hover: {text-decoration: underline;}">
                    ดูบน Google Maps
                  </a>
                </p>
              </div>`;
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open(googleMapRef.current, marker);
          }
        });
        markersRef.current.push(marker);
        bounds.extend(loc.position);
      }
    });

    if (plan && googleMapRef.current && window.google?.maps?.Polyline) {
        plan.days.forEach((dayPlan, dayIndex) => {
            const pathCoordinates: LatLngLiteral[] = [];
            const dayLocations = geocodedLocations.filter(loc => loc.day === dayPlan.day && loc.position);
            
            dayLocations.sort((a,b) => {
                const timeA = a.time?.split(" - ")[0] || "00:00"; 
                const timeB = b.time?.split(" - ")[0] || "00:00";
                return timeA.localeCompare(timeB);
            });
            
            dayLocations.forEach(loc => {
                if(loc.position) pathCoordinates.push(loc.position);
            });

            if (pathCoordinates.length > 1) {
                const polyline = new window.google.maps.Polyline({
                    path: pathCoordinates,
                    geodesic: true,
                    strokeColor: DAY_COLORS[dayIndex % DAY_COLORS.length],
                    strokeOpacity: 0.8,
                    strokeWeight: 4.5,
                });
                polyline.setMap(googleMapRef.current);
                polylinesRef.current.push(polyline);
            }
        });
    }

    if (markersRef.current.length > 0 && googleMapRef.current) {
      if (markersRef.current.length === 1 && markersRef.current[0].getPosition()) {
        googleMapRef.current.setCenter(markersRef.current[0].getPosition()!);
        googleMapRef.current.setZoom(14);
      } else if (!bounds.isEmpty()) { 
        googleMapRef.current.fitBounds(bounds, {top: 50, bottom: 50, left: 50, right: 50}); // Add padding
      }
    }
  }, [geocodedLocations, mapsApiLoaded, plan, clearMapElements]);


  if (!googleMapsApiKey) {
    return (
      <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-xl shadow-lg" role="alert">
        <div className="flex">
          <div className="py-1"><ExclamationTriangleIcon className="h-7 w-7 text-yellow-500 mr-4"/></div>
          <div>
            <p className="font-semibold text-lg">Google Maps API Key Missing</p>
            <p className="text-sm mt-1">{GOOGLE_MAPS_API_KEY_ERROR_MESSAGE} ฟีเจอร์แผนที่จะไม่สามารถใช้งานได้</p>
          </div>
        </div>
      </div>
    );
  }

  const mapContainerStyle = { height: 'clamp(450px, 65vh, 750px)' };

  if (!mapsApiLoaded && !mapError) { 
    return (
      <div id="map-container" style={mapContainerStyle} className="w-full rounded-xl flex flex-col items-center justify-center bg-gray-100 shadow-inner border border-gray-200">
        <svg className="animate-spin h-10 w-10 text-sky-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 font-medium text-lg">กำลังโหลดแผนที่...</p>
        <p className="text-gray-500 text-sm mt-1">กรุณารอสักครู่</p>
      </div>
    );
  }
  
  if (mapError) {
     return (
      <div id="map-container" style={mapContainerStyle} className="w-full rounded-xl p-6 bg-red-50 border-l-4 border-red-400 text-red-800 shadow-lg" role="alert">
        <div className="flex">
          <div className="py-1"><ExclamationTriangleIcon className="h-7 w-7 text-red-500 mr-4"/></div>
          <div>
            <p className="font-semibold text-lg">Map Error</p>
            <p className="text-sm mt-1">{mapError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative shadow-xl rounded-xl border border-gray-200/50">
        {isGeocoding && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl" aria-busy="true" aria-live="polite">
                <div className="text-center p-6 bg-white shadow-2xl rounded-lg">
                     <svg className="animate-spin h-8 w-8 text-sky-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-700 font-medium text-md">กำลังค้นหาสถานที่บนแผนที่...</p>
                </div>
            </div>
        )}
        <div 
            ref={mapRef} 
            id="map-container" 
            style={mapContainerStyle} 
            className="w-full rounded-xl bg-gray-50"
            aria-label="Google Map displaying trip locations"
            role="application"
        >
            {(!plan && !isGeocoding && mapsApiLoaded && !mapError && geocodedLocations.length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                    <SparklesIcon className="w-16 h-16 mb-6 text-sky-400 opacity-80"/>
                    <p className="text-xl font-semibold text-gray-700">แผนที่พร้อมแสดงการผจญภัยของคุณ!</p>
                    <p className="text-md mt-2">สร้างแผนการเดินทางใหม่ หรือโหลดแผนที่บันทึกไว้เพื่อดูสถานที่ต่างๆ บนแผนที่</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default MapViewer;