import { useState } from 'react';
import { Receipt, Tag, Package } from 'lucide-react';
import { ListaPreciosTab } from './components/ListaPreciosTab';
import { CobrosPendientesTab } from './components/CobrosPendientesTab';
import { ProductosTab } from './components/ProductosTab';

type TabKey = 'cobros' | 'precios' | 'productos';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { key: 'cobros', label: 'Cobros Pendientes', icon: <Receipt className="w-4 h-4" /> },
  { key: 'precios', label: 'Lista de Precios', icon: <Tag className="w-4 h-4" /> },
  { key: 'productos', label: 'Productos', icon: <Package className="w-4 h-4" /> },
];

export function CajaPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('cobros');

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#004975] tracking-tight">Caja</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Gestión financiera y catálogo de servicios</p>
        </div>
      </div>

      {/* Tabs Pill Navigation */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100 p-2">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
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

        {activeTab === 'precios' && (
          <ListaPreciosTab />
        )}

        {activeTab === 'productos' && (
          <ProductosTab />
        )}
      </div>
    </div>
  );
}
