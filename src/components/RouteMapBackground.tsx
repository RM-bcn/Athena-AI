import React from 'react';
import type { IslandStay } from '../types';
import { normalizeCity } from '../transport/transportLogic';

interface RouteMapBackgroundProps {
  stays: IslandStay[];
  activeStayId?: string;
}

interface MapPoint {
  id: string;
  island: string;
  x: number;
  y: number;
  isActive: boolean;
}

const KNOWN_LOCATIONS: Record<string, { x: number; y: number }> = {
  athene: { x: 18, y: 70 },
  milos: { x: 31, y: 76 },
  santorini: { x: 43, y: 88 },
  paros: { x: 55, y: 57 },
  naxos: { x: 64, y: 52 },
  koufonisia: { x: 73, y: 59 },
  mykonos: { x: 76, y: 35 },
};

const hashLocation = (location: string): number =>
  [...location].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 997, 7);

const fallbackPoint = (island: string, index: number, total: number): { x: number; y: number } => {
  const hash = hashLocation(island.toLowerCase());
  const progress = total > 1 ? index / (total - 1) : 0.5;
  return {
    x: 16 + progress * 68,
    y: 38 + (hash % 34),
  };
};

const pointForStay = (stay: IslandStay, index: number, total: number): MapPoint => {
  const location = normalizeCity(stay.island);
  const point = KNOWN_LOCATIONS[location] || fallbackPoint(stay.island, index, total);
  return { ...point, id: stay.id, island: stay.island, isActive: false };
};

export const RouteMapBackground: React.FC<RouteMapBackgroundProps> = ({ stays, activeStayId }) => {
  const points = stays.map((stay, index) => {
    const point = pointForStay(stay, index, stays.length);
    return { ...point, isActive: stay.id === activeStayId };
  });
  const route = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Kaart van de route ${stays.map((stay) => stay.island).join(' naar ')}`}
    >
      <defs>
        <linearGradient id="route-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b8edf7" />
          <stop offset="0.55" stopColor="#dff8fb" />
          <stop offset="1" stopColor="#effcff" />
        </linearGradient>
        <pattern id="route-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#ffffff" strokeWidth="0.35" opacity="0.55" />
        </pattern>
        <marker id="route-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#005BAE" opacity="0.38" />
        </marker>
      </defs>

      <rect width="100" height="100" fill="url(#route-sea)" />
      <rect width="100" height="100" fill="url(#route-grid)" opacity="0.6" />

      {/* Quiet land silhouettes keep the layer map-like without relying on an external image. */}
      <path
        d="M0 8 C10 6 16 11 21 18 C25 23 23 29 29 34 L22 42 C17 38 13 42 8 36 L0 38 Z"
        fill="#ffffff"
        opacity="0.42"
      />
      <path
        d="M14 94 C26 87 38 90 48 94 C57 97 70 93 84 95 C89 96 94 98 100 100 L14 100 Z"
        fill="#ffffff"
        opacity="0.52"
      />
      <path
        d="M78 0 C76 12 82 17 79 25 C76 31 83 37 79 45 C76 51 81 58 78 66"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        opacity="0.28"
      />

      {route && points.length > 1 && (
        <>
          <polyline
            points={route}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
          <polyline
            points={route}
            fill="none"
            stroke="#005BAE"
            strokeWidth="0.75"
            strokeDasharray="1.8 1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#route-arrow)"
            opacity="0.48"
          />
        </>
      )}

      {points.map((point) => (
        <g key={point.id}>
          <circle cx={point.x} cy={point.y} r={point.isActive ? 3.4 : 2.4} fill="#ffffff" opacity="0.9" />
          <circle
            cx={point.x}
            cy={point.y}
            r={point.isActive ? 2.1 : 1.45}
            fill={point.isActive ? '#005BAE' : '#4aa9c4'}
            opacity="0.82"
          />
          <text
            x={point.x}
            y={point.y - 3.8}
            textAnchor="middle"
            fill="#005BAE"
            fontSize="2.35"
            fontWeight="600"
            opacity="0.62"
          >
            {point.island}
          </text>
        </g>
      ))}
    </svg>
  );
};
