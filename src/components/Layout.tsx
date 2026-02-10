import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = [
    { to: '/', label: 'Dashboard' },
    { to: '/pacientes', label: 'Pacientes' },
    { to: '/obras-sociales', label: 'Obras sociales' },
    { to: '/calendario', label: 'Calendario' },
    { to: '/prestaciones', label: 'Registro de prestaciones' },
    { to: '/configuracion', label: 'Configuración' },
  ];

  const isActive = (to: string) =>
    location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#5fb3b0] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-semibold">
            Dentissta
          </Link>

          {/* Botón hamburguesa - solo visible en móvil */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded hover:bg-white/10"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Nav desktop - oculto en móvil */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex gap-4">
              {nav.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-1 rounded transition ${
                    isActive(to) ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4 border-l border-white/30 pl-4">
              <span className="text-sm">{user?.nombre}</span>
              <button
                onClick={logout}
                className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-sm"
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil desplegable */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 px-4 py-4">
            <nav className="flex flex-col gap-2">
              {nav.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded transition ${
                    isActive(to) ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t border-white/20">
                <span className="block px-4 py-2 text-sm text-white/90">{user?.nombre}</span>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full text-left px-4 py-3 rounded hover:bg-white/10"
                >
                  Salir
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
