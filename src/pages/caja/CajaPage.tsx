import { Receipt, ShoppingCart } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CobrosPendientesTab } from './components/CobrosPendientesTab';
import { VentasTab } from './components/VentasTab';

type TabKey = 'cobros' | 'ventas';

const VALID_TABS: TabKey[] = ['cobros', 'ventas'];

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { key: 'cobros', label: 'Cobros Pendientes', icon: <Receipt className="w-4 h-4" /> },
  { key: 'ventas', label: 'Ventas', icon: <ShoppingCart className="w-4 h-4" /> },
];

export function CajaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'cobros';

  const handleTabChange = (tab: TabKey) => {
    setSearchParams(tab === 'cobros' ? {} : { tab }, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#004975] tracking-tight">Caja</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Gestión financiera: cobros y ventas del día</p>
        </div>
      </div>

      {/* Tabs Pill Navigation */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-2">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-[#004975] text-white shadow-lg shadow-[#004975]/20 scale-[1.02]'
                  : 'text-gray-400 hover:text-[#004975] hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'cobros' && (
          <CobrosPendientesTab />
        )}

        {activeTab === 'ventas' && (
          <VentasTab />
        )}
      </div>
    </div>
  );
}
