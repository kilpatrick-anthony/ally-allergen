// Fix for @supabase/auth-js timer type issues
// The library uses Node.js timers with unref() method, but TypeScript infers 'never' type

import '@supabase/auth-js';

declare module '@supabase/auth-js' {
  // Augment the types to include timer methods
  interface Timer {
    unref(): void;
    ref(): void;
    hasRef(): boolean;
    refresh(): void;
  }

  namespace GoTrueClient {
    interface Timer {
      unref(): void;
      ref(): void;
      hasRef(): boolean;
      refresh(): void;
    }
  }
}

// Also declare globally for any other timer usage
declare global {
  interface Timer {
    unref(): void;
    ref(): void;
    hasRef(): boolean;
    refresh(): void;
  }
}

export {};