export function useTheme() {
  const colorMode = useColorMode()

  const theme = computed(() => colorMode.preference)
  const isDark = computed(() => colorMode.value === 'dark')

  const setTheme = (value: 'light' | 'dark' | 'system') => {
    colorMode.preference = value
  }

  const toggleTheme = () => {
    colorMode.preference = isDark.value ? 'light' : 'dark'
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  }
}
