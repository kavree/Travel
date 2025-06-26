
import React, { useEffect, useRef, useState } from 'react';
import { TripPlan, GeocodedLocation, LatLngLiteral } from '../types';
import { GOOGLE_MAPS_API_KEY_ERROR_MESSAGE, DAY_COLORS } from '../constants';
import { MapPinIcon, ExclamationTriangleIcon } from './icons';

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

  // Initialize map
  useEffect(() => {
    if (mapsApiLoaded && mapRef.current && !googleMapRef.current) {
      if (!window.google || !window.google.maps) {
        setMapError("Google Maps library is not available even after API load. Try refreshing.");
        showNotification('error', "Google Maps library error. Try refreshing.", 5000);
        return;
      }
      try {
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 13.7563, lng: 100.5018 }, // Default to Bangkok
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [ // Subtle map styling
            {featureType: "poi.business", stylers: [{visibility: "off"}]},
            {featureType: "transit", elementType: "labels.icon", stylers: [{visibility: "off"}]},
          ]
        });
        infoWindowRef.current = new window.google.maps.InfoWindow();
        setMapError(null);
      } catch (e) {
        console.error("Error initializing Google Map:", e);
        setMapError("Failed to initialize Google Map. Ensure the API key is valid and has Maps JavaScript API enabled.");
        showNotification('error', "Failed to initialize Google Map.", 5000);
      }
    }
  }, [mapsApiLoaded, showNotification]);

  // Geocode locations when plan changes
  useEffect(() => {
    if (!plan || !mapsApiLoaded || !googleMapRef.current || !window.google?.maps?.Geocoder) {
      setGeocodedLocations([]); // Clear locations if no plan or map not ready
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
    
    // Filter out locations with generic names that are hard to geocode accurately
    const significantLocations = locationsToGeocode.filter(loc => 
        loc.locationName && 
        !loc.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && 
        !loc.locationName.toLowerCase().includes("แนะนำ") &&
        !loc.locationName.toLowerCase().includes("ย่าน") &&
        loc.locationName.trim() !== ""
    );


    if (significantLocations.length === 0) {
        setGeocodedLocations([]);
        return;
    }

    setIsGeocoding(true);
    setMapError(null);
    const promises = significantLocations.map(loc =>
      new Promise<GeocodedLocation>((resolve) => {
        geocoder.geocode({ address: loc.locationName + (plan.tripTitle.includes(loc.locationName) ? "" : `, ${plan.tripTitle.split('ที่ ')[1]?.split(' (')[0] || ''}`) }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve({ 
                ...loc, 
                position: { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() } 
            });
          } else {
            console.warn(`Geocoding failed for ${loc.locationName}: ${status}`);
            resolve({ ...loc, position: null });
          }
        });
      })
    );

    Promise.all(promises).then(results => {
      setGeocodedLocations(results.filter(r => r.position !== null));
      setIsGeocoding(false);
      if (results.some(r => r.position === null)) {
        showNotification('info', 'Some locations could not be geocoded accurately.', 3000);
      }
    }).catch(err => {
        console.error("Error during geocoding batch:", err);
        showNotification('error', "An error occurred while geocoding locations.", 3000);
        setIsGeocoding(false);
    });

  }, [plan, mapsApiLoaded, showNotification]);

  // Update map markers and polylines
  useEffect(() => {
    if (!googleMapRef.current || !mapsApiLoaded) return;

    // Clear previous markers and polylines
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach(polyline => polyline.setMap(null));
    polylinesRef.current = [];

    if (geocodedLocations.length === 0) {
        // Optionally reset map view if no locations
        // googleMapRef.current.setCenter({ lat: 13.7563, lng: 100.5018 });
        // googleMapRef.current.setZoom(6);
        return;
    }

    const bounds = new window.google.maps.LatLngBounds();

    geocodedLocations.forEach((loc) => {
      if (loc.position) {
        const marker = new window.google.maps.Marker({
          position: loc.position,
          map: googleMapRef.current,
          title: `${loc.title} (${loc.locationName})`,
          // Consider custom icons per day or type
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: DAY_COLORS[loc.day - 1] || '#FE7569',
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: '#ffffff'
          }
        });

        marker.addListener('click', () => {
          if (infoWindowRef.current && googleMapRef.current) {
            let content = `<div class="p-2 font-sans">
                <h3 class="font-bold text-md mb-1">${loc.title}</h3>
                <p class="text-sm text-gray-700">${loc.locationName}</p>`;
            if (loc.time) {
                content += `<p class="text-xs text-gray-500 mt-1">Time: ${loc.time}</p>`;
            }
            content += `<p class="text-xs text-blue-500 mt-1 hover:underline"><a href="https://maps.google.com/?q=${encodeURIComponent(loc.locationName)}" target="_blank" rel="noopener noreferrer">View on Google Maps</a></p>
            </div>`;
            infoWindowRef.current.setContent(content);
            infoWindowRef.current.open(googleMapRef.current, marker);
          }
        });
        markersRef.current.push(marker);
        bounds.extend(loc.position);
      }
    });

    // Draw polylines per day
    if (plan) {
        plan.days.forEach((dayPlan, dayIndex) => {
            const pathCoordinates: LatLngLiteral[] = [];
            const dayLocations = geocodedLocations.filter(loc => loc.day === dayPlan.day && loc.position);
            
            // A simple sort by time string if available, otherwise order of appearance
            // This is a naive sort, proper time parsing would be more robust.
            dayLocations.sort((a,b) => {
                const timeA = a.time || "";
                const timeB = b.time || "";
                if (timeA < timeB) return -1;
                if (timeA > timeB) return 1;
                return 0;
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
                strokeWeight: 3,
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
      } else {
        googleMapRef.current.fitBounds(bounds);
      }
    } else if (plan?.tripTitle) { // No markers, but have a plan, try to center on the main city
        const geocoder = new window.google.maps.Geocoder();
        const cityFromName = plan.tripTitle.split('ที่ ')[1]?.split(' (')[0];
        if (cityFromName) {
            geocoder.geocode({address: cityFromName }, (results, status) => {
                if (status === 'OK' && results && results[0] && googleMapRef.current) {
                    googleMapRef.current.setCenter(results[0].geometry.location);
                    googleMapRef.current.setZoom(10);
                }
            });
        }
    }


  }, [geocodedLocations, mapsApiLoaded, plan]);

  if (!googleMapsApiKey) {
    return (
      <div className="p-6 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 rounded-md shadow" role="alert">
        <div className="flex">
          <div className="py-1"><ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3"/></div>
          <div>
            <p className="font-bold">Google Maps API Key Missing</p>
            <p className="text-sm">{GOOGLE_MAPS_API_KEY_ERROR_MESSAGE} Map features are disabled.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!mapsApiLoaded && !mapError) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-100 rounded-xl shadow-inner">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-sky-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 font-medium">Loading Map...</p>
        </div>
      </div>
    );
  }
  
  if (mapError) {
     return (
      <div className="p-6 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md shadow" role="alert">
        <div className="flex">
          <div className="py-1"><ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3"/></div>
          <div>
            <p className="font-bold">Map Error</p>
            <p className="text-sm">{mapError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative shadow-xl rounded-xl">
        {isGeocoding && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                <div className="text-center p-4 bg-white shadow-lg rounded-lg">
                     <svg className="animate-spin h-6 w-6 text-sky-600 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-700 font-medium">Locating places on map...</p>
                </div>
            </div>
        )}
        <div ref={mapRef} id="map-container" style={{ height: 'clamp(400px, 60vh, 700px)' }} className="w-full rounded-xl" aria-label="Google Map displaying trip locations">
            {!plan && !isGeocoding && (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500 rounded-xl">
                    <MapPinIcon className="w-16 h-16 mb-4 text-gray-400"/>
                    <p className="text-lg">Generate a trip plan to see locations on the map.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default MapViewer;
