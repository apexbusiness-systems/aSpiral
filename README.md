# aSpiral

Voice-first AI coaching that visualizes your thoughts and guides you to breakthrough clarity.

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
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

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
