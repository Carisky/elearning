const themeColorVarMap = {
  background: '--color-background',
  surface: '--color-surface',
  primary: '--color-primary',
  secondary: '--color-secondary',
  info: '--color-info',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  'on-background': '--color-on-background',
  'on-surface': '--color-on-surface',
  'on-primary': '--color-on-primary',
  'on-secondary': '--color-on-secondary',
} as const

export type ThemeColorKey = keyof typeof themeColorVarMap
export type ThemeColors = Record<ThemeColorKey, string>

export const defaultThemeColors: ThemeColors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#8D004C',
  secondary: '#00A19B',
  info: '#00A19B',
  success: '#007F7A',
  warning: '#A64D79',
  error: '#B0003A',
  'on-background': '#1A1A1A',
  'on-surface': '#1A1A1A',
  'on-primary': '#FFFFFF',
  'on-secondary': '#FFFFFF',
}

const readCssCustomProperty = (cssText: string, propertyName: string) => {
  const match = cssText.match(new RegExp(`${propertyName}\\s*:\\s*([^;]+);`, 'i'))
  return match?.[1]?.trim()
}

export const loadThemeColorsFromCss = (cssText: string): ThemeColors => {
  const resolvedColors = { ...defaultThemeColors }

  for (const [themeKey, cssVarName] of Object.entries(themeColorVarMap) as Array<[ThemeColorKey, string]>) {
    const value = readCssCustomProperty(cssText, cssVarName)
    if (value) {
      resolvedColors[themeKey] = value
    }
  }

  return resolvedColors
}
