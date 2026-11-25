
import Sidebar from "./Sidebar";

type ComingSoonProps = {
  title: string;
  description: string;
  section: "team" | "settings";
};

export default function ComingSoon({
  title,
  description,
  section,
}: ComingSoonProps) {
  const isTeam = section === "team";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex min-w-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* Illustration Background */}
          <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-8">

            {/* Decorative circles */}
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-blue-200/40 blur-2xl" />
            <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-purple-200/50 blur-2xl" />

            {/* Illustration */}
            <div className="relative z-10 flex flex-col items-center">

              <div className="relative mb-8 flex h-44 w-64 items-center justify-center">

                {/* Main illustration card */}
                <div className="relative flex h-36 w-52 flex-col items-center justify-center rounded-2xl border border-white bg-white/90 shadow-xl">

                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-4xl">
                    {isTeam ? "👥" : "⚙️"}
                  </div>

                  <div className="h-2 w-24 rounded-full bg-slate-200" />
                  <div className="mt-2 h-2 w-16 rounded-full bg-slate-100" />
                </div>

                {/* Floating card */}
                <div className="absolute -left-5 top-3 rounded-xl border border-white bg-white p-3 shadow-lg">
                  <span className="text-2xl">
                    {isTeam ? "🤝" : "🎨"}
                  </span>
                </div>

                {/* Floating card */}
                <div className="absolute -right-5 bottom-2 rounded-xl border border-white bg-white p-3 shadow-lg">
                  <span className="text-2xl">
                    {isTeam ? "📊" : "🔧"}
                  </span>
                </div>

                {/* Sparkle */}
                <div className="absolute -right-1 -top-3 text-3xl text-indigo-400">
                  ✦
                </div>

                <div className="absolute -bottom-3 left-4 text-2xl text-blue-400">
                  ✧
                </div>
              </div>

              <span className="rounded-full border border-blue-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-700 shadow-sm">
                Coming Soon
              </span>

              <h1 className="mt-5 text-center text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
                {title}
              </h1>

              <p className="mt-3 max-w-lg text-center text-sm leading-7 text-slate-600 sm:text-base">
                {description}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                We're working on something exciting!
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 px-6 py-4 text-center sm:flex-row">
            <p className="text-xs text-slate-500">
              Thank you for being part of WorkOra.
            </p>

            <p className="text-xs font-semibold text-slate-400">
              WORKORA · Better Work Together
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
