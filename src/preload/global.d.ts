import type { SecurePassApi } from '@shared/types';

declare global {
  interface Window {
    securepass: SecurePassApi;
  }
}

export {};
