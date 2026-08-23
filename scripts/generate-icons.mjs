import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0080E0"/>
      <stop offset="1" stop-color="#005BAE"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <circle cx="384" cy="128" r="56" fill="#FFB020"/>
  <path d="M256 96 L396 416 H330 L304 352 H208 L182 416 H116 Z M256 208 L226 296 H286 Z" fill="#ffffff"/>
</svg>`;

await mkdir('public/icons', {recursive: true});

const jobs = [
  ['pwa-192.png', 192, false],
  ['pwa-512.png', 512, false],
  ['pwa-maskable-192.png', 192, true],
  ['pwa-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

for (const [file, size, maskable] of jobs) {
  const art = maskable ? Math.round(size * 0.72) : size;
  const pad = maskable ? Math.round((size - art) / 2) : 0;
  const svg = maskable ? SVG.replace(' rx="112"', '') : SVG;
  let pipeline = sharp(Buffer.from(svg)).resize(art, art);
  if (maskable) {
    pipeline = pipeline.extend({top: pad, bottom: pad, left: pad, right: pad, background: '#005BAE'});
  }
  await pipeline.resize(size, size).png().toFile(path.join('public/icons', file));
}

await sharp(Buffer.from(SVG)).resize(64, 64).png().toFile('public/favicon.png');
console.log('Icons generated in public/');
