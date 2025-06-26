
import React from 'react';
import { TripPlan } from '../types';
import { MapPinIcon } from './icons';

interface LocationPointersProps {
  plan: TripPlan | null;
}

const LocationPointers: React.FC<LocationPointersProps> = ({ plan }) => {
  if (!plan) return null;

  const uniqueLocations = new Set<string>();

  plan.days.forEach(day => {
    day.activities.forEach(activity => uniqueLocations.add(activity.locationName));
    if(day.afternoonActivities) {
        day.afternoonActivities.forEach(activity => uniqueLocations.add(activity.locationName));
    }
    if (day.lunch) uniqueLocations.add(day.lunch.locationName);
    if (day.dinner) uniqueLocations.add(day.dinner.locationName);
    if (day.accommodation) uniqueLocations.add(day.accommodation.locationName);
  });

  const locationsArray = Array.from(uniqueLocations);

  if (locationsArray.length === 0) return null;

  return (
    <div className="mt-10 p-6 bg-white/80 backdrop-blur-md shadow-xl rounded-xl">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
        <MapPinIcon className="w-6 h-6 mr-2 text-sky-600" />
        จุดหมายปลายทางสำคัญในทริป (Key Locations)
      </h3>
      <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {locationsArray.map((location, index) => (
          <li key={index} className="text-gray-600 hover:text-sky-700 transition-colors">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center group"
            >
              <MapPinIcon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-sky-500 transition-colors flex-shrink-0" />
              <span className="group-hover:underline">{location}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-3">คลิกที่ชื่อสถานที่เพื่อดูบน Google Maps</p>
    </div>
  );
};

export default LocationPointers;
