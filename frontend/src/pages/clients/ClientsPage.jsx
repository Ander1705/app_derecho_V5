const ClientsPage = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todos los clientes registrados en el sistema
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="btn-primary"
          >
            Agregar Cliente
          </button>
        </div>
      </div>
      
      <div className="mt-8 card-corporate">
        <div className="card-body">
          <p className="text-center text-gray-500 py-12">
            Módulo de clientes en construcción...
          </p>
        </div>
      </div>
    </div>
  )
}

export default ClientsPage