import { store } from '../state/store.js';

export class Carousel {
  constructor(containerId, { onPrev, onNext, onMiniClick }) {
    this.el = document.getElementById(containerId);
    this.img = document.getElementById('carousel-img');
    this.name = document.getElementById('carousel-name');
    this.miniGrid = document.getElementById('carousel-mini-grid');
    this.btnPrev = document.getElementById('btn-car-prev');
    this.btnNext = document.getElementById('btn-car-next');

    this.onPrev = onPrev;
    this.onNext = onNext;
    this.onMiniClick = onMiniClick;

    this.btnPrev.addEventListener('click', () => this.onPrev());
    this.btnNext.addEventListener('click', () => this.onNext());
    
    this.index = 0;
    this.timer = null;
    this.cursors = [];

    store.subscribe((state) => this.update(state));
  }

  show() {
    this.el.classList.remove('hidden');
    this.el.style.display = 'flex';
  }

  hide() {
    this.el.classList.add('hidden');
    this.el.style.display = 'none';
    this.stopAnimation();
  }

  update(state) {
    if (!state.selectedPack || !state.selectedPack.isInstalled) {
      this.hide();
      return;
    }

    this.show();
    if (this.cursors !== state.cursors) {
      this.cursors = state.cursors;
      this.renderMiniGrid();
      this.showCursor(0);
    }
  }

  renderMiniGrid() {
    this.miniGrid.innerHTML = '';
    this.cursors.forEach((c, i) => {
      const dot = document.createElement('img');
      dot.className = `carousel-dot ${i === this.index ? 'active' : ''}`;
      dot.src = c.frames[0] || '';
      dot.addEventListener('click', () => this.onMiniClick(i));
      this.miniGrid.appendChild(dot);
    });
  }

  showCursor(idx) {
    if (!this.cursors || this.cursors.length === 0) return;
    this.index = (idx + this.cursors.length) % this.cursors.length;
    const c = this.cursors[this.index];
    this.name.textContent = c.name;
    
    this.renderMiniGrid();
    this.startAnimation(c.frames);
  }

  startAnimation(frames) {
    this.stopAnimation();
    if (!frames || frames.length === 0) return;
    let f = 0;
    const nextFrame = () => {
      this.img.src = frames[f % frames.length];
      f++;
      this.timer = setTimeout(nextFrame, 100);
    };
    nextFrame();
  }

  stopAnimation() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
