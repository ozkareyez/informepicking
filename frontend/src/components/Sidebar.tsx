import { useState } from 'react';
import { Menu, X, ChevronDown, ChevronRight, Package, Truck, Container, Users, BarChart3, ClipboardList, Timer, CalendarDays, LogOut, LayoutDashboard, AlertTriangle, CheckCircle, Clock, User, Settings } from 'lucide-react';
import { useAuth } from '../auth';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  icon: any;
  items: NavItem[];
  defaultOpen?: boolean;
}

const CARGUE_GROUPS: NavGroup[] = [
  {
    title: 'Proceso de Cargue',
    icon: Package,
    defaultOpen: true,
    items: [
      { id: 'registro', label: 'Registrar Pedidos', icon: ClipboardList },
      { id: 'pendientes', label: 'Asignar Operario', icon: Timer, badgeColor: 'red' },
      { id: 'despacho', label: 'Despacho / Vehículo', icon: Truck },
      { id: 'citas', label: 'Citas de Cargue', icon: CalendarDays, badgeColor: 'orange' },
    ],
  },
  {
    title: 'Proceso de Descargue',
    icon: Container,
    defaultOpen: true,
    items: [
      { id: 'descargue', label: 'Registrar Descargue', icon: Container },
      { id: 'novedades', label: 'Novedades / Seguimiento', icon: AlertTriangle, badgeColor: 'orange' },
    ],
  },
  {
    title: 'Dashboards',
    icon: LayoutDashboard,
    defaultOpen: false,
    items: [
      { id: 'dash-produccion', label: 'Producción', icon: Package },
      { id: 'dash-despacho', label: 'Despacho', icon: Truck },
      { id: 'dash-descargue', label: 'Descargue', icon: Container },
      { id: 'dash-citas', label: 'Citas / Cumplimiento', icon: CalendarDays },
    ],
  },
  {
    title: 'Administración',
    icon: Users,
    defaultOpen: false,
    items: [
      { id: 'pedidos', label: 'Listado de Pedidos', icon: ClipboardList },
      { id: 'operarios', label: 'Operarios', icon: Users },
      { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
    ],
  },
];

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 72;

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(CARGUE_GROUPS.map(g => [g.title, g.defaultOpen ?? false]))
  );

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

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-out bg-white border-r border-gray-200 flex flex-col shadow-xl ${
          collapsed ? 'w-18' : 'w-64'
        } lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: sidebarWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-gray-200 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 truncate text-sm">Control Productividad</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center ${
              collapsed ? 'mx-auto' : 'ml-auto lg:hidden'
            }`}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" role="navigation" aria-label="Navegación principal">
          {CARGUE_GROUPS.map((group, groupIndex) => {
            const isOpen = openGroups[group.title] ?? false;
            const Icon = group.icon;
            const hasActiveItem = group.items.some(item => item.id === activeTab);
            
            return (
              <div key={group.title} className="animate-slide-in" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 ${hasActiveItem ? 'text-blue-600 bg-blue-50' : ''}`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${hasActiveItem ? 'text-blue-600' : ''}`} />
                    <span className="flex-1 text-left truncate">{group.title}</span>
                    <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`} />
                  </button>
                )}
                <div
                  className={`${isOpen || collapsed ? '' : 'hidden'} mt-1 space-y-1 transition-all duration-200 ease-out overflow-hidden`}
                  style={isOpen ? { maxHeight: '500px', opacity: 1 } : { maxHeight: 0, opacity: 0 }}
                >
                  {group.items.map((item, itemIndex) => {
                    const isActive = activeTab === item.id;
                    const badge = getBadge(item);
                    const badgeColor = item.badgeColor || 'red';
                    const ItemIcon = item.icon;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } relative group`}
                        style={{ animationDelay: `${itemIndex * 20}ms` }}
                      >
                        <ItemIcon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {badge !== undefined && badge > 0 && !collapsed && renderBadge(badge, badgeColor)}
                        {collapsed && (
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {item.label}
                          </span>
                        )}
                      </button>
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
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-blue-700">{user.charAt(0).toUpperCase()}</span>
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
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-40 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 active:scale-95 animate-bounce-in"
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Collapsed expand button */}
      {collapsed && !mobileOpen && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-3 top-3 z-50 p-2 rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 animate-slide-in-left"
          aria-label="Expandir menú"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </>
  );
}