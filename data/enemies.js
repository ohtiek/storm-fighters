// data/enemies.js
// Base stats for each enemy type. Actual values are scaled by stage in entities/enemy.js

export const ENEMY_TYPES = {
  fighter: {
    hpBase: 2,
    hpPerStage: 1,
    speedBase: 1.4,
    speedPerStage: 0.25,
    fireRate: 160,       // frames between shots (high = slow)
    fireRateReduction: 6, // reduce by this per stage (minimum 60)
    points: 100,
  },
  bomber: {
    hpBase: 6,
    hpPerStage: 2,
    speedBase: 0.9,
    speedPerStage: 0.1,
    fireRate: 130,
    fireRateReduction: 4,
    points: 250,
  },
  gunship: {
    hpBase: 10,
    hpPerStage: 3,
    speedBase: 0.9,
    speedPerStage: 0.1,
    fireRate: 90,
    fireRateReduction: 3,
    points: 500,
  },
  boss: {
    hpBase: 400,
    hpPerStage: 120,
    fireRate: 30,
    points: 15000,
  },
};
