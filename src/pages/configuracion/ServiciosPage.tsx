import { ListaPreciosTab } from '../caja/components/ListaPreciosTab';

export function ServiciosPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#004975] tracking-tight">Catálogo de Servicios</h1>
        <p className="text-sm font-bold text-gray-400 mt-1">Administra los servicios y sus precios</p>
      </div>
      <ListaPreciosTab />
    </div>
  );
}
