import React from 'react';
import { TripData, IslandStay } from '../types';
import { Sun } from 'lucide-react';
import { LocationWeather, getWeatherForLocation, DEFAULT_WEATHER } from '../data/weatherData';

interface WeatherCardProps {
  trip: TripData;
  variant?: 'banner' | 'floating';
}

const parseDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getCurrentStay = (stays: IslandStay[]): IslandStay | null => {
  if (!stays || stays.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const stay of stays) {
    const start = parseDate(stay.startDate);
    const end = parseDate(stay.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (today >= start && today <= end) {
      return stay;
    }
  }

  const upcoming = stays
    .filter((s) => parseDate(s.startDate) > today)
    .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

  return upcoming[0] || null;
};

const getWeatherForTrip = (trip: TripData): { weather: LocationWeather; isCurrentLocation: boolean; locationNote?: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!trip.stays || trip.stays.length === 0) {
    return { weather: DEFAULT_WEATHER, isCurrentLocation: false };
  }

  const tripStart = parseDate(trip.startDate);
  const tripEnd = parseDate(trip.endDate);
  tripStart.setHours(0, 0, 0, 0);
  tripEnd.setHours(0, 0, 0, 0);

  const currentStay = getCurrentStay(trip.stays);

  if (currentStay) {
    const start = parseDate(currentStay.startDate);
    start.setHours(0, 0, 0, 0);

    if (today.getTime() === start.getTime()) {
      return {
        weather: getWeatherForLocation(currentStay.island),
        isCurrentLocation: true,
        locationNote: `Aankomst dag op ${currentStay.island}`,
      };
    }
    return {
      weather: getWeatherForLocation(currentStay.island),
      isCurrentLocation: true,
    };
  }

  if (today < tripStart) {
    return {
      weather: DEFAULT_WEATHER,
      isCurrentLocation: false,
      locationNote: 'Voor aanvang reis',
    };
  }

  if (today > tripEnd) {
    return {
      weather: DEFAULT_WEATHER,
      isCurrentLocation: false,
      locationNote: 'Reis afgelopen',
    };
  }

  const upcoming = trip.stays
    .filter((s) => parseDate(s.startDate) > today)
    .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

  if (upcoming.length > 0) {
    return {
      weather: getWeatherForLocation(upcoming[0].island),
      isCurrentLocation: false,
      locationNote: `Volgende: ${upcoming[0].island}`,
    };
  }

  return { weather: DEFAULT_WEATHER, isCurrentLocation: false };
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ trip, variant = 'banner' }) => {
  const { weather, isCurrentLocation, locationNote } = getWeatherForTrip(trip);

  if (variant === 'floating') {
    return (
      <aside className="absolute top-24 right-10 w-64 p-4 bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-[#005BAE]/10 hidden xl:block z-30">
        <div className="flex items-center gap-2 mb-2">
          <Sun className="w-5 h-5 text-[#9f402d]" />
          <span className="font-['Inter'] text-[11px] font-bold uppercase tracking-wider text-[#9f402d]">
            Weather Update
          </span>
        </div>
        <h3 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#001a33] mb-0.5">
          {weather.location}, GR
        </h3>
        <p className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-[#005BAE]">
          {weather.temp}°C
        </p>
        <p className="font-['Inter'] text-xs text-[#404752] mt-1">
          {weather.condition}
        </p>

        {!isCurrentLocation && locationNote && (
          <p className="font-['Inter'] text-[10px] text-amber-600 font-medium mt-1">
            {locationNote}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-[#e4efff]">
          <div className="flex justify-between items-center text-[10px] font-['Inter'] font-semibold text-[#717783]">
            <span>SUNRISE</span>
            <span>SUNSET</span>
          </div>
          <div className="flex justify-between items-center font-['Inter'] text-xs font-medium text-[#001a33] mt-0.5">
            <span>{weather.sunrise}</span>
            <span>{weather.sunset}</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="bg-[#005BAE] text-white rounded-[24px] p-6 shadow-lg relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <span className="font-['Inter'] text-xs text-white/80 font-medium">Weerbericht Cycladen</span>
            {!isCurrentLocation && locationNote && (
              <span className="font-['Inter'] text-[10px] text-amber-200 font-medium mt-0.5">{locationNote}</span>
            )}
          </div>
          <Sun className="w-5 h-5 text-amber-300 animate-pulse" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-end gap-1">
              <span className="text-5xl font-bold font-['Plus_Jakarta_Sans']">{weather.temp}°</span>
              <span className="text-xl pb-1 font-['Plus_Jakarta_Sans']">C</span>
            </div>
            <p className="mt-2 text-white/90 font-['Inter'] text-xs leading-relaxed">
              {weather.conditionNl}
            </p>
          </div>
          <div className="text-right">
            <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-white/90">{weather.location}</p>
            <p className="font-['Inter'] text-[10px] text-white/60">{weather.locationGr}</p>
            <div className="mt-2 text-[10px] font-['Inter'] text-white/70">
              <div>↑ {weather.sunrise}</div>
              <div>↓ {weather.sunset}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
