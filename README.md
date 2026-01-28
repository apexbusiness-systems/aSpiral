# aSpiral - Transform Confusion into Clarity

**aSpiral** is a voice-first AI coaching platform that visualizes your thoughts and guides you to breakthrough clarity through immersive 3D cinematic experiences.

## 🚀 Quick Start

### Prerequisites
- Node.js 22.x or later ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn

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
- **Deployment**: Capacitor (iOS/Android) + PWA

### Key Features
- **Voice-First Interface**: Speech-to-text and text-to-speech integration
- **Cinematic Breakthroughs**: 35+ procedural 3D visual experiences
- **Multi-Language Support**: i18n with 5 languages (EN, ES, FR, DE, JA)
- **Progressive Web App**: Installable on mobile and desktop
- **Real-time Analytics**: Comprehensive user interaction tracking

## 🧪 Testing & Quality

### Test Suite Status
- **Coverage**: 20 test files, 303 individual tests
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

### Core Documentation
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Technical roadmap and architecture
- [Production Status](docs/PRODUCTION_STATUS.md) - Current deployment status
- [Renderer V2](docs/RENDERER_V2.md) - Cinematic pipeline documentation
- [Security Review](docs/SECURITY_REVIEW.md) - Security audit results
- [Code Review](docs/CODE_REVIEW.md) - Code quality guidelines
- [Audit Report](docs/CI_RESCUE_WALKTHROUGH.md) - CI/CD hardening and rescue log

### Setup Guides
- [Supabase Setup](SUPABASE_SETUP.md) - Backend configuration
- [Deployment Instructions](DEPLOYMENT_INSTRUCTIONS.md) - Production deployment
- [Bootstrap Guide](docs/bootstrap.md) - New environment setup

## 🔧 Development

### Available Scripts
```json
{
  "dev": "Start development server",
  "build": "Build for production",
  "build:production": "Full validation + production build",
  "test": "Run test suite",
  "test:watch": "Run tests in watch mode",
  "lint": "Run ESLint",
  "lint:fix": "Auto-fix ESLint issues",
  "typecheck": "Run TypeScript compiler check",
  "validate": "Run full validation pipeline",
  "precommit": "Pre-commit validation",
  "prepush": "Pre-push validation + build"
}
```

### Code Quality Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Zero warnings/errors
- **SonarQube**: Grade A maintainability
- **Testing**: 100% pass rate required
- **Build**: Zero failures in CI/CD

## 🚀 Deployment

### Production Build
```sh
npm run build:production
```

### Mobile Deployment
```sh
# iOS
npm run build
npx cap add ios
npx cap open ios

# Android
npm run build
npx cap add android
npx cap open android
```

### PWA Deployment
The app is automatically configured as a Progressive Web App and can be installed from any modern browser.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run validation: `npm run validate`
4. Commit changes: `git commit -m "Add your feature"`
5. Push to branch: `git push origin feature/your-feature`
6. Create a Pull Request

### Code Standards
- All commits must pass `npm run validate`
- Tests must maintain 100% pass rate
- Code must maintain SonarQube Grade A
- Documentation must be updated for API changes

## 📄 License

Copyright © 2024 Apex Business Systems. All rights reserved.

## 🆘 Support

For technical support or questions:
- Create an issue in this repository
- Contact the development team
- Check the [documentation](docs/) for common solutions
