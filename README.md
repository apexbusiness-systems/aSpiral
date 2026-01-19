# aSpiral - Decision Intelligence Platform

<p align="center">
  <img src="src/assets/app_icon.png" alt="aSpiral Logo" width="180" height="180" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>Transform complex decisions into clear breakthroughs</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Overview

aSpiral is a decision intelligence platform that uses voice-powered AI to help users navigate complex decisions. Through an intuitive spiral visualization and guided questioning, users discover breakthrough insights that transform friction into clarity.

## Features

- **Voice-Powered Input** - Speak your thoughts naturally with real-time transcription
- **AI-Guided Questions** - Intelligent questions guide you through decision clarity
- **3D Spiral Visualization** - Beautiful WebGL-powered visualization of your decision journey
- **Breakthrough Insights** - AI-generated insights combining friction points and solutions
- **Cross-Platform** - Works on web, iOS, and Android as a PWA
- **Offline Support** - Continue working even without internet connection

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/apexbusiness-systems/aSpiral.git

# Navigate to project directory
cd aSpiral

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Setup

Copy the example config and configure your environment:

```bash
cp public/config.example.js public/config.js
```

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for backend configuration.

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **3D Graphics** | Three.js, React Three Fiber |
| **Animation** | Framer Motion |
| **Backend** | Supabase (Auth, Database, Edge Functions) |
| **AI** | OpenAI GPT-4, Whisper |
| **Mobile** | Capacitor (iOS/Android) |

## Documentation

| Document | Description |
|----------|-------------|
| [RENDERER_V2.md](docs/RENDERER_V2.md) | Cinematic rendering pipeline documentation |
| [PRODUCTION_STATUS.md](docs/PRODUCTION_STATUS.md) | Current production status and metrics |
| [SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) | Security audit and compliance |
| [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) | Deployment guide |
| [SUPABASE_SETUP.md](SUPABASE_SETUP.md) | Backend setup instructions |

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Icon Generation

Generate app icons for all platforms:

```bash
# Ensure src/assets/app_icon.png exists (1024x1024 recommended)
node scripts/generate-icons.mjs
```

This generates icons for:
- PWA (192x192, 512x512, maskable)
- iOS (1024x1024)
- Android (all mipmap densities)
- Web favicons (16x16, 32x32, ico)

## Deployment

### Web (Vercel/Netlify)

```bash
npm run build
# Deploy the 'dist' folder
```

### Mobile (Capacitor)

```bash
# iOS
npx cap sync ios
npx cap open ios

# Android
npx cap sync android
npx cap open android
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - All rights reserved by Apex Business Systems

---

<p align="center">
  Made with ❤️ by <a href="https://apexbusiness.systems">Apex Business Systems</a>
</p>
