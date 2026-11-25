
import Link from "next/link";

const navigation = [
  { name: "Dashboard", href: "/", icon: "▦" },
  { name: "Projects", href: "/projects", icon: "▣" },
  { name: "My Tasks", href: "/tasks", icon: "✓" },
  { name: "Team", href: "/team", icon: "♧" },
  { name: "Settings", href: "/settings", icon: "⚙" },
];

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-slate-200 bg-white p-5">

      {/* Brand */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-blue-600">
          Phrasis
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Workspace Platform
        </p>
      </div>

      {/* Workspace */}
      <div className="mb-8 rounded-lg bg-slate-100 p-3">
        <p className="text-xs text-slate-500">
          WORKSPACE
        </p>
        <p className="mt-1 font-semibold text-slate-800">
          My Workspace
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        <p className="mb-2 text-xs font-semibold text-slate-400">
          MENU
        </p>

        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
          >
            <span className="text-lg">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-200 pt-5">
        <p className="text-sm font-semibold text-slate-700">
          Vikas
        </p>
        <p className="text-xs text-slate-400">
          Workspace Member
        </p>
      </div>

    </aside>
  );
}
