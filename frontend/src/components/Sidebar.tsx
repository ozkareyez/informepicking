import { useState, useEffect } from 'react';
import { 
  Menu, X, ChevronDown, ChevronRight, Package, Truck, Container, Users, BarChart3, ClipboardList, Timer, CalendarDays, LogOut, LayoutDashboard, AlertTriangle, CheckCircle, Clock, User, Settings, Warehouse,
  Menu as MenuIcon, LogOut as LucideLogOut, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { useAuth } from '../auth';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: 'red' | 'orange' | 'blue' | 'green';
  path: string;
}

interface NavGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Cargue',
    icon: Package,
    defaultOpen: true,
    items: [
      { id: 'registro', label: 'Registrar Pedidos', icon: ClipboardList, path: '/registro' },
      { id: 'pendientes', label: 'Asignar Operario', icon: Timer, badgeColor: 'red', path: '/pendientes' },
      { id: 'despacho', label: 'Despacho / Vehículo', icon: Truck, path: '/despacho' },
      { id: 'citas', label: 'Citas de Cargue', icon: CalendarDays, badgeColor: 'orange', path: '/citas' },
    ],
  },
  {
    title: 'Descargue',
    icon: Container,
    defaultOpen: true,
    items: [
      { id: 'descargue', label: 'Registrar Descargue', icon: Container, path: '/descargue' },
      { id: 'novedades', label: 'Novedades / Seguimiento', icon: AlertTriangle, badgeColor: 'orange', path: '/novedades' },
    ],
  },
  {
    title: 'Dashboards',
    icon: LayoutDashboard,
    defaultOpen: false,
    items: [
      { id: 'dash-produccion', label: 'Producción', icon: Package, path: '/dash-produccion' },
      { id: 'dash-despacho', label: 'Despacho', icon: Truck, path: '/dash-despacho' },
      { id: 'dash-descargue', label: 'Descargue', icon: Container, path: '/dash-descargue' },
      { id: 'dash-citas', label: 'Citas / Cumplimiento', icon: CalendarDays, path: '/dash-citas' },
      { id: 'dash-bodega', label: 'Bodega / Ocupación', icon: Warehouse, path: '/dash-bodega' },
    ],
  },
  {
    title: 'Administración',
    icon: Settings,
    defaultOpen: false,
    items: [
      { id: 'pedidos', label: 'Listado de Pedidos', icon: ClipboardList, path: '/pedidos' },
      { id: 'operarios', label: 'Operarios', icon: Users, path: '/operarios' },
      { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, path: '/estadisticas' },
    ],
  },
];

const SIDEBAR_WIDTH = 272;
const SIDEBAR_COLLAPSED = 72;
const HEADER_HEIGHT = 56;

export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingCount,
  unassignedCount,
  citasPendientes,
  novedadesPendientes,
  user,
  onLogout,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  unassignedCount: number;
  citasPendientes: number;
  novedadesPendientes: number;
  user: string;
  onLogout: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(NAV_GROUPS.map(g => [g.title, g.defaultOpen ?? false]))
  );

  // Sync open groups with active tab
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.id === activeTab));
    if (activeGroup && !openGroups[activeGroup.title]) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.title]: true }));
    }
  }, [activeTab]);

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const getBadge = (item: NavItem) => {
    if (item.id === 'pendientes') return pendingCount + unassignedCount;
    if (item.id === 'citas') return citasPendientes;
    if (item.id === 'novedades') return novedadesPendientes;
    return item.badge;
  };

  const renderBadge = (count: number | undefined, color: string = 'red') => {
    if (!count || count === 0) return null;
    const colors = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
    };
    return (
      <span className={`flex items-center justify-center min-w-[18px] h-5 text-[10px] font-bold text-white rounded-full px-1.5 ${colors[color as keyof typeof colors] || colors.red}`}>
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleCollapsed = () => {
    setCollapsed(prev => !prev);
  };

  const handleItemClick = (item: NavItem) => {
    setActiveTab(item.id);
    if (window.innerWidth < 1024) setMobileOpen(false);
  };

  const handleMobileToggle = () => setMobileOpen(!mobileOpen);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fade-in"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-out bg-white border-r border-gray-200 flex flex-col shadow-xl ${
          collapsed ? 'w-18' : 'w-[272px]'
        } lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH }}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-gray-200 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 truncate text-sm">Control Productividad</span>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center ${
              collapsed ? 'mx-auto' : 'ml-auto lg:hidden'
            }`}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" role="navigation" aria-label="Navegación principal">
          {NAV_GROUPS.map((group, groupIndex) => {
            const isOpen = openGroups[group.title] ?? false;
            const Icon = group.icon;
            const hasActiveItem = group.items.some(item => isActive(item.path));

            return (
              <div key={group.title} className="animate-slide-in" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                <div className={`mt-1 space-y-1 transition-all duration-200 ease-out overflow-hidden ${isOpen || collapsed ? '' : 'hidden'}`}
                     style={isOpen ? { maxHeight: '500px', opacity: 1 } : { maxHeight: 0, opacity: 0 }}>
                  {group.items.map((item, itemIndex) => {
                    const active = isActive(item.path);
                    const badge = getBadge(item);
                    const badgeColor = item.badgeColor || 'red';
                    const ItemIcon = item.icon;

                    return (
                      <NavLink
                        key={item.id}
                        to={item.path}
                        onClick={() => handleItemClick(item)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } relative group`}
                        style={{ animationDelay: `${itemIndex * 20}ms` }}
                        aria-current={active ? 'page' : undefined}
                      >
                        <ItemIcon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {badge !== undefined && badge > 0 && !collapsed && renderBadge(badge, item.badgeColor || 'red')}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {item.label}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer - User & Logout */}
        <div className="p-3 border-t border-gray-200 shrink-0">
          {!collapsed && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 px-2">Usuario</p>
              <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-emerald-700">{user.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 truncate">{user}</span>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              collapsed
                ? 'p-2 mx-auto text-gray-500 hover:bg-red-50 hover:text-red-600'
                : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
            }`}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={handleMobileToggle}
        className="lg:hidden fixed bottom-5 right-5 z-40 p-3 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all duration-200 hover:scale-105 active:scale-95 animate-bounce-in"
        aria-label="Abrir menú"
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      {/* Collapsed expand button */}
      {collapsed && !mobileOpen && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-3 top-3 z-50 p-2 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-slide-in-left"
          aria-label="Expandir menú"
        >
          <MenuIcon className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </>
  );
}