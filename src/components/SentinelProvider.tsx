import { useEffect } from 'react';
import { SilentSentinel } from '../lib/sentinel/SilentSentinel';

export const SentinelProvider = () => {
  useEffect(() => {
    SilentSentinel.init();
  }, []);
  return null;
};
