# ASPIRAL 3D Cinematic Breakthrough Framework

A production-ready 3D rendering framework for cinematic breakthrough reveals in ASPIRAL, featuring:

- 🎬 **5 Distinct Cinematic Variants** - Each with unique visual style and animation
- 🚀 **GPU-Accelerated Particles** - Instanced rendering for 1000+ particles at 60 FPS
- 📊 **Adaptive Performance** - Automatic quality adjustment based on device capabilities
- 🎵 **Audio Synchronization** - Seamless audio playback with fade in/out
- 📈 **Analytics Integration** - PostHog tracking for performance metrics
- ♿ **Accessibility** - Reduced motion support, keyboard shortcuts, screen reader friendly

## Quick Start

```tsx
import { CinematicPlayer } from '@/components/cinematics';

function BreakthroughFlow() {
  const [showCinematic, setShowCinematic] = useState(false);

  return (
    <>
      {showCinematic && (
        <CinematicPlayer
          onComplete={() => setShowCinematic(false)}
          allowSkip
          enableAnalytics
        />
      )}
    </>
  );
}
```

## Cinematic Variants

### 1. Spiral Ascend
- **Duration**: 4 seconds
- **Particles**: 1000 green vortex particles
- **Camera**: Spiral upward with 360° rotation
- **Audio**: `spiral-whoosh.mp3`
- **Effects**: Camera shake, chromatic aberration, bloom

### 2. Particle Explosion
- **Duration**: 3.5 seconds
- **Particles**: 2000 radial explosion particles
- **Camera**: Zoom from distance to close-up
- **Audio**: `explosion-bass.mp3`
- **Effects**: Bloom, vignette, shockwave ring

### 3. Portal Reveal
- **Duration**: 4.5 seconds
- **Particles**: 800 purple ring particles
- **Camera**: Glide through rotating portal
- **Audio**: `portal-open.mp3`
- **Effects**: Lens flare, bloom, rotating portal ring

### 4. Matrix Decode
- **Duration**: 3 seconds
- **Particles**: 1500 green matrix rain
- **Camera**: Smooth approach from distance
- **Audio**: `digital-decode.mp3`
- **Effects**: Glitch, scanlines, digital grid

### 5. Space Warp
- **Duration**: 5 seconds
- **Particles**: 500 purple star streaks
- **Camera**: Warp-speed acceleration
- **Audio**: `warp-drive.mp3`
- **Effects**: Motion blur, bloom, light tunnel

## API Reference

### CinematicPlayer Props

```typescript
interface CinematicPlayerProps {
  variant?: CinematicVariant;       // Specific variant or random
  onComplete?: () => void;           // Called when cinematic finishes
  onSkip?: () => void;               // Called when user skips
  onStart?: () => void;              // Called when cinematic starts
  allowSkip?: boolean;               // Show skip button (default: true)
  autoPlay?: boolean;                // Start immediately (default: true)
  enableAnalytics?: boolean;         // Track with PostHog (default: true)
  reducedMotion?: boolean;           // Disable effects (default: false)
  className?: string;                // Custom CSS class
}
```

### Variants

```typescript
type CinematicVariant =
  | 'spiral_ascend'
  | 'particle_explosion'
  | 'portal_reveal'
  | 'matrix_decode'
  | 'space_warp';
```

## Performance Benchmarks

Target performance on modern devices:

| Device | FPS | Particles | Post-Processing |
|--------|-----|-----------|-----------------|
| Desktop High-End | 60 | 2000 | Full |
| Desktop Mid-Range | 60 | 1600 | Full |
| Desktop Low-End | 30-45 | 1000 | Reduced |
| Modern Mobile | 30-45 | 800 | Off |
| Tablet | 45-60 | 1200 | Selective |

## Advanced Usage

### Specify a Variant

```tsx
<CinematicPlayer
  variant="spiral_ascend"
  onComplete={handleComplete}
/>
```

### Disable Analytics

```tsx
<CinematicPlayer
  enableAnalytics={false}
  onComplete={handleComplete}
/>
```

### Custom Callbacks

