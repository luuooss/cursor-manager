import { store } from '../state/store.js';

export class VariantSelector {
  constructor(containerId, { onVariantChange }) {
    this.el = document.getElementById(containerId);
    this.onVariantChange = onVariantChange;
    this.isOpen = false;
    
    store.subscribe((state) => this.update(state));
  }

  show() {
    this.el.classList.remove('hidden');
    this.el.style.display = 'block';
  }

  hide() {
    this.el.classList.add('hidden');
    this.el.style.display = 'none';
  }

  update(state) {
    const pack = state.selectedPack;
    if (!pack || !pack.isInstalled || !state.variants || state.variants.length === 0) {
      this.hide();
      return;
    }

    this.show();
    this.render(state.variants, state.activeVariantId);
  }

  render(variants, activeVariantId) {
    this.el.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'variant-selector-container';
    container.style = 'position: relative; width: 100%;';
    
    const activePack = variants.find(v => v.id === activeVariantId) || variants[0];
    const activeName = activePack ? activePack.name : 'Select Variant';

    const trigger = document.createElement('div');
    trigger.className = 'variant-trigger';
    trigger.style = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; cursor: pointer; transition: all 0.2s ease;';
    trigger.innerHTML = `
      <span style="font-size: 13px; color: var(--text);">${activeName}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s ease; transform: rotate(${this.isOpen ? '180deg' : '0deg'});">
        <path d="M6 9l6 6 6-6" />
      </svg>
    `;

    const menu = document.createElement('div');
    menu.className = 'variant-dropdown';
    menu.style = `position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 8px; background: #1d1d22; border: 1px solid var(--stroke); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden; z-index: 1000; transition: all 0.2s ease; opacity: ${this.isOpen ? '1' : '0'}; visibility: ${this.isOpen ? 'visible' : 'hidden'}; transform: translateY(${this.isOpen ? '0' : '10px'});`;

    variants.forEach(v => {
      const item = document.createElement('div');
      item.className = 'variant-item';
      item.style = `padding: 10px 14px; font-size: 13px; cursor: pointer; transition: background 0.2s; color: ${v.id === activeVariantId ? 'var(--a1)' : 'var(--text)'}; background: ${v.id === activeVariantId ? 'rgba(94, 234, 212, 0.05)' : 'transparent'};`;
      item.textContent = v.name;
      
      item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.05)');
      item.addEventListener('mouseleave', () => item.style.background = v.id === activeVariantId ? 'rgba(94, 234, 212, 0.05)' : 'transparent');
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isOpen = false;
        this.onVariantChange(v.id);
      });
      menu.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isOpen = !this.isOpen;
      this.update(store.getState());
    });

    const outsideClick = () => {
      if (this.isOpen) {
        this.isOpen = false;
        this.update(store.getState());
      }
      document.removeEventListener('click', outsideClick);
    };
    if (this.isOpen) document.addEventListener('click', outsideClick);

    container.appendChild(menu);
    container.appendChild(trigger);
    this.el.appendChild(container);
  }
}
