# ASPIRAL Cinematic Audio Assets

This directory contains audio files for the 5 cinematic breakthrough animations.

## Required Audio Files

### 1. spiral-whoosh.mp3
- **Duration**: 4 seconds
- **Description**: Ascending whoosh sound with pitch rising
- **Format**: MP3, 128kbps, 44.1kHz
- **Target Size**: ~50KB
- **Style**: Smooth, ethereal, uplifting

### 2. explosion-bass.mp3
- **Duration**: 3.5 seconds
- **Description**: Deep bass explosion with impact
- **Format**: MP3, 128kbps, 44.1kHz
- **Target Size**: ~60KB
- **Style**: Powerful, punchy, energetic

### 3. portal-open.mp3
- **Duration**: 4.5 seconds
- **Description**: Portal opening with energy buildup
- **Format**: MP3, 128kbps, 44.1kHz
- **Target Size**: ~70KB
- **Style**: Mystical, dimensional, building tension

### 4. digital-decode.mp3
- **Duration**: 3 seconds
- **Description**: Digital matrix decoding sounds
- **Format**: MP3, 128kbps, 44.1kHz
- **Target Size**: ~40KB
- **Style**: Glitchy, digital, rapid processing

### 5. warp-drive.mp3
- **Duration**: 5 seconds
- **Description**: Space warp acceleration sound
- **Format**: MP3, 128kbps, 44.1kHz
- **Target Size**: ~80KB
- **Style**: Sci-fi, accelerating, intense

## Audio Sources (Royalty-Free)

For placeholder audio during development:

1. **Freesound.org**
   - Search: "whoosh", "explosion", "portal", "glitch", "warp"
   - License: CC0 or CC BY preferred

2. **Mixkit.co**
   - Free Sound Effects → Sci-Fi category
   - No attribution required

3. **Zapsplat.com**
   - Requires free account
   - High quality, professional sounds

4. **Epidemic Sound** (Premium)
   - Professional quality
   - Subscription required

## File Naming Convention

- Use lowercase, hyphenated names
- Match exactly: `spiral-whoosh.mp3`, `explosion-bass.mp3`, etc.
- Do NOT rename files or the AudioManager will fail to load them

## Testing Audio

To test audio files:

```typescript
const audio = new Audio('/sounds/spiral-whoosh.mp3');
audio.play().then(() => {
  console.log('Audio loaded successfully');
}).catch(err => {
  console.error('Failed to load audio:', err);
});
```

## Production Notes

- Compress audio aggressively (target <100KB per file)
- Ensure no silence at start/end (trim precisely)
- Normalize volume levels across all files
- Test on multiple devices (desktop, mobile, headphones)

## Placeholder Strategy

If you don't have audio files yet:

1. The AudioManager will gracefully handle missing files
2. Animations will play silently without errors
3. Add audio files later without code changes
