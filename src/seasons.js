// Estaciones según la fecha de quien visita (hemisferio norte).
// Se puede forzar una con ?season=spring | summer | autumn | winter en la URL.

const BY_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

export const PALETTES = {
  spring: {
    sky: ['#3a92ea', '#7cc4f5', '#c8ebfc', '#f2f8ee'], fog: 0xd4ecff,
    ground: { base: '#5cb852', spots: ['#52ad49', '#6cc45f', '#47a03f', '#7fcf6c', '#62bb56', '#8ad674'] },
    patches: ['#9be07e', '#f2c4dc', '#bde27a', '#6cc45f'],
    hills: ['#78c76b', '#66b85f'],
    treeLine: ['#3a7d4f', '#34744a', '#428556'],
    blades: ['#4fb648', '#5fc955', '#74d266', '#3fa53d', '#8ad672'], bladeRatio: 1,
    flowers: { count: 170, colors: ['#ffb7d5', '#ffffff', '#ffd54a', '#ff7eb6', '#c9a7ff', '#ff9ebb'] },
    pine: ['#2b7342', '#33844d', '#3e9659'],
    crowns: ['#5cbf52', '#4fb04a', '#4aa845', '#78cf62'],
    blossomChance: 0.45, blossom: ['#f7b6d2', '#f3a0c4', '#fbd0e2', '#f8c3da'],
    bushes: ['#47a64c', '#52b055', '#3d9a45', '#f3a0c4'],
    fruit: false, mushrooms: 0.5, butterflies: 5, particles: 'petals',
    shadow: 0x0f2a12,
    light: { key: 0xfff6e0, hemiSky: 0xd6ecff, hemiGround: 0x74a85e },
  },
  summer: {
    sky: ['#2f86e0', '#6fb8f0', '#bfe6fb', '#eef6ea'], fog: 0xcfeaff,
    ground: { base: '#55ad4d', spots: ['#4a9f43', '#62b957', '#3f9139', '#6fc362', '#5aa84e', '#78c96a'] },
    patches: ['#86d070', '#3f8d3b', '#a9c95a', '#5fb552'],
    hills: ['#6bb56a', '#58a65a'],
    treeLine: ['#2f6b45', '#2a6340', '#38774c', '#2d7048'],
    blades: ['#3f8f3a', '#4fa548', '#5dba52', '#2f7d33', '#7ac765', '#8ccf62'], bladeRatio: 1,
    flowers: { count: 110, colors: ['#ffffff', '#ffd54a', '#ff7eb6', '#b388ff', '#ff8a65', '#7ec8ff'] },
    pine: ['#25683b', '#2c7744', '#378a52'],
    crowns: ['#4fae4a', '#449e43', '#3f963f', '#66c25a'],
    bushes: ['#3d9a45', '#47a64c', '#358c3e', '#52b055'],
    fruit: true, mushrooms: 1, butterflies: 5, particles: 'pollen',
    shadow: 0x0f2a12,
    light: { key: 0xfff2d6, hemiSky: 0xcfe8ff, hemiGround: 0x6a9a58 },
  },
  autumn: {
    sky: ['#3a83d6', '#7ab3e4', '#e9d7b8', '#f4e7cf'], fog: 0xeee0c8,
    ground: { base: '#8f9a48', spots: ['#a3a04c', '#7f8e3f', '#b5a352', '#9a8a3e', '#c09a4a', '#869a46'] },
    patches: ['#c98a3a', '#b5651d', '#a3a04c', '#d9a441'],
    hills: ['#b3a352', '#a38e45'],
    treeLine: ['#8a6a35', '#7f7a3a', '#a0602a', '#6f6a32'],
    blades: ['#9aa04a', '#b0a64e', '#8a8f3d', '#c2a453', '#7f9a45', '#a88a3e'], bladeRatio: 1,
    flowers: { count: 45, colors: ['#ff8a3d', '#b388ff', '#ffd23f', '#e8453c'] },
    pine: ['#235c37', '#2a6a40', '#33794a'],
    crownPalette: ['#e8892b', '#d9622b', '#f2b234', '#c9442a', '#e9a23b', '#b8432a'],
    bushes: ['#b5651d', '#c9842e', '#9a8b38', '#a0522d'],
    fruit: true, mushrooms: 1, butterflies: 2, particles: 'leaves',
    shadow: 0x2a2410,
    light: { key: 0xffe2b8, hemiSky: 0xf2e2c8, hemiGround: 0x8a7a48 },
  },
  winter: {
    sky: ['#7fa9cf', '#a8c7e2', '#dae7f1', '#f1f5f8'], fog: 0xe4edf3,
    ground: { base: '#eef3f7', spots: ['#e1e9f0', '#ffffff', '#d5e1ea', '#f6f9fb', '#dbe5ec'] },
    patches: ['#ffffff', '#d2dfe8'],
    hills: ['#eef3f6', '#dde7ee'],
    treeLine: ['#c9d7de', '#a9bcbf', '#7f998f'],
    blades: ['#c9d6c0', '#d8e2d2', '#b8c8b0'], bladeRatio: 0.3,
    flowers: { count: 0, colors: ['#ffffff'] },
    pine: ['#2c5e45', '#e3ecf1', '#f4f8fb'],
    crowns: ['#e9f0f5', '#dfe8ef', '#e5edf2', '#f4f8fb'],
    bushes: ['#e4ecf0', '#d5e2e8', '#c8d8c0'],
    fruit: false, mushrooms: 0, butterflies: 0, particles: 'snow',
    shadow: 0x51657a, rabbitFur: '#f4f4f2', rabbitBack: '#e2e2de',
    light: { key: 0xeaf2ff, hemiSky: 0xdfeaff, hemiGround: 0xb8c8d0 },
  },
};

export function currentSeason(date = new Date()) {
  try {
    const forced = new URLSearchParams(location.search).get('season');
    if (forced && PALETTES[forced]) return forced;
  } catch { /* sin URL: se usa la fecha */ }
  return BY_MONTH[date.getMonth()];
}
