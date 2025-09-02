import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { CheckCircleIcon, InformationCircleIcon, DocumentArrowDownIcon, XCircleIcon } from '@heroicons/react/24/outline'

const InfoModal = ({
  isOpen,
  onClose,
  title = "Información",
  message = "",
  details = [],
  type = "info", // info, success, download, error
  confirmText = "Entendido",
  showCopyButton = false,
  copyData = ""
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-8 h-8 text-green-600" />
      case 'error':
        return <XCircleIcon className="w-8 h-8 text-red-600" />
      case 'download':
        return <DocumentArrowDownIcon className="w-8 h-8 text-blue-600" />
      default:
        return <InformationCircleIcon className="w-8 h-8 text-blue-600" />
    }
  }

  const getIconBg = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 [data-theme=\'dark\'] & bg-green-900/30'
      case 'error':
        return 'bg-red-100 [data-theme=\'dark\'] & bg-red-900/30'
      case 'download':
        return 'bg-blue-100 [data-theme=\'dark\'] & bg-blue-900/30'
      default:
        return 'bg-blue-100 [data-theme=\'dark\'] & bg-blue-900/30'
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(copyData)
    // Podrías agregar un toast aquí
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-theme-primary p-6 text-left align-middle shadow-xl transition-all border border-theme">
                <div className="flex items-start mb-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getIconBg()}`}>
                    {getIcon()}
                  </div>
                  <div className="ml-4 flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-theme-primary"
                    >
                      {title}
                    </Dialog.Title>
                  </div>
                </div>

                <div className="mb-6">
                  {message && (
                    <p className="text-sm text-theme-secondary mb-4">
                      {message}
                    </p>
                  )}
                  
                  {details.length > 0 && (
                    <div className="bg-theme-tertiary rounded-lg p-4">
                      <h4 className="text-sm font-medium text-theme-primary mb-2">Detalles:</h4>
                      <ul className="space-y-1">
                        {details.map((detail, index) => (
                          <li key={index} className="text-sm text-theme-secondary">
                            <span className="inline-block w-2 h-2 bg-university-blue rounded-full mr-2"></span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {showCopyButton && copyData && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between bg-theme-tertiary rounded-lg p-3">
                        <span className="text-sm text-theme-primary font-mono">{copyData}</span>
                        <button
                          onClick={handleCopy}
                          className="ml-2 px-3 py-1 text-xs bg-university-blue text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn-theme-primary inline-flex justify-center rounded-lg px-6 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    {confirmText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default InfoModal