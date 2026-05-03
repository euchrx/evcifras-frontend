import { useState } from "react";
import type { ReactElement } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  Guitar,
  Headphones,
  Heart,
  Home,
  LogIn,
  LogOut,
  Menu,
  Music2,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import GlobalAudioPlayer from "../player/GlobalAudioPlayer";

type NavItem = {
  label: string;
  to: string;
  icon: ReactElement;
  visible: boolean;
};

function getDesktopNavLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold transition",
    isActive
      ? "bg-violet-500 text-white shadow-lg shadow-violet-950/40"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

function getMobileNavLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition",
    isActive
      ? "bg-violet-500 text-white shadow-lg shadow-violet-950/40"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-200">
        <Music2 className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>

      {description && (
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isEditor, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const hideGlobalPlayer = /^\/ouvir\/[^/]+/.test(location.pathname);

  const navItems: NavItem[] = [
    {
      label: "Início",
      to: "/",
      icon: <Home className="h-4 w-4" />,
      visible: true,
    },
    {
      label: "Buscar",
      to: "/busca",
      icon: <Search className="h-4 w-4" />,
      visible: true,
    },
    {
      label: "Ouvir",
      to: "/ouvir",
      icon: <Headphones className="h-4 w-4" />,
      visible: true,
    },
    {
      label: "Favoritas",
      to: "/favoritas",
      icon: <Heart className="h-4 w-4" />,
      visible: isAuthenticated,
    },
    {
      label: "Repertórios",
      to: "/repertorios",
      icon: <BookOpen className="h-4 w-4" />,
      visible: isAuthenticated,
    },
    {
      label: "Admin",
      to: "/admin",
      icon: <ShieldCheck className="h-4 w-4" />,
      visible: isEditor,
    },
    {
      label: "Artistas",
      to: "/admin/artistas",
      icon: <ShieldCheck className="h-4 w-4" />,
      visible: isEditor,
    },
    {
      label: "Cifras",
      to: "/admin/cifras",
      icon: <Music2 className="h-4 w-4" />,
      visible: isEditor,
    },
    {
      label: "Áudios",
      to: "/admin/audios",
      icon: <Headphones className="h-4 w-4" />,
      visible: isEditor,
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.visible);

  function handleLogout() {
    logout();
    setMobileOpen(false);
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-[#070A12] pb-28 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[30%] h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070A12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <Link
            to="/"
            className="group flex shrink-0 items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-950/40 transition group-hover:bg-violet-400">
              <Guitar className="h-5 w-5" />
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-lg font-black leading-none tracking-tight">
                EvCifras
              </p>
              <p className="mt-1 truncate text-xs font-medium text-slate-500">
                cifras, música e repertórios
              </p>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={getDesktopNavLinkClass}
                title={item.label}
                aria-label={item.label}
              >
                {item.icon}
              </NavLink>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white"
                  title={`${user?.name || "Usuário"} • ${user?.role || ""}`}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white"
                  title="Sair"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white"
                  title="Entrar"
                  aria-label="Entrar"
                >
                  <LogIn className="h-4 w-4" />
                </NavLink>

                <NavLink
                  to="/cadastro"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
                  title="Criar conta"
                  aria-label="Criar conta"
                >
                  <UserPlus className="h-4 w-4" />
                </NavLink>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/10 bg-[#070A12]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
            <nav className="mx-auto grid max-w-7xl gap-2">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={getMobileNavLinkClass}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}

              <div className="mt-3 border-t border-white/10 pt-3">
                {isAuthenticated ? (
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="truncate text-sm font-bold text-white">
                        {user?.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {user?.email} • {user?.role}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <NavLink
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </NavLink>

                    <NavLink
                      to="/cadastro"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
                    >
                      <UserPlus className="h-4 w-4" />
                      Criar conta
                    </NavLink>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            © {new Date().getFullYear()} EvCifras. Todos os direitos
            reservados.
          </p>
          <p>Uma plataforma EvSystem para músicos.</p>
        </div>
      </footer>

      {!hideGlobalPlayer && <GlobalAudioPlayer />}
    </div>
  );
}

export default AppLayout;