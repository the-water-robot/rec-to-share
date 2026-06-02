"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabBar() {
  const path = usePathname();
  const tabs = [
    { href: "/", label: "Carica", active: path === "/", Icon: UploadIcon },
    { href: "/prove", label: "Prove", active: path.startsWith("/prove"), Icon: MusicIcon },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-dark-border bg-dark-bg/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-14 max-w-md">
        {tabs.map(({ href, label, active, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
              active ? "text-flamingo" : "text-sand/50 hover:text-sand/80"
            }`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
