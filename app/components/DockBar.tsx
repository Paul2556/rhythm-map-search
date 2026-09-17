"use client";

import { useRouter } from "next/navigation";

export function DockBar() {
  const router = useRouter();

  async function openMini() {
    await window.electronAPI?.toMini();
    router.push("/play?mini=1");
  }

  return (
    <button
      onClick={openMini}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-black shadow-lg shadow-black/40 hover:scale-105 active:scale-95"
      title="Open 4K Map Search"
    >
      4K
    </button>
  );
}
