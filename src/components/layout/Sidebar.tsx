
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: "▦" },
  { name: "Projects", href: "/projects", icon: "▣" },
  { name: "My Tasks", href: "/tasks", icon: "✓" },
  { name: "Team", href: "/team", icon: "♧" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Phrasis
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-2xl text-slate-700 hover:bg-slate-100"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      {/* Mobile Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white p-5 shadow-xl transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">
              Phrasis
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Workspace Platform
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="mb-8 rounded-lg bg-slate-100 p-3">
          <p className="text-xs text-slate-500">WORKSPACE</p>
          <p className="mt-1 font-semibold text-slate-800">
            My Workspace
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          <p className="mb-2 text-xs font-semibold text-slate-400">
            MENU
          </p>

          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-5">
          <p className="text-sm font-semibold text-slate-700">
            Vikas
          </p>
          <p className="text-xs text-slate-400">
            Workspace Member
          </p>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-blue-600">
            Phrasis
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Workspace Platform
          </p>
        </div>

        <div className="mb-8 rounded-lg bg-slate-100 p-3">
          <p className="text-xs text-slate-500">WORKSPACE</p>
          <p className="mt-1 font-semibold text-slate-800">
            My Workspace
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          <p className="mb-2 text-xs font-semibold text-slate-400">
            MENU
          </p>

          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-5">
          <p className="text-sm font-semibold text-slate-700">
            Vikas
          </p>
          <p className="text-xs text-slate-400">
            Workspace Member
          </p>
        </div>
      </aside>
    </>
  );
}
