import React from 'react';
import type { IslandStay } from '../types';

interface RouteMapBackgroundProps {
  stays: IslandStay[];
  activeStayId?: string;
}

interface RoutePoint {
  id: string;
  x: number;
  y: number;
  island: string;
  isActive: boolean;
  shape: number;
}

const hashLocation = (location: string): number =>
  [...location].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 997, 7);

/**
 * A deliberately schematic route canvas. It uses the stop order rather than
 * pretending to be a geographic map, so custom trips still produce a calm,
 * coherent visual without an external map service.
 */
const createRoutePoints = (stays: IslandStay[], activeStayId?: string): RoutePoint[] =>
  stays.map((stay, index) => {
    const total = Math.max(stays.length - 1, 1);
    const progress = index / total;
    const signature = hashLocation(stay.island.toLowerCase());
    const wave = Math.sin(progress * Math.PI * 1.2) * 8;
    const variation = (signature % 11) - 5;

    return {
      id: stay.id,
      x: 14 + progress * 72,
      y: 31 + wave + variation * 0.7,
      island: stay.island,
      isActive: stay.id === activeStayId,
      shape: signature % 3,
    };
  });

const createRoutePath = (points: RoutePoint[]): string => {
  if (points.length < 2) return '';

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleX = (previous.x + point.x) / 2;
    return `${path} Q ${middleX} ${previous.y} ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
};

const islandPath = (point: RoutePoint): string => {
  switch (point.shape) {
    case 1:
      return `M ${point.x - 5} ${point.y + 1} C ${point.x - 3} ${point.y - 4}, ${point.x + 2} ${point.y - 4}, ${point.x + 5} ${point.y - 1} C ${point.x + 3} ${point.y + 3}, ${point.x - 1} ${point.y + 4}, ${point.x - 5} ${point.y + 1} Z`;
    case 2:
      return `M ${point.x - 4} ${point.y - 2} C ${point.x - 1} ${point.y - 5}, ${point.x + 5} ${point.y - 2}, ${point.x + 4} ${point.y + 2} C ${point.x + 1} ${point.y + 4}, ${point.x - 4} ${point.y + 3}, ${point.x - 4} ${point.y - 2} Z`;
    default:
      return `M ${point.x - 5} ${point.y} C ${point.x - 2} ${point.y - 3}, ${point.x + 3} ${point.y - 3}, ${point.x + 5} ${point.y} C ${point.x + 2} ${point.y + 3}, ${point.x - 2} ${point.y + 3}, ${point.x - 5} ${point.y} Z`;
  }
};

export const RouteMapBackground: React.FC<RouteMapBackgroundProps> = ({ stays, activeStayId }) => {
  const points = createRoutePoints(stays, activeStayId);
  const routePath = createRoutePath(points);

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Schematische routekaart van ${stays.map((stay) => stay.island).join(' naar ')}`}
    >
      <defs>
        <linearGradient id="route-sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9edf6" />
          <stop offset="0.58" stopColor="#d9f6fa" />
          <stop offset="1" stopColor="#effbfd" />
        </linearGradient>
        <linearGradient id="route-glow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill="url(#route-sea)" />

      {/* Abstract sea contours replace the noisy grid and fake geography. */}
      <path d="M-4 22 C18 12 29 29 49 20 S82 12 104 22" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.42" />
      <path d="M-6 43 C14 35 28 50 47 42 S80 33 106 44" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.34" />
      <path d="M-4 67 C17 57 31 76 51 66 S83 57 104 69" fill="none" stroke="#ffffff" strokeWidth="0.7" opacity="0.3" />
      <path d="M0 14 C22 12 36 18 56 14 S82 9 100 15" fill="none" stroke="#005BAE" strokeWidth="0.25" opacity="0.12" />
      <path d="M0 82 C24 75 40 88 61 80 S84 74 100 81" fill="none" stroke="#005BAE" strokeWidth="0.25" opacity="0.1" />

      <rect x="0" y="0" width="100" height="2" fill="url(#route-glow)" opacity="0.8" />

      {routePath && (
        <>
          <path
            d={routePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d={routePath}
            fill="none"
            stroke="#005BAE"
            strokeWidth="0.7"
            strokeDasharray="2.2 1.8"
            strokeLinecap="round"
            opacity="0.4"
          />
        </>
      )}

      {points.map((point) => (
        <g key={point.id} opacity={point.isActive ? 0.95 : 0.55}>
          <path d={islandPath(point)} fill="#ffffff" stroke="#7bc9d9" strokeWidth="0.35" />
          <circle cx={point.x} cy={point.y} r={point.isActive ? 2.2 : 1.25} fill="#005BAE" opacity="0.75" />
          {point.isActive && (
            <circle cx={point.x} cy={point.y} r="3.8" fill="none" stroke="#005BAE" strokeWidth="0.45" opacity="0.42" />
          )}
        </g>
      ))}
    </svg>
  );
};
