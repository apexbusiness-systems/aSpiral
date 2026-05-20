import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function read(path: string) {
  return readFileSync(resolve(__dirname, '..', path), 'utf8');
}

describe('voice hooks sanity', () => {
  it('useTextToSpeech exports remain present', () => {
    const contents = read('useTextToSpeech.ts');
    expect(contents.length).toBeGreaterThan(200);
    expect(contents).toMatch(/export function useTextToSpeech/);
  });

  it('useVoiceInput exports remain present', () => {
    const contents = read('useVoiceInput.ts');
    expect(contents.length).toBeGreaterThan(200);
    expect(contents).toMatch(/export function useVoiceInput/);
  });

  it('useVoiceInput exports voiceState type string literal union', () => {
    const contents = read('useVoiceInput.ts');
    expect(contents).toMatch(
      /"Idle" | "Listening" | "Reconnecting" | "Error"/
    );
  });

  it('useVoiceInput exports subscribeToVoiceDebug', () => {
    const contents = read('useVoiceInput.ts');
    expect(contents).toMatch(/export function subscribeToVoiceDebug/);
  });

  it('useVoiceInput exports subscribeToVoiceDebug function', () => {
    const contents = read('useVoiceInput.ts');
    expect(contents).toMatch(/export function subscribeToVoiceDebug/);
  });

  it('useVoiceInput exports UseVoiceInputOptions interface', () => {
    const contents = read('useVoiceInput.ts');
    expect(contents).toMatch(/export interface UseVoiceInputOptions/);
  });
});

