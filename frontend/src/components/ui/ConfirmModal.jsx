import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar eliminación",
  message = "¿Realmente quiere eliminar este elemento?",
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  type = "danger"
}) => {
  const getButtonColors = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white'
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'danger':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      default:
        return 'text-blue-600'
    }
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
                <div className="flex items-center mb-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    type === 'danger' ? 'bg-red-100 [data-theme=\'dark\'] & bg-red-900/30' : 
                    type === 'warning' ? 'bg-yellow-100 [data-theme=\'dark\'] & bg-yellow-900/30' : 'bg-blue-100 [data-theme=\'dark\'] & bg-blue-900/30'
                  }`}>
                    <ExclamationTriangleIcon className={`w-6 h-6 ${getIconColor()}`} />
                  </div>
                  <div className="ml-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-theme-primary"
                    >
                      {title}
                    </Dialog.Title>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-theme-secondary">
                    {message}
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-lg border border-theme bg-theme-primary px-4 py-2 text-sm font-medium text-theme-primary hover:bg-theme-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onClose}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors ${getButtonColors()}`}
                    onClick={() => {
                      onConfirm()
                      onClose()
                    }}
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

export default ConfirmModal