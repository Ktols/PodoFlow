export function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-background-container p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-500">Pacientes Hoy</h3>
          <p className="text-3xl font-bold text-primary mt-2">12</p>
        </div>
        <div className="bg-background-container p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-500">Ingresos del Día</h3>
          <p className="text-3xl font-bold text-primary mt-2">S/ 450</p>
        </div>
        <div className="bg-background-container p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-500">Nuevos Pacientes</h3>
          <p className="text-3xl font-bold text-primary mt-2">3</p>
        </div>
      </div>
      
      <div className="bg-background-container p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
        <h3 className="text-xl font-bold text-secondary mb-4">Próximas Citas</h3>
        <p className="text-gray-500 text-sm">No hay citas registradas para las próximas horas.</p>
      </div>
    </div>
  );
}
