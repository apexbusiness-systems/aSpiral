/**
 * Public entry point for the VoiceConductor moat.
 * Re-exports the curated surface; internal helpers stay module-private.
 */
export {
  // Humanizer
  humanizeText,
  chunkForStreaming,
  // Endpointer
  recordUserPause,
  getAdaptiveEndpointMs,
  resetEndpointer,
  // Rate mirror
  recordUserUtterance,
  getMirroredRate,
  resetRateMirror,
  // Barge-in
  detectDeviceProfile,
  getReverbTailMs,
  // Backend scorer
  recordBackendSuccess,
  recordBackendFailure,
  isBackendHealthy,
  getBackendPreference,
  getBackendStats,
  resetBackendScorer,
  // Utterance ledger
  mintUtteranceId,
  registerUtterance,
  markUtterance,
  cancelUtterance,
  getUtteranceStatus,
  // Façade
  planUtterance,
  resetConductor,
} from './conductor';
export type {
  SpeechChunk,
  ConductorPlan,
  UtteranceId,
  Backend,
  DeviceProfile,
} from './conductor';
