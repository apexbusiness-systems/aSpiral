import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAudioSessionStatus, subscribeAudioSession, type AudioSessionStatus } from '@/lib/audioSession';
import { subscribeDebugOverlay, type Breadcrumb, type FatalErrorSnapshot } from '@/lib/debugOverlay';

interface DebugState {
  breadcrumbs: Breadcrumb[];
  fatalError: FatalErrorSnapshot | null;
}

function useDebugEnabled() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }, []);
}

export function DebugOverlay() {
  const location = useLocation();
  const debugEnabled = useDebugEnabled();
  const [debugState, setDebugState] = useState<DebugState>({ breadcrumbs: [], fatalError: null });
  const [audioStatus, setAudioStatus] = useState<AudioSessionStatus>(getAudioSessionStatus());

  useEffect(() => {
    if (!debugEnabled) return;
    return subscribeDebugOverlay((next) => setDebugState(next));
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return;
    return subscribeAudioSession((next) => setAudioStatus(next));
  }, [debugEnabled]);

  if (!debugEnabled) return null;

  const breadcrumbs = debugState.breadcrumbs.slice(-20).reverse();
  const route = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[320px] max-h-[70vh] overflow-hidden rounded-xl border border-white/10 bg-black/90 text-xs text-white shadow-xl">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-purple-200">
        Debug Overlay
      </div>
      <div className="space-y-3 overflow-y-auto px-3 py-2 text-[11px]">
        <section>
          <div className="text-purple-200">Route</div>
          <div className="truncate text-white/80">{route || '(unknown)'}</div>
        </section>

        <section>
          <div className="text-purple-200">Last Fatal Error</div>
          <div className="text-white/80">
            {debugState.fatalError?.message || 'None'}
          </div>
        </section>

        <section>
          <div className="text-purple-200">Audio Session</div>
          <div className="space-y-1 text-white/80">
            <div>speaking: {audioStatus.isSpeaking ? 'yes' : 'no'}</div>
            <div>listening: {audioStatus.isListening ? 'yes' : 'no'}</div>
            <div>backend: {audioStatus.backend}</div>
            <div>requestId: {audioStatus.requestId}</div>
            <div>last cancel: {audioStatus.lastCancelReason || 'none'}</div>
          </div>
        </section>

        <section>
          <div className="text-purple-200">Breadcrumbs (last 20)</div>
          <div className="space-y-1">
            {breadcrumbs.length === 0 ? (
              <div className="text-white/60">No breadcrumbs yet.</div>
            ) : (
              breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.timestamp}-${index}`} className="text-white/70">
                  <span className="text-purple-300">[{crumb.type}]</span> {crumb.message}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
