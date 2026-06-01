"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, Sliders, ClipboardList, FileInput, LogOut, Crown } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/premium", label: "Premium", icon: Crown },
  { href: "/whatif", label: "What-If", icon: Sliders },
  { href: "/actuals", label: "Actuals", icon: ClipboardList },
  { href: "/intake", label: "Intake", icon: FileInput },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoverPos, setHoverPos] = useState({ left: 0, width: 0, opacity: 0 });

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between h-[60px]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="RecurCast"
              width={44}
              height={44}
              className="rounded-lg"
              unoptimized
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#1E2A5E] leading-none">RecurCast</span>
              <span className="text-[9px] text-slate-400 leading-none mt-1 hidden sm:block tracking-wide">by Foresight Finance</span>
            </div>
          </Link>

          {/* Desktop: Animated pill nav */}
          <ul
            className="relative hidden md:flex items-center rounded-full border border-slate-200/80 bg-slate-50/80 backdrop-blur-sm p-1"
            onMouseLeave={() => setHoverPos((pv) => ({ ...pv, opacity: 0 }))}
          >
            {links.map((l) => {
              const Icon = l.icon;
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <NavTab
                  key={l.href}
                  href={l.href}
                  active={active}
                  setPosition={setHoverPos}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {l.label}
                </NavTab>
              );
            })}
            <HoverCursor position={hoverPos} />
          </ul>

          {/* Mobile nav + logout */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 md:hidden">
              {links.map(l => {
                const Icon = l.icon;
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
                      active
                        ? "bg-indigo-50 text-[#1E2A5E]"
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                    title={l.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200 text-slate-400 hover:text-red-600 hover:bg-red-50 ml-1"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

function NavTab({
  children,
  href,
  active,
  setPosition,
}: {
  children: React.ReactNode;
  href: string;
  active: boolean;
  setPosition: React.Dispatch<React.SetStateAction<{ left: number; width: number; opacity: number }>>;
}) {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft });
      }}
      className="relative z-10"
    >
      <Link
        href={href}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200 ${
          active
            ? "text-[#1E2A5E]"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}

function HoverCursor({ position }: { position: { left: number; width: number; opacity: number } }) {
  return (
    <motion.li
      animate={position}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
      className="absolute z-0 top-1 h-[calc(100%-8px)] rounded-full bg-white shadow-sm border border-slate-200/60"
      style={{ listStyle: "none" }}
    />
  );
}
