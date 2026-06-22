// data/weapons.js
// Branching weapon tree.
// Each weapon has two upgrade paths at level 2 (branchA / branchB).
// The player chooses a path by collecting the matching coloured bubble:
//   - Gold bubble  → branchA (power path)
//   - Cyan bubble  → branchB (utility / spread path)
// At level 1 there is no branch — both bubbles advance to level 2 on the same base.
// At level 3 (max) collecting another bubble cycles to the NEXT weapon at level 1.
//
// Structure per weapon:
//   id        – internal key
//   label     – display name
//   color     – base HUD / bullet colour
//   fmod      – fire-rate multiplier (>1 = faster, <1 = slower)
//   branches: {
//     A: { label, color, description }   — power path
//     B: { label, color, description }   — utility path
//   }
//
// The active branch is stored in weaponState.branch ('A' | 'B' | null for lv1)

export const WEAPONS = [
  {
    id: 'twin',
    label: 'TWIN',
    color: '#00ddff',
    fmod: 1.0,
    branches: {
      A: { label: 'QUAD',    color: '#00ffff', description: '4 heavy parallel beams' },
      B: { label: 'CROSS',   color: '#88ffff', description: 'Twin + diagonal side shots' },
    },
  },
  {
    id: 'spread',
    label: 'SPREAD',
    color: '#ff9900',
    fmod: 1.1,
    branches: {
      A: { label: 'INFERNO', color: '#ff4400', description: 'Wide fire ring burst' },
      B: { label: 'NEEDLE',  color: '#ffcc00', description: 'Tight focused needle fan' },
    },
  },
  {
    id: 'laser',
    label: 'LASER',
    color: '#dd00ff',
    fmod: 0.8,
    branches: {
      A: { label: 'PRISM',   color: '#ff00ff', description: 'Triple prismatic beams' },
      B: { label: 'PULSE',   color: '#cc88ff', description: 'Rapid short pulses + side' },
    },
  },
  {
    id: 'missile',
    label: 'MISSILE',
    color: '#00ff88',
    fmod: 0.7,
    branches: {
      A: { label: 'CLUSTER', color: '#00ff44', description: 'Missiles split on impact' },
      B: { label: 'SEEKER',  color: '#88ffcc', description: 'Tight lock-on + spiral trail' },
    },
  },
  {
    id: 'plasma',
    label: 'PLASMA',
    color: '#ffee00',
    fmod: 0.6,
    branches: {
      A: { label: 'NOVA',    color: '#ffaa00', description: 'Expanding plasma nova burst' },
      B: { label: 'CHAIN',   color: '#ffffaa', description: 'Chain lightning arc between enemies' },
    },
  },
];

// Ordered cycle: twin → spread → laser → missile → plasma → twin
export const WEAPON_CYCLE = WEAPONS.map(w => w.id);
