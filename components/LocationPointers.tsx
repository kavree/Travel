
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
    day.activities.forEach(activity => {
      if (activity.locationName && !activity.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && !activity.locationName.toLowerCase().includes("แนะนำ") && activity.locationName.trim() !== "") {
        uniqueLocations.add(activity.locationName);
      }
    });
    if(day.afternoonActivities) {
        day.afternoonActivities.forEach(activity => {
          if (activity.locationName && !activity.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && !activity.locationName.toLowerCase().includes("แนะนำ") && activity.locationName.trim() !== "") {
            uniqueLocations.add(activity.locationName);
          }
        });
    }
    if (day.lunch && day.lunch.locationName && !day.lunch.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && !day.lunch.locationName.toLowerCase().includes("แนะนำ") && day.lunch.locationName.trim() !== "") {
      uniqueLocations.add(day.lunch.locationName);
    }
    if (day.dinner && day.dinner.locationName && !day.dinner.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && !day.dinner.locationName.toLowerCase().includes("แนะนำ") && day.dinner.locationName.trim() !== "") {
      uniqueLocations.add(day.dinner.locationName);
    }
    if (day.accommodation && day.accommodation.locationName && !day.accommodation.locationName.toLowerCase().includes("ผู้ใช้เลือกตามชอบ") && !day.accommodation.locationName.toLowerCase().includes("แนะนำ") && day.accommodation.locationName.trim() !== "") {
      uniqueLocations.add(day.accommodation.locationName);
    }
  });

  const locationsArray = Array.from(uniqueLocations);

  if (locationsArray.length === 0) return null;

  return (
    <div className="mt-6 p-5 bg-white/70 backdrop-blur-md shadow-xl rounded-xl">
      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center border-b border-gray-300 pb-3">
        <MapPinIcon className="w-6 h-6 mr-2.5 text-sky-600" />
        จุดหมายสำคัญในทริป
      </h3>
      <ul className="space-y-2.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar"> {/* Add custom-scrollbar if defined globally or add styles here */}
        {locationsArray.map((location, index) => (
          <li key={index} className="text-gray-700 hover:text-sky-700 transition-colors duration-150 ease-in-out">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center group p-1.5 rounded-md hover:bg-sky-100/70"
              aria-label={`ดู ${location} บน Google Maps`}
            >
              <MapPinIcon className="w-4 h-4 mr-2.5 text-gray-400 group-hover:text-sky-600 transition-colors duration-150 ease-in-out flex-shrink-0" />
              <span className="text-sm group-hover:font-medium">{location}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-200/80">
        คลิกที่ชื่อสถานที่เพื่อดูรายละเอียดบน Google Maps
      </p>
    </div>
  );
};

export default LocationPointers;