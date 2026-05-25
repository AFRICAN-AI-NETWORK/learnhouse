const COLOR_FUNCTION_PATTERN = /\b(?:lab|lch|oklab|oklch|color)\([^)]*\)/gi

const getCanvasContext = () => {
  const canvas = document.createElement('canvas')
  return canvas.getContext('2d')
}

const isUnsupportedColorValue = (value: string) =>
  /\b(?:lab|lch|oklab|oklch|color)\(/i.test(value)

const normalizeCssColor = (value: string) => {
  const context = getCanvasContext()

  if (!context) {
    return 'transparent'
  }

  const previousFillStyle = context.fillStyle

  try {
    context.fillStyle = value
    const normalizedValue = String(context.fillStyle)
    context.fillStyle = previousFillStyle

    if (isUnsupportedColorValue(normalizedValue)) {
      return 'transparent'
    }

    return normalizedValue
  } catch {
    context.fillStyle = previousFillStyle
    return 'transparent'
  }
}

const sanitizeCssValue = (propertyName: string, value: string) => {
  if (!value) {
    return value
  }

  if (!isUnsupportedColorValue(value)) {
    return value
  }

  const normalizedValue = value.replace(COLOR_FUNCTION_PATTERN, (match) =>
    normalizeCssColor(match)
  )

  if (!isUnsupportedColorValue(normalizedValue)) {
    return normalizedValue
  }

  if (propertyName.includes('image')) {
    return 'none'
  }

  if (propertyName.includes('shadow')) {
    return 'none'
  }

  if (
    propertyName.includes('color') ||
    propertyName.includes('fill') ||
    propertyName.includes('stroke') ||
    propertyName.includes('border') ||
    propertyName.includes('outline')
  ) {
    // Fallback to a dark readable color so text remains visible in exports
    return '#1f2937'
  }

  if (propertyName === 'background') {
    return '#ffffff'
  }

  return normalizedValue
}

const copyExportSafeStyles = (
  sourceElement: HTMLElement,
  targetElement: HTMLElement
) => {
  const computedStyle = window.getComputedStyle(sourceElement)

  Array.from(computedStyle).forEach((propertyName) => {
    if (propertyName.startsWith('--')) {
      return
    }

    const value = computedStyle.getPropertyValue(propertyName)
    if (!value) {
      return
    }

    targetElement.style.setProperty(
      propertyName,
      sanitizeCssValue(propertyName, value),
      computedStyle.getPropertyPriority(propertyName)
    )
  })

  Array.from(sourceElement.children).forEach((childNode, index) => {
    const sourceChild = childNode as HTMLElement
    const targetChild = targetElement.children[index] as HTMLElement | undefined

    if (sourceChild && targetChild) {
      copyExportSafeStyles(sourceChild, targetChild)
    }
  })
}

export default copyExportSafeStyles

export const copyTextContent = (
  sourceElement: HTMLElement,
  targetElement: HTMLElement
) => {
  // If target has no textual content but source does, copy it
  const srcText = sourceElement.childNodes
    ? Array.from(sourceElement.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent || '')
        .join('')
        .trim()
    : ''

  const tgtText = targetElement.childNodes
    ? Array.from(targetElement.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent || '')
        .join('')
        .trim()
    : ''

  if (!tgtText && srcText) {
    // Remove existing text nodes in target then append source text node
    Array.from(targetElement.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .forEach((n) => n.remove())
    targetElement.appendChild(document.createTextNode(srcText))
  }

  // Recurse for element children
  const srcChildren = Array.from(sourceElement.children) as HTMLElement[]
  const tgtChildren = Array.from(targetElement.children) as HTMLElement[]

  for (let i = 0; i < srcChildren.length; i++) {
    const s = srcChildren[i]
    const t = tgtChildren[i]
    if (s && t) {
      copyTextContent(s, t)
    }
  }
}

export const collectFontFaceRules = (): string => {
  let css = ''
  const sheets = Array.from(document.styleSheets || [])
  for (const sheet of sheets) {
    try {
      const rules = sheet.cssRules || []
      for (const r of Array.from(rules)) {
        // CSSRule.FONT_FACE_RULE === 5
        if (r.type === 5) {
          css += r.cssText + '\n'
        }
      }
    } catch (e) {
      // ignore cross-origin stylesheets
      continue
    }
  }
  return css
}
