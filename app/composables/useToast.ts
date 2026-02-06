export function useAppToast() {
  const toast = useToast()

  const success = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'green' as const,
      icon: 'i-heroicons-check-circle'
    })
  }

  const error = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'red' as const,
      icon: 'i-heroicons-x-circle'
    })
  }

  const warning = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'yellow' as const,
      icon: 'i-heroicons-exclamation-triangle'
    })
  }

  const info = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'blue' as const,
      icon: 'i-heroicons-information-circle'
    })
  }

  return {
    success,
    error,
    warning,
    info
  }
}
