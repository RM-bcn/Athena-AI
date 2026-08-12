export interface LocationWeather {
  location: string;
  locationGr: string;
  temp: number;
  unit: string;
  condition: string;
  conditionNl: string;
  sunrise: string;
  sunset: string;
}

export const CYCLADS_WEATHER: Record<string, LocationWeather> = {
  'athens': {
    location: 'Athens',
    locationGr: 'Athína',
    temp: 32,
    unit: 'C',
    condition: 'Clear skies, warm Mediterranean evening.',
    conditionNl: 'Heldere lucht, warme Middellandse-Zee avond.',
    sunrise: '06:38 AM',
    sunset: '08:22 PM',
  },
  'milos': {
    location: 'Milos',
    locationGr: 'Mílos',
    temp: 28,
    unit: 'C',
    condition: 'Sunny with a gentle Meltemi breeze. Perfect for sailing.',
    conditionNl: 'Zonnig met milde Meltemi zeewind. Ideaal zeilweer.',
    sunrise: '06:40 AM',
    sunset: '08:18 PM',
  },
  'naxos': {
    location: 'Naxos',
    locationGr: 'Náxos',
    temp: 28,
    unit: 'C',
    condition: 'Sunny with a gentle Meltemi breeze. Perfect for sailing.',
    conditionNl: 'Zonnig met milde Meltemi zeewind. Ideaal zeilweer tussen de eilanden.',
    sunrise: '06:42 AM',
    sunset: '08:14 PM',
  },
  'koufonisia': {
    location: 'Koufonisia',
    locationGr: 'Koufonísia',
    temp: 27,
    unit: 'C',
    condition: 'Clear and calm. Crystal clear waters for swimming.',
    conditionNl: 'Heldere lucht en rustig water. Kristalhelder water om te zwemmen.',
    sunrise: '06:43 AM',
    sunset: '08:12 PM',
  },
  'paros': {
    location: 'Paros',
    locationGr: 'Páros',
    temp: 28,
    unit: 'C',
    condition: 'Sunny and breezy. Great windsurfing conditions.',
    conditionNl: 'Zonnig en winderig. Perfect voor windsurfen.',
    sunrise: '06:41 AM',
    sunset: '08:15 PM',
  },
  'antiparos': {
    location: 'Antiparos',
    locationGr: 'Antíparos',
    temp: 27,
    unit: 'C',
    condition: 'Calm and sunny. Ideal for beach days.',
    conditionNl: 'Rustig en zonnig. Ideaal voor stranddagen.',
    sunrise: '06:41 AM',
    sunset: '08:14 PM',
  },
  'mykonos': {
    location: 'Mykonos',
    locationGr: 'Mýkonos',
    temp: 27,
    unit: 'C',
    condition: 'Sunny with steady Meltemi winds. Warm and inviting.',
    conditionNl: 'Zonnig met aanhoudende Meltemi wind. Warm en uitnodigend.',
    sunrise: '06:39 AM',
    sunset: '08:16 PM',
  },
  'santorini': {
    location: 'Santorini',
    locationGr: 'Santoríni',
    temp: 29,
    unit: 'C',
    condition: 'Clear and warm. Stunning sunset expected tonight.',
    conditionNl: 'Heldere lucht en warm. Prachtige zonsondergang verwacht vanavond.',
    sunrise: '06:44 AM',
    sunset: '08:10 PM',
  },
  'syros': {
    location: 'Syros',
    locationGr: 'Sýros',
    temp: 29,
    unit: 'C',
    condition: 'Warm and clear. Neo-classical charm under the sun.',
    conditionNl: 'Warm en helder. Neo-klassieke charme in de zon.',
    sunrise: '06:39 AM',
    sunset: '08:17 PM',
  },
  'tyrinos': {
    location: 'Tinos',
    locationGr: 'Tínos',
    temp: 28,
    unit: 'C',
    condition: 'Pleasantly warm with a light sea breeze.',
    conditionNl: 'Aangenaam warm met een lichte zeewind.',
    sunrise: '06:40 AM',
    sunset: '08:16 PM',
  },
};

export const DEFAULT_WEATHER: LocationWeather = CYCLADS_WEATHER['athens'];

export const getWeatherForLocation = (locationName: string): LocationWeather => {
  const key = locationName.toLowerCase().trim();
  return CYCLADS_WEATHER[key] || DEFAULT_WEATHER;
};
