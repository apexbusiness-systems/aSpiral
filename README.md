# aSpiral

Voice-first AI coaching that visualizes your thoughts and guides you to breakthrough clarity.

> [!IMPORTANT]
> **Baseline Release v1.0.6 (June 2026)**
> This build represents the frozen baseline, featuring SonarQube Grade A quality, dynamic edge-function CORS support, and a hardened production validation pipeline.

## Project Overview

aSpiral is a PWA built with Vite, React 18, TypeScript, and R3F/Three.js. It features a cinematic rendering pipeline for visualizing mental models.

## Technologies

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Three.js / React Three Fiber

## Getting Started

### Prerequisites

- Node.js & npm installed (recommended: use `nvm`)

### Installation

```sh
# Clone the repository
git clone https://github.com/apexbusiness-systems/aSpiral.git
cd aSpiral

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build & Test

```sh
# Run tests (Level 6 Armageddon Test Suite)
npm test

# Run full validation pipeline
npm run validate

# Build for production
npm run build:production
```

## 🏗️ Architecture

### Core Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **3D Rendering**: Three.js + React Three Fiber
- **State Management**: Zustand
- **API**: Supabase (Backend-as-a-Service)
- **Testing**: Vitest + Testing Library
- **Deployment**: Vercel (Web) + Capacitor (iOS/Android) + PWA

### Key Features

- **Voice-First Interface**: Speech-to-text and text-to-speech integration
- **Cinematic Breakthroughs**: 35+ procedural 3D visual experiences
- **Multi-Language Support**: i18n with 5 languages (EN, ES, FR, DE, JA)
- **Progressive Web App**: Installable on mobile and desktop
- **Real-time Analytics**: Comprehensive user interaction tracking

## 🧪 Testing & Quality

### Test Suite Status

- **Coverage**: 12 test suites, 172 individual tests
- **Pass Rate**: 100% (All tests passing)
- **Quality Grade**: SonarQube Grade A (Maintainability)

### Validation Pipeline

```sh
# Run comprehensive validation
npm run validate
# Includes: TypeScript → ESLint → Tests → Build
```

### Build Integrity

The project includes hardened build processes with:

- Pre-commit hooks for code quality
- Automated validation scripts
- Production build verification
- Zero-failure test suite

## 📚 Documentation

### Production Launch

- **[🚀 Launch Readiness Report](LAUNCH_READINESS.md)** - Comprehensive production audit and launch approval

# Step 2: Navigate to the project directory
cd aSpiral

# Step 3: Install dependencies
npm ci
```

### Development

```sh
# Start the development server
npm run dev
```

### Building

```sh
# Build for web
npm run build

# Sync Capacitor projects (iOS/Android)
npx cap sync ios
npx cap sync android
```

## Documentation

- [Renderer V2: Cinematic Pipeline Documentation](docs/RENDERER_V2.md)
- [Deployment Instructions](DEPLOYMENT_INSTRUCTIONS.md)
- [Supabase Setup](SUPABASE_SETUP.md)

## License

Copyright (c) Apex Business Systems. All rights reserved.
