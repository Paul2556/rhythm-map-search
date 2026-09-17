"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DockBar } from "./components/DockBar";

export default function RootPage() {
  const router = useRouter();
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
    } else {
      router.replace("/maps");
    }
  }, [router]);

  if (!isElectron) return null;

  return <DockBar />;
}
