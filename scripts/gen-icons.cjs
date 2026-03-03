const fs = require('fs');

function createIcon(size) {
  const rx = Math.round(size * 0.15);
  const y = Math.round(size * 0.72);
  const fontSize = Math.round(size * 0.6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c9a84c"/>
      <stop offset="100%" stop-color="#0ea5a0"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="#0a0e1a"/>
  <text x="${size/2}" y="${y}" text-anchor="middle" font-family="serif" font-weight="700" font-size="${fontSize}" fill="url(#g)">A</text>
</svg>`;
}

fs.writeFileSync('public/icon-192.svg', createIcon(192));
fs.writeFileSync('public/icon-512.svg', createIcon(512));
console.log('Created icon-192.svg and icon-512.svg');
