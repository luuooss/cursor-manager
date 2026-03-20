const TILT_MAX = 8;
const SCALE = 1.02;
const EASE_IN = 'border-color 0.25s, box-shadow 0.25s, transform 0.1s cubic-bezier(0.22,1,0.36,1)';
const EASE_OUT = 'border-color 0.25s, box-shadow 0.25s, transform 0.5s cubic-bezier(0.22,1,0.36,1)';

export function initTilt() {
  const grid = document.getElementById('grid');
  if (grid) grid.style.perspective = '800px';

  document.querySelectorAll('.card').forEach(card => {
    if (card.dataset.tiltInit === 'true') return;
    card.dataset.tiltInit = 'true';

    card.addEventListener('mouseenter', () => {
      card.style.transition = EASE_IN;
    });

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      card.style.transform = `rotateX(${(-dy * TILT_MAX).toFixed(2)}deg) rotateY(${(dx * TILT_MAX).toFixed(2)}deg) scale(${SCALE})`;

      card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = EASE_OUT;
      card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    });
  });
}