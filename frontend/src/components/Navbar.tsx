import { Package, LayoutDashboard, ClipboardList, BarChart3, Timer } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'registro', label: 'Registro', icon: ClipboardList },
  { id: 'pendientes', label: 'Pendientes', icon: Timer },
  { id: 'pedidos', label: 'Pedidos', icon: Package },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
];

export default function Navbar({ activeTab, setActiveTab, pendingCount }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              Control de Productividad
            </span>
          </div>
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isPending = tab.id === 'pendientes';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isPending && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 sm:static sm:ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {pendingCount}
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
