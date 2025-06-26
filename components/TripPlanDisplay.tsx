
import React from 'react';
import { TripPlan, DayPlan, Activity, Meal, Accommodation } from '../types';
import { CalendarDaysIcon, MapPinIcon, SunIcon, BuildingOfficeIcon, SparklesIcon, GlobeAltIcon, ClockIcon, UsersIcon, HomeIcon, ShoppingBagIcon, CakeIcon } from './icons'; // Added more icons

interface TripPlanDisplayProps {
  plan: TripPlan;
}

const getItemIcon = (itemType: string, itemName?:string) => {
  const lowerItemName = itemName?.toLowerCase() || "";
  if (itemType === 'activity' || itemType === 'afternoon-activity') {
    if (lowerItemName.includes('วัด') || lowerItemName.includes('temple')) return <GlobeAltIcon className="w-5 h-5 text-amber-500" />;
    if (lowerItemName.includes('ตลาด') || lowerItemName.includes('market')) return <ShoppingBagIcon className="w-5 h-5 text-cyan-500" />;
    if (lowerItemName.includes('คาเฟ่') || lowerItemName.includes('cafe')) return <CakeIcon className="w-5 h-5 text-pink-500" />;
    return <SunIcon className="w-5 h-5 text-orange-500" />;
  }
  if (itemType === 'lunch' || itemType === 'dinner') return <UsersIcon className="w-5 h-5 text-teal-500" />;
  if (itemType === 'accommodation') return <HomeIcon className="w-5 h-5 text-indigo-500" />;
  return <MapPinIcon className="w-5 h-5 text-sky-500" />;
};


const ActivityItem: React.FC<{ item: Activity | Meal | Accommodation, itemType: string }> = ({ item, itemType }) => {
  const isActivity = 'description' in item;
  const isMeal = 'name' in item && 'time' in item;
  const isAccommodation = 'name' in item && !('time' in item);

  let title = '';
  let detail = '';
  let timeInfo = '';

  if (isActivity) {
    title = (item as Activity).description;
    timeInfo = (item as Activity).time;
  } else if (isMeal) {
    title = (item as Meal).name;
    detail = `${(item as Meal).time}`;
    timeInfo = (item as Meal).time;
  } else if (isAccommodation) {
    title = (item as Accommodation).name;
    detail = 'ที่พักสำหรับคืนนี้';
  }
  
  const itemIcon = getItemIcon(itemType, title);

  return (
    <div className="flex items-start space-x-4 py-3 transition-colors hover:bg-sky-50/50 rounded-md px-2 -mx-2">
      <div className="flex-shrink-0 mt-1 opacity-80">
        {itemIcon}
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-gray-800">{title}</p>
        {isActivity && timeInfo && (
           <p className="text-xs text-gray-500 flex items-center mt-0.5">
             <ClockIcon className="w-3 h-3 mr-1 text-gray-400"/> {timeInfo}
           </p>
        )}
         {isMeal && detail && (
           <p className="text-xs text-gray-500 flex items-center mt-0.5">
             <ClockIcon className="w-3 h-3 mr-1 text-gray-400"/> {detail}
           </p>
        )}
         {isAccommodation && detail && (
           <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
        )}
        <p className="text-sm text-gray-600 mt-1">
            <a 
                href={`https://maps.google.com/?q=${encodeURIComponent(item.locationName)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sky-600 hover:text-sky-700 hover:underline transition-colors group"
                aria-label={`ดู ${item.locationName} บน Google Maps`}
            >
                <MapPinIcon className="w-4 h-4 mr-1.5 text-sky-500 group-hover:text-sky-600 transition-colors flex-shrink-0" />
                {item.locationName}
            </a>
        </p>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2 flex items-center pt-2">
    {icon && <span className="mr-2 opacity-80">{icon}</span>}
    {title}
  </h4>
);


const DayCard: React.FC<{ dayPlan: DayPlan, dayColor: string }> = ({ dayPlan, dayColor }) => (
  <div 
    className="bg-white/90 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.015]"
    style={{ '--day-color': dayColor } as React.CSSProperties}
  >
    <div className="p-5 bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-600 text-white">
      <h3 className="text-2xl font-bold flex items-center">
        <CalendarDaysIcon className="w-7 h-7 mr-3 opacity-90" />
        วันที่ {dayPlan.day}
      </h3>
      {dayPlan.theme && <p className="text-sm opacity-90 mt-1.5 ml-10">{dayPlan.theme}</p>}
    </div>
    <div className="p-5 space-y-4">
      {dayPlan.activities && dayPlan.activities.length > 0 && (
        <div>
          <SectionHeader title="กิจกรรม" icon={<SunIcon className="w-4 h-4" />} />
          <div className="divide-y divide-gray-200/70">
            {dayPlan.activities.map((activity, index) => (
              <ActivityItem key={`activity-${index}`} item={activity} itemType="activity" />
            ))}
          </div>
        </div>
      )}
      
      {dayPlan.lunch && (
         <div>
          <SectionHeader title="อาหารกลางวัน" icon={<UsersIcon className="w-4 h-4" />} />
           <div className="divide-y divide-gray-200/70">
             <ActivityItem item={dayPlan.lunch} itemType="lunch"/>
           </div>
        </div>
      )}

      {dayPlan.afternoonActivities && dayPlan.afternoonActivities.length > 0 && (
        <div>
           <SectionHeader title="กิจกรรมช่วงบ่าย" icon={<SunIcon className="w-4 h-4 text-orange-400" />} />
           <div className="divide-y divide-gray-200/70">
            {dayPlan.afternoonActivities.map((activity, index) => (
              <ActivityItem key={`afternoon-activity-${index}`} item={activity} itemType="afternoon-activity" />
            ))}
          </div>
        </div>
      )}
      
      {dayPlan.dinner && (
        <div>
          <SectionHeader title="อาหารเย็น" icon={<UsersIcon className="w-4 h-4" />} />
           <div className="divide-y divide-gray-200/70">
            <ActivityItem item={dayPlan.dinner} itemType="dinner"/>
          </div>
        </div>
      )}

      {dayPlan.accommodation && (
        <div>
          <SectionHeader title="ที่พัก" icon={<HomeIcon className="w-4 h-4" />} />
           <div className="divide-y divide-gray-200/70">
            <ActivityItem item={dayPlan.accommodation} itemType="accommodation"/>
          </div>
        </div>
      )}
    </div>
  </div>
);


const TripPlanDisplay: React.FC<TripPlanDisplayProps> = ({ plan }) => {
  const dayColors = ['#2dd4bf', '#60a5fa', '#c084fc', '#fb7185', '#facc15']; // teal-400, blue-400, purple-400, rose-400, amber-400

  return (
    <div className="mt-8 space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight sm:text-4xl inline-flex items-center">
          <SparklesIcon className="w-8 h-8 mr-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600" />
          {plan.tripTitle}
        </h2>
      </div>
      <div className={`grid md:grid-cols-1 ${plan.days.length > 1 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} ${plan.days.length > 2 ? 'xl:grid-cols-3' : ''} gap-6 xl:gap-8`}>
        {plan.days.map((dayPlan, index) => (
          <DayCard key={dayPlan.day} dayPlan={dayPlan} dayColor={dayColors[index % dayColors.length]} />
        ))}
      </div>
    </div>
  );
};

export default TripPlanDisplay;