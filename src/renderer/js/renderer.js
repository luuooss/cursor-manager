import { apiService } from './services/apiService.js';
import { store } from './state/store.js';
import { Grid } from './components/Grid.js';
import { Modal } from './components/Modal.js';
import { Carousel } from './components/Carousel.js';
import { VariantSelector } from './components/VariantSelector.js';

class App {
  constructor() {
    this.grid = new Grid('grid', 
      (pack) => this.handlePackClick(pack),
      (e, id) => this.handleContextMenu(e, id)
    );
    
    this.modal = new Modal('modal', {
      onInstall: () => this.handleInstall(),
      onApply: () => this.handleApply(),
      onCancel: () => this.handleCancel()
    });
    
    this.carousel = new Carousel('carousel-container', {
      onPrev: () => this.carousel.showCursor(this.carousel.index - 1),
      onNext: () => this.carousel.showCursor(this.carousel.index + 1),
      onMiniClick: (idx) => this.carousel.showCursor(idx)
    });

    this.variantSelector = new VariantSelector('variant-selector', {
      onVariantChange: (vid) => this.handleVariantChange(vid)
    });

    this.setupEventListeners();
    this.setupIpcListeners();
  }

  setupEventListeners() {
    document.getElementById('btn-minimize')?.addEventListener('click', () => apiService.minimizeWindow());
    document.getElementById('btn-close')?.addEventListener('click', () => apiService.closeWindow());
    document.getElementById('btn-reset')?.addEventListener('click', () => this.handleReset());
    
    document.getElementById('ctx-delete')?.addEventListener('click', () => this.handleDelete());
    window.addEventListener('contextmenu', (e) => e.preventDefault(), true);
    document.addEventListener('click', () => document.getElementById('context-menu')?.classList.remove('active'));
    
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.getElementById('drop-overlay')?.classList.remove('hidden');
    });
    document.addEventListener('dragleave', () => {
      document.getElementById('drop-overlay')?.classList.add('hidden');
    });
    document.addEventListener('drop', (e) => this.handleDrop(e));
  }

  setupIpcListeners() {
    apiService.onInstallProgress((data) => {
      const bar = document.getElementById('install-progress-bar');
      const fill = document.getElementById('install-progress-fill');
      const label = document.getElementById('install-progress-label');
      
      if (bar && fill && label) {
        bar.classList.remove('hidden');
        const pct = (data.done / data.total) * 100;
        fill.style.width = `${pct}%`;
        label.textContent = data.label || 'Processing...';
        
        if (data.done === data.total) {
          setTimeout(() => bar.classList.add('hidden'), 2000);
        }
      }
    });
  }

  async handlePackClick(pack) {
    store.setState({ selectedPack: pack, cursors: [], activeVariantId: null, variants: [] });
    
    if (pack.isInstalled) {
      const { cursors, variants } = await apiService.getPackCursors(pack.id);
      store.setState({ cursors, variants, activeVariantId: variants.length > 0 ? variants[0].id : null });
    }
  }

  async handleVariantChange(variantId) {
    const state = store.getState();
    const cursors = await apiService.getVariantCursors({ packId: state.selectedPack.id, variantId });
    store.setState({ activeVariantId: variantId, cursors });
  }

  async handleInstall() {
    const pack = store.getState().selectedPack;
    if (!pack) return;
    
    store.setState({ installingPackId: pack.id });
    const res = await apiService.installPack(pack);
    store.setState({ installingPackId: null });
    
    if (res.success) {
      await this.refreshPacks();
      this.handlePackClick({ ...pack, isInstalled: true });
    }
  }

  async handleApply() {
    const { selectedPack, activeVariantId } = store.getState();
    const res = await apiService.applyPack({ packId: selectedPack.id, variantId: activeVariantId });
    if (res.success) {
      store.setState({ activePackId: selectedPack.id });
      localStorage.setItem('activePackId', selectedPack.id);
      setTimeout(() => this.handleCancel(), 200);
    }
  }

  async handleCancel() {
    store.setState({ selectedPack: null, cursors: [], variants: [] });
  }

  handleContextMenu(e, packId) {
    const menu = document.getElementById('context-menu');
    if (menu) {
      menu.classList.add('active');
      
      const menuWidth = menu.offsetWidth || 160;
      const menuHeight = menu.offsetHeight || 60;
      const padding = 10;
      
      let x = e.clientX;
      let y = e.clientY;
      
      if (x + menuWidth > window.innerWidth - padding) {
        x = window.innerWidth - menuWidth - padding;
      }
      
      if (y + menuHeight > window.innerHeight - padding) {
        y = window.innerHeight - menuHeight - padding;
      }
      
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      store.setState({ contextPackId: packId });

      const hideMenu = () => menu.classList.remove('active');
      
      let timeout;
      const onLeave = () => {
        timeout = setTimeout(hideMenu, 300);
      };
      const onEnter = () => {
        if (timeout) clearTimeout(timeout);
      };

      menu.onmouseenter = onEnter;
      menu.onmouseleave = hideMenu;

      e.currentTarget.addEventListener('mouseleave', onLeave, { once: true });
    }
  }

  async handleDelete() {
    const packId = store.getState().contextPackId;
    if (packId && confirm('Delete this pack?')) {
      const res = await apiService.deletePack(packId);
      if (res.success) {
        if (store.getState().activePackId === packId) {
          store.setState({ activePackId: null });
          localStorage.removeItem('activePackId');
        }
        await this.refreshPacks();
      }
    }
  }

  async handleReset() {
    if (confirm('Reset to default cursors?')) {
      const res = await apiService.resetCursor();
      if (res.success) {
        store.setState({ activePackId: null });
        localStorage.removeItem('activePackId');
      }
    }
  }

  async handleDrop(e) {
    e.preventDefault();
    document.getElementById('drop-overlay')?.classList.add('hidden');
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.zip'));
    for (const f of files) {
      await apiService.installLocalPack(f.path);
    }
    await this.refreshPacks();
  }

  async refreshPacks() {
    const info = await apiService.getPacks();
    store.setState({ packs: info });
  }

  async initialize() {
    const loader = document.getElementById('loading-screen');
    const loadingText = loader?.querySelector('.loading-text');

    try {
      if (loadingText) loadingText.textContent = 'Fetching packs...';
      const fetchPromise = this.refreshPacks();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));
      await Promise.race([fetchPromise, timeoutPromise]).catch(() => {});
      if (loadingText) loadingText.textContent = 'Ready';
    } catch (e) {
    } finally {
      setTimeout(() => {
        if (loader) {
          loader.classList.add('fade-out');
          setTimeout(() => loader.style.display = 'none', 800);
        }
      }, 500);
    }
  }
}

const app = new App();
app.initialize();