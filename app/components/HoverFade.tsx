"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const BG_STYLE = { background: "var(--background)" };

/**
 * App-wide hover behavior for the Electron window — no-op on the plain web version.
 * The main process is the source of truth for "is the cursor over the window"
 * (electron/main.js polls screen.getCursorScreenPoint() against the real window
 * bounds) and collapses back to the icon there, since only main can resize the
 * window. This component just mirrors that into a fade and, once collapsed,
 * navigates back to "/" to match.
 */
export function HoverFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isElectron, setIsElectron] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    setIsElectron(true);
    return window.electronAPI.onHoverChange((hovering) => setVisible(hovering));
  }, []);

  useEffect(() => {
    if (!isElectron || visible || pathname === "/") return;
    router.push("/");
  }, [isElectron, visible, pathname, router]);

  if (!isElectron) {
    return (
      <div style={BG_STYLE} className="flex min-h-full flex-1 flex-col">
        {children}
      </div>
    );
  }

  return (
    <div
      style={BG_STYLE}
      className={`flex min-h-full flex-1 flex-col transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
