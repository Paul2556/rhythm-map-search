export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      toIcon: () => Promise<void>;
      toMini: () => Promise<void>;
      toFull: () => Promise<void>;
      onHoverChange: (cb: (hovering: boolean) => void) => () => void;
    };
  }
}
