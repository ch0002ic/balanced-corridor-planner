import { NavLink, Outlet } from "react-router-dom";

const App = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">Balanced Corridor Planner</span>
        <div className="flex gap-4 text-sm">
          <NavLink
            to="/"
            className={({ isActive }: { isActive: boolean }) => (isActive ? "text-cyan-300" : "hover:text-cyan-300")}
          >
            Overview
          </NavLink>
          <NavLink
            to="/features"
            className={({ isActive }: { isActive: boolean }) => (isActive ? "text-cyan-300" : "hover:text-cyan-300")}
          >
            Feature Toggles
          </NavLink>
          <NavLink
            to="/archives"
            className={({ isActive }: { isActive: boolean }) => (isActive ? "text-cyan-300" : "hover:text-cyan-300")}
          >
            Archives
          </NavLink>
        </div>
      </nav>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Outlet />
    </main>
  </div>
);

export default App;
