import { store } from '../state/store.js';

export class Modal {
  constructor(modalId, { onInstall, onApply, onCancel }) {
    this.el = document.getElementById(modalId);
    this.titleEl = document.getElementById('modal-title');
    this.previewImg = document.getElementById('modal-preview');
    this.btnInstall = document.getElementById('btn-install');
    this.btnApply = document.getElementById('btn-apply');
    this.btnCancel = document.getElementById('btn-cancel');
    this.spinner = document.getElementById('modal-spinner');

    this.onInstall = onInstall;
    this.onApply = onApply;
    this.onCancel = onCancel;

    this.btnInstall.addEventListener('click', () => this.onInstall());
    this.btnApply.addEventListener('click', () => this.onApply());
    this.btnCancel.addEventListener('click', () => this.onCancel());
    
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.onCancel();
    });

    store.subscribe((state) => this.update(state));
  }

  show() {
    this.el.classList.remove('hidden');
  }

  hide() {
    this.el.classList.add('hidden');
  }

  update(state) {
    const pack = state.selectedPack;
    if (!pack) {
      this.hide();
      return;
    }

    this.show();
    this.titleEl.textContent = pack.name;
    
    if (!pack.isInstalled) {
      this.previewImg.src = pack.preview;
      this.previewImg.style.display = 'block';
      this.btnInstall.classList.remove('hidden');
      this.btnApply.classList.add('hidden');
    } else {
      this.previewImg.style.display = 'none';
      this.btnInstall.classList.add('hidden');
      this.btnApply.classList.remove('hidden');
    }

    const isInstalling = state.installingPackId === pack.id;
    this.btnInstall.disabled = isInstalling;
    if (isInstalling) {
      this.spinner.classList.remove('hidden');
    } else {
      this.spinner.classList.add('hidden');
    }
  }
}
