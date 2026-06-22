// screens/gameOverScreen.js
import * as S from '../core/state.js';

export function initGameOverScreen(onRetry, onSelectShip) {
  document.getElementById('btn-retry').addEventListener('click', () => {
    document.getElementById('screen-gameover').classList.add('hidden');
    onRetry();
  });
  document.getElementById('btn-toTitle').addEventListener('click', () => {
    document.getElementById('screen-gameover').classList.add('hidden');
    onSelectShip();
  });
}

export function showGameOver() {
  document.getElementById('final-score').textContent =
    'SCORE: ' + S.score.toString().padStart(8, '0');
  document.getElementById('hi-score-msg').textContent =
    S.score >= S.hiScore ? '★ NEW HIGH SCORE ★' : 'HI: ' + S.hiScore.toString().padStart(8, '0');
  document.getElementById('screen-gameover').classList.remove('hidden');
}
