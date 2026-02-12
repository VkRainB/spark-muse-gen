import { useToast } from '@nuxt/ui/composables'

export function useAppToast() {
  const toast = useToast()

  const success = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'success' as const,
      icon: 'i-heroicons-check-circle',
      close: false,
      progress: false
    })
  }

  const error = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'error' as const,
      icon: 'i-heroicons-x-circle',
      close: false,
      progress: false
    })
  }

  const warning = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'warning' as const,
      icon: 'i-heroicons-exclamation-triangle',
      close: false,
      progress: false
    })
  }

  const info = (title: string, description?: string) => {
    toast.add({
      title,
      description,
      color: 'info' as const,
      icon: 'i-heroicons-information-circle',
      close: false,
      progress: false
    })
  }

  return {
    success,
    error,
    warning,
    info
  }
}