```tsx
<CinematicPlayer
  onStart={() => console.log('Cinematic started')}
  onSkip={() => console.log('User skipped')}
  onComplete={() => console.log('Cinematic completed')}
/>
```

### Reduced Motion

```tsx
<CinematicPlayer
  reducedMotion={true}  // Disables post-processing
  onComplete={handleComplete}
/>
```

## Architecture

```
src/
├── lib/
│   ├── cinematics/
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── configs.ts            # 5 cinematic configurations
│   │   ├── CameraController.tsx  # Camera animation system
│   │   ├── ParticleSystem.tsx    # GPU particle rendering
│   │   ├── AudioManager.ts       # Audio playback
│   │   ├── easing.ts             # Custom easing functions
│   │   └── index.ts              # Public API
│   ├── performance/
│   │   └── optimizer.ts          # Adaptive quality system
│   └── analytics.ts              # PostHog integration
├── components/
│   └── cinematics/
│       ├── CinematicPlayer.tsx   # Main orchestrator
│       ├── SpiralAscend.tsx      # Variant 1
│       ├── ParticleExplosion.tsx # Variant 2
│       ├── PortalReveal.tsx      # Variant 3
│       ├── MatrixDecode.tsx      # Variant 4
│       ├── SpaceWarp.tsx         # Variant 5
│       └── index.ts              # Public API
└── public/
    └── sounds/                   # Audio files
```

## Analytics Events

Automatically tracked (if `enableAnalytics={true}`):

```typescript
// When cinematic starts
analytics.trackCinematic('started', {
  variant: 'spiral_ascend',
  timestamp: Date.now(),
});

// When cinematic completes
analytics.trackCinematic('completed', {
  variant: 'spiral_ascend',
  duration: 4000,
});

// When user skips
analytics.trackCinematic('skipped', {
  variant: 'spiral_ascend',
  progress: 45, // Percentage
});

// Performance metrics
analytics.trackPerformance({
  variant: 'spiral_ascend',
  avgFps: 58,
  minFps: 45,
  maxFps: 60,
  peakMemoryMB: 120,
  particleCount: 1000,
  deviceType: 'desktop',
});
```

## Accessibility

### Keyboard Shortcuts
- **Escape**: Skip cinematic (if `allowSkip={true}`)

### Screen Readers
- Announces cinematic start/completion
- Skip button has proper ARIA labels

### Reduced Motion
- Respects `prefers-reduced-motion` media query
- Disables post-processing effects
- Maintains core animation but reduces intensity

## Performance Optimization

### Adaptive Quality
Automatically adjusts based on FPS:

- **< 30 FPS**: Reduce particles by 20%
- **< 20 FPS**: Disable post-processing
- **< 15 FPS**: Reduce render scale to 0.75x

### Memory Management
- Particles use instanced rendering (1 draw call)
- Audio files auto-dispose after playback
- Three.js geometries/materials properly disposed

### Bundle Size
- Main bundle: ~45KB (gzipped)
- Per variant: ~8KB each
- Total: ~85KB for all 5 variants

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | iOS 14+ | ✅ Full |
| Chrome Android | 90+ | ✅ Full |

## Troubleshooting

### Audio Not Playing

1. Check that audio files exist in `/public/sounds/`
2. Audio files must be:
   - MP3 format
   - 128kbps bitrate
   - Properly named (see `/public/sounds/README.md`)

### Low FPS

1. Adaptive quality will automatically reduce particle count
2. Manually disable post-processing: `enablePostProcessing: false` in quality settings
3. Check GPU tier in console logs

### TypeScript Errors

Ensure you have:
```bash
npm install three @types/three @react-three/fiber @react-three/drei @react-three/postprocessing
```

## Contributing

When adding new cinematics:

1. Create config in `src/lib/cinematics/configs.ts`
2. Create variant component in `src/components/cinematics/`
3. Add to `CinematicPlayer.tsx` switch statement
4. Update types in `types.ts`
5. Add audio file to `/public/sounds/`
6. Update this README

## License

MIT © ASPIRAL
