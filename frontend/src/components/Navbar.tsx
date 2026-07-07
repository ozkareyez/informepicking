import { Package, LayoutDashboard, ClipboardList, BarChart3, Timer, Truck, Container, Users } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  unassignedCount: number;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'registro', label: 'Registro', icon: ClipboardList },
  { id: 'pendientes', label: 'Pendientes', icon: Timer },
  { id: 'despacho', label: 'Despacho', icon: Truck },
  { id: 'pedidos', label: 'Pedidos', icon: Package },
  { id: 'descargue', label: 'Descargue', icon: Container },
  { id: 'operarios', label: 'Operarios', icon: Users },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
];

export default function Navbar({ activeTab, setActiveTab, pendingCount, unassignedCount }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-1.5">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900 hidden sm:block">
              Control de Productividad
            </span>
          </div>
          <div className="flex space-x-0.5 sm:space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isPending = tab.id === 'pendientes';
              const totalPending = pendingCount + unassignedCount;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center justify-center gap-1 px-3 sm:px-2 py-2 sm:py-1.5 rounded-md text-sm sm:text-xs font-medium transition-colors whitespace-nowrap min-w-[44px] sm:min-w-0 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isPending && totalPending > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:static sm:ml-1 inline-flex items-center justify-center min-w-[20px] sm:min-w-[18px] h-5 sm:h-4 text-[10px] sm:text-[9px] font-bold text-white bg-red-500 rounded-full px-1.5 sm:px-1">
                      {totalPending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
