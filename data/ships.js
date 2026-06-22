// data/ships.js
// All playable ship definitions.
// baseShot: which weapon this ship starts with (must match a weapon id in data/weapons.js)

export const SHIPS = [
  {
    name: 'RAIJIN-X',
    pilot: 'ACE STRIKER',
    speed: 5.2,
    fireRate: 6,       // frames between shots at base
    color: '#00ccff',
    ac: '#0044ff',     // accent / cockpit colour
    baseShot: 'twin',
    desc: 'Balanced / Twin',
  },
  {
    name: 'VIPER-II',
    pilot: 'SHADOW WOLF',
    speed: 7.0,
    fireRate: 8,
    color: '#ff6600',
    ac: '#ff2200',
    baseShot: 'spread',
    desc: 'Fast / Spread',
  },
  {
    name: 'THUNDER-9',
    pilot: 'IRON HAWK',
    speed: 4.0,
    fireRate: 4,
    color: '#cc00ff',
    ac: '#6600cc',
    baseShot: 'laser',
    desc: 'Heavy / Laser',
  },
];
