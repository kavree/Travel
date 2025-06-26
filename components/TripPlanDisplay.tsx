
import React from 'react';
import { TripPlan, DayPlan, Activity, Meal, Accommodation } from '../types';
import { CalendarDaysIcon, MapPinIcon, SunIcon, BuildingOfficeIcon } from './icons';

interface TripPlanDisplayProps {
  plan: TripPlan;
}

const ActivityItem: React.FC<{ item: Activity | Meal | Accommodation }> = ({ item }) => {
  const isActivity = 'description' in item;
  const isMeal = 'name' in item && 'time' in item; // Meal
  const isAccommodation = 'name' in item && !('time' in item); // Accommodation

  let title = '';
  let detail = '';
  if (isActivity) {
    title = (item as Activity).description;
    detail = (item as Activity).time;
  } else if (isMeal) {
    title = (item as Meal).name;
    detail = `มื้ออาหาร: ${(item as Meal).time}`;
  } else if (isAccommodation) {
    title = (item as Accommodation).name;
    detail = 'ที่พักสำหรับคืนนี้';
  }

  return (
    <div className="flex items-start space-x-3 py-2">
      <MapPinIcon className="w-5 h-5 text-sky-500 mt-1 flex-shrink-0" />
      <div>
        <p className="font-medium text-gray-800">{title}</p>
        {detail && <p className="text-xs text-gray-500">{detail}</p>}
        <p className="text-xs text-gray-500">
            <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(item.locationName)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-sky-600 hover:underline"
            >
                📍 {item.locationName}
            </a>
        </p>
      </div>
    </div>
  );
};


const DayCard: React.FC<{ dayPlan: DayPlan }> = ({ dayPlan }) => (
  <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl overflow-hidden transform transition-all hover:shadow-2xl hover:scale-[1.02]">
    <div className="p-5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
      <h3 className="text-2xl font-bold flex items-center">
        <CalendarDaysIcon className="w-7 h-7 mr-2" />
        วันที่ {dayPlan.day}
      </h3>
      {dayPlan.theme && <p className="text-sm opacity-90 mt-1">{dayPlan.theme}</p>}
    </div>
    <div className="p-5 space-y-4">
      {dayPlan.activities && dayPlan.activities.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center"><SunIcon className="w-4 h-4 mr-1.5"/>กิจกรรมช่วงเช้า/บ่าย</h4>
          <div className="divide-y divide-gray-200">
            {dayPlan.activities.map((activity, index) => (
              <ActivityItem key={`activity-${index}`} item={activity} />
            ))}
            {dayPlan.afternoonActivities && dayPlan.afternoonActivities.map((activity, index) => (
              <ActivityItem key={`afternoon-activity-${index}`} item={activity} />
            ))}
          </div>
        </div>
      )}
      
      {dayPlan.lunch && (
         <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">อาหารกลางวัน</h4>
           <ActivityItem item={dayPlan.lunch} />
        </div>
      )}
      
      {dayPlan.dinner && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">อาหารเย็น</h4>
          <ActivityItem item={dayPlan.dinner} />
        </div>
      )}

      {dayPlan.accommodation && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center"><BuildingOfficeIcon className="w-4 h-4 mr-1.5"/>ที่พัก</h4>
          <ActivityItem item={dayPlan.accommodation} />
        </div>
      )}
    </div>
  </div>
);


const TripPlanDisplay: React.FC<TripPlanDisplayProps> = ({ plan }) => {
  return (
    <div className="mt-8 space-y-8">
      <h2 className="text-3xl font-extrabold text-center text-gray-800 tracking-tight sm:text-4xl">
        {plan.tripTitle}
      </h2>
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        {plan.days.map((dayPlan) => (
          <DayCard key={dayPlan.day} dayPlan={dayPlan} />
        ))}
      </div>
    </div>
  );
};

export default TripPlanDisplay;
