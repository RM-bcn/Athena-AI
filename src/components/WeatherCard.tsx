import React, { useEffect, useState } from 'react';
import { TripData, IslandStay } from '../types';
import { Sun } from 'lucide-react';
import { LocationWeather, getWeatherForLocation, DEFAULT_WEATHER } from '../data/weatherData';

interface LiveWeather {
  location?: string;
  temperature: number | null;
  condition: string;
  sunrise: string;
  sunset: string;
}

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
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (!trip.stays || trip.stays.length === 0) {
    return { weather: DEFAULT_WEATHER, isCurrentLocation: false };
  }

  const tripStart = new Date(trip.startDate);
  tripStart.setHours(0, 0, 0, 0);
  const tripEnd = new Date(trip.endDate);
  tripEnd.setHours(0, 0, 0, 0);

  // Before the trip starts → show default (Athens) weather with a note
  if (now < tripStart) {
    return {
      weather: DEFAULT_WEATHER,
      isCurrentLocation: false,
      locationNote: `Reis begint ${trip.startDate}`,
    };
  }

  // After the trip ends → show default Athens weather
  if (now > tripEnd) {
    return {
      weather: DEFAULT_WEATHER,
      isCurrentLocation: false,
      locationNote: `Reis afgelopen sinds ${trip.endDate}`,
    };
  }

  // Find the stay that contains today’s date
  const currentStay = trip.stays.find((s) => {
    const sStart = new Date(s.startDate);
    sStart.setHours(0, 0, 0, 0);
    const sEnd = new Date(s.endDate);
    sEnd.setHours(0, 0, 0, 0);
    return now >= sStart && now <= sEnd;
  });

  if (currentStay) {
    const weather = getWeatherForLocation(currentStay.island);
    return {
      weather,
      isCurrentLocation: true,
      locationNote: `Aankomst dag op ${currentStay.island}`,
    };
  }

  // Today is inside the trip window but no current stay (gap between stays)
  // Show the next upcoming stay’s weather
  const upcoming = trip.stays.filter((s) => {
    const sStart = new Date(s.startDate);
    sStart.setHours(0, 0, 0, 0);
    return now < sStart;
  });
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const weather = getWeatherForLocation(next.island);
    return {
      weather,
      isCurrentLocation: false,
      locationNote: `Volgende: ${next.island}`,
    };
  }

  // Final fallback: Athens
  return { weather: DEFAULT_WEATHER, isCurrentLocation: false };
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ trip, variant = 'banner' }) => {
  const { weather, isCurrentLocation, locationNote } = getWeatherForTrip(trip);

  const [live, setLive] = useState<LiveWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weather?city=${encodeURIComponent(weather.location)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && !d.error && typeof d.temperature === 'number') {
          setLive(d);
        }
      })
      .catch(() => {
        // keep static data as fallback
      });
    return () => {
      cancelled = true;
    };
  }, [weather.location]);

  const temp = live?.temperature ?? weather.temp;
  const conditionNl = live?.condition || weather.conditionNl;
  const condition = live?.condition || weather.condition;
  const sunrise = live?.sunrise || weather.sunrise;
  const sunset = live?.sunset || weather.sunset;
  const location = live?.location || weather.location;

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
          {location}, GR
        </h3>
        <p className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-[#005BAE]">
          {temp}°C
        </p>
        <p className="font-['Inter'] text-xs text-[#404752] mt-1">
          {condition}
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
            <span>{sunrise}</span>
            <span>{sunset}</span>
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
              <span className="text-5xl font-bold font-['Plus_Jakarta_Sans']">{temp}°</span>
              <span className="text-xl pb-1 font-['Plus_Jakarta_Sans']">C</span>
            </div>
            <p className="mt-2 text-white/90 font-['Inter'] text-xs leading-relaxed">
              {conditionNl}
            </p>
          </div>
          <div className="text-right">
            <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-white/90">{location}</p>
            <p className="font-['Inter'] text-[10px] text-white/60">{weather.locationGr}</p>
            <div className="mt-2 text-[10px] font-['Inter'] text-white/70">
              <div>↑ {sunrise}</div>
              <div>↓ {sunset}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
