"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/maps", label: "Maps" },
  { href: "/settings", label: "Settings" },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== "undefined" && !!window.electronAPI);
  }, []);

  if (pathname === "/") return null;

  function minimize() {
    void window.electronAPI?.toIcon();
    router.push("/");
  }

  return (
    <nav className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 pt-6 text-sm">
      <div className="flex gap-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 transition ${
              pathname === link.href
                ? "bg-white font-medium text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      {isElectron && (
        <button onClick={minimize} className="rounded-md px-3 py-1.5 text-zinc-400 hover:text-white">
          Minimize
        </button>
      )}
    </nav>
  );
}
