# 🖱️ Cursor Manager

A premium, high-fidelity Windows cursor management application built with Electron. Effortlessly browse, install, and apply stunning cursor packs with a modern, high-performance interface.

## ✨ Features

- **Iridescent HUD Interface**: Sleek, glassmorphic design with native-feeling animations and transitions.
- **3D Magnetic Previews**: Advanced hover effects using CSS perspectives and real-time math for a premium feel.
- **Animated Previews**: Instant visual feedback of cursor animations before installation.
- **Variant Support**: Smart handling of cursor packs with multiple stylistic variants (e.g., Light/Dark, Size).
- **Registry Integration**: Safe and automated application of cursor files to the Windows Registry.
- **Drag & Drop**: Direct installation of local cursor packs via .zip file dropout.
- **One-Click Reset**: Quickly revert to Windows default cursors at any time.

## 🏗️ Architecture

The project follows **Single Responsibility** and **SOLID** principles with a modular architecture:

### Main Process (`src/main/`)
- **Services**: `packService`, `registryService`, `automationService` (PowerShell integration).
- **Lifecycle**: Managed through `windowManager` and `ipcHandlers`.
- **Protocol**: Custom `asset://` protocol for secure local file access.

### Renderer Process (`src/renderer/js/`)
- **State Management**: Centralized store-based architecture with reactive components.
- **Components**: Isolated UI blocks (`Grid`, `Modal`, `Carousel`, `VariantSelector`).
- **Styles**: Modular CSS system (`base.css`, `layout.css`, `components.css`).

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- Windows OS (Required for registry and cursor application features)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/luuooss/cursor-manager.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the application:
   ```bash
   npm start
   ```

## 🛠️ Development

- **Run in Dev Mode**: `npm start`
- **Modular CSS**: Edit individual files in `src/renderer/css/` to update the design system.
- **Registry Safety**: Cursor applications are handled via PowerShell scripts to ensure system stability.

## 📄 License

MIT
