import { store } from '../state/store.js';
import { initTilt } from '../tilt.js';

export class Grid {
  constructor(containerId, onPackClick, onPackContextMenu) {
    this.container = document.getElementById(containerId);
    this.onPackClick = onPackClick;
    this.onPackContextMenu = onPackContextMenu;
    this.lastPacks = null;
    this.lastActiveId = null;
    
    store.subscribe((state) => {
      if (this.lastPacks !== state.packs || this.lastActiveId !== state.activePackId) {
        this.lastPacks = state.packs;
        this.lastActiveId = state.activePackId;
        this.render(state.packs, state.activePackId);
      }
    });
  }

  render(packs, activePackId) {
    if (!this.container) return;
    this.container.innerHTML = '';
    
    packs.forEach(pack => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = pack.id;
      
      const isActive = activePackId === pack.id;
      
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-preview-wrapper">
            <img class="card-preview" src="${pack.preview}" alt="${pack.name}">
          </div>
          <div class="card-footer">
            <span class="card-title">${pack.name}</span>
            <div class="badge ${isActive ? 'active' : ''}"></div>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => this.onPackClick(pack));
      card.addEventListener('contextmenu', (e) => {
        if (pack.isInstalled) {
          e.preventDefault();
          this.onPackContextMenu(e, pack.id);
        }
      });
      
      this.container.appendChild(card);
    });

    initTilt();
  }
}
