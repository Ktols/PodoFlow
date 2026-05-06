import { PacksList } from './components/PacksList';

export function PacksPromocionesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#004975] tracking-tight">Packs y Promociones</h1>
        <p className="text-sm font-bold text-gray-400 mt-1">Crea y gestiona ofertas especiales para tus pacientes</p>
      </div>
      <PacksList />
    </div>
  );
}
