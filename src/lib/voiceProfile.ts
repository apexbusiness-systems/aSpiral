import { z } from 'zod';

const VoiceTypeSchema = z.enum(['natural', 'calm', 'energetic', 'professional']);

export type VoiceType = z.infer<typeof VoiceTypeSchema>;

export const VoicePreferencesSchema = z.object({
  voiceType: VoiceTypeSchema.default('natural'),
  speechRate: z.number().min(0.5).max(2).default(1),
  voiceVolume: z.number().min(0).max(100).default(80),
});

export type VoicePreferences = z.infer<typeof VoicePreferencesSchema>;

type OpenAiVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'nova';

const voiceMap: Record<VoiceType, { voice: OpenAiVoice; speedOffset: number }> = {
  natural: { voice: 'nova', speedOffset: 0 },
  calm: { voice: 'sage', speedOffset: -0.1 },
  energetic: { voice: 'shimmer', speedOffset: 0.15 },
  professional: { voice: 'alloy', speedOffset: -0.05 },
};

function readPreferences(input: unknown): VoicePreferences {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  const voiceTypeResult = VoiceTypeSchema.safeParse(source.voiceType);
  const speechRateResult = z.number().min(0.5).max(2).safeParse(source.speechRate);
  const voiceVolumeResult = z.number().min(0).max(100).safeParse(source.voiceVolume);

  return {
    voiceType: voiceTypeResult.success ? voiceTypeResult.data : 'natural',
    speechRate: speechRateResult.success ? speechRateResult.data : 1,
    voiceVolume: voiceVolumeResult.success ? voiceVolumeResult.data : 80,
  };
}

export function resolveVoiceProfile(input: unknown): {
  voice: OpenAiVoice;
  speed: number;
  volume: number;
} {
  const prefs = readPreferences(input);
  const mapped = voiceMap[prefs.voiceType];

  return {
    voice: mapped.voice,
    speed: Math.max(0.7, Math.min(1.5, prefs.speechRate + mapped.speedOffset)),
    volume: Math.max(0, Math.min(1, prefs.voiceVolume / 100)),
  };
}
