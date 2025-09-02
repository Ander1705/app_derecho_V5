const FormsPage = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Formularios Legales</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gestiona solicitudes de conciliación y controles operativos
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="btn-primary"
          >
            Nuevo Formulario
          </button>
        </div>
      </div>
      
      <div className="mt-8 card-corporate">
        <div className="card-body">
          <p className="text-center text-gray-500 py-12">
            Módulo de formularios en construcción...
          </p>
        </div>
      </div>
    </div>
  )
}

export default FormsPage