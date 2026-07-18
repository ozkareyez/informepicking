import { useState } from 'react';
import { Package, Truck, Container, CalendarDays, BarChart2, TrendingUp } from 'lucide-react';
import DashboardProduccion from './DashboardProduccion';
import DashboardDespacho from './DashboardDespacho';
import DashboardDescargue from './DashboardDescargue';
import DashboardCitas from './DashboardCitas';
import TypeBasedWeeklyKPIs from './TypeBasedWeeklyKPIs';

type DashboardTab = 'produccion' | 'despacho' | 'descargue' | 'citas' | 'kpis-semanales';

interface TabDef {
  id: DashboardTab;
  label: string;
  icon: any;
}

const TABS: TabDef[] = [
  { id: 'produccion', label: 'Producción', icon: Package },
  { id: 'despacho', label: 'Despacho', icon: Truck },
  { id: 'descargue', label: 'Descargue', icon: Container },
  { id: 'citas', label: 'Citas Cargue', icon: CalendarDays },
  { id: 'kpis-semanales', label: 'KPIs Semanales', icon: BarChart2 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('produccion');

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'produccion' && <DashboardProduccion />}
      {activeTab === 'despacho' && <DashboardDespacho />}
      {activeTab === 'descargue' && <DashboardDescargue />}
      {activeTab === 'citas' && <DashboardCitas />}
      {activeTab === 'kpis-semanales' && <TypeBasedWeeklyKPIs />}
    </div>
  );
}