'use client'

import { useEffect, useMemo } from 'react'
import { translations, type LanguageCode } from '@/lib/translations'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { uiAuditedLiterals } from '@/lib/ui-audited-literals.generated'
import { uiLiteralOverrides } from '@/lib/ui-literal-overrides'

const LOCALIZED_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const
const SCOPED_ROOT_SELECTOR = '[data-context="admin"], [data-context="kiosk"]'

type TranslationLookup = {
  forward: Map<string, string>
  reverse: Map<string, string>
  allowed: Set<string>
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function decodeAuditedLiteral(value: string): string {
  return value
    .replaceAll('&apos;', '’')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&rarr;', '→')
}

function collectTranslationPairs(
  english: unknown,
  localized: unknown,
  output: Map<string, string>,
) {
  if (typeof english === 'string') {
    if (typeof localized === 'string') output.set(normalize(english), localized)
    return
  }
  if (!english || typeof english !== 'object' || !localized || typeof localized !== 'object') return

  for (const key of Object.keys(english as Record<string, unknown>)) {
    collectTranslationPairs(
      (english as Record<string, unknown>)[key],
      (localized as Record<string, unknown>)[key],
      output,
    )
  }
}

function buildLookup(language: LanguageCode): TranslationLookup {
  const allowed = new Set<string>()
  for (const literal of uiAuditedLiterals) {
    allowed.add(normalize(literal))
    allowed.add(normalize(decodeAuditedLiteral(literal)))
  }

  const official = new Map<string, string>()
  collectTranslationPairs(translations.en, translations[language], official)

  const overrides = uiLiteralOverrides[language]
  const forward = new Map<string, string>()

  for (const source of allowed) {
    const translated = official.get(source) || overrides[source]
    if (translated) forward.set(source, translated)
  }

  const reverse = new Map<string, string>()
  const languages = Object.keys(translations) as LanguageCode[]
  for (const source of allowed) reverse.set(source, source)

  for (const locale of languages) {
    const localeOfficial = new Map<string, string>()
    collectTranslationPairs(translations.en, translations[locale], localeOfficial)
    for (const [source, translated] of localeOfficial) {
      if (allowed.has(source)) reverse.set(normalize(translated), source)
    }

    for (const [source, translated] of Object.entries(uiLiteralOverrides[locale])) {
      if (allowed.has(source)) reverse.set(normalize(translated), source)
    }
  }

  return { forward, reverse, allowed }
}

function preserveWhitespace(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] || ''
  const trailing = original.match(/\s*$/)?.[0] || ''
  return `${leading}${translated}${trailing}`
}

function isWithinPortalScope(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement
  return Boolean(element?.closest(SCOPED_ROOT_SELECTOR))
}

export default function PortalLocalizationBridge() {
  const { language } = useTranslation()
  const lookup = useMemo(() => buildLookup(language), [language])

  useEffect(() => {
    document.documentElement.lang = language

    const textMetadata = new WeakMap<Text, { source: string; applied: string }>()
    const attributeMetadata = new WeakMap<Element, Map<string, { source: string; applied: string }>>()
    const forwardFragments = [...lookup.forward.entries()]
      .filter(([source, localized]) => source !== localized && source.length >= 4)
      .sort(([left], [right]) => right.length - left.length)
    const reverseFragments = [...lookup.reverse.entries()]
      .filter(([localized, source]) => localized !== source && localized.length >= 4)
      .sort(([left], [right]) => right.length - left.length)

    const translateValue = (value: string, previousSource?: string) => {
      const normalized = normalize(value)
      const exactSource = previousSource || lookup.reverse.get(normalized) || normalized
      if (lookup.allowed.has(exactSource)) {
        return { source: exactSource, translated: lookup.forward.get(exactSource) || exactSource }
      }

      let source = previousSource || value
      let matched = Boolean(previousSource)
      if (!previousSource) {
        for (const [localized, english] of reverseFragments) {
          if (!source.includes(localized)) continue
          source = source.replaceAll(localized, english)
          matched = true
        }
      }

      let translated = source
      for (const [english, localized] of forwardFragments) {
        if (!translated.includes(english)) continue
        translated = translated.replaceAll(english, localized)
        matched = true
      }
      return matched ? { source, translated } : null
    }

    const translateDialogValue = (value: string) => {
      const exact = translateValue(value)
      if (exact) return exact.translated

      let translated = value
      for (const [source, localized] of forwardFragments) {
        if (translated.includes(source)) translated = translated.replaceAll(source, localized)
      }
      return translated
    }

    const translateTextNode = (textNode: Text) => {
      if (!isWithinPortalScope(textNode)) return
      const parent = textNode.parentElement
      if (!parent || parent.closest('[data-no-translate], script, style, textarea, [contenteditable="true"]')) return

      const current = textNode.data
      const metadata = textMetadata.get(textNode)
      const currentNormalized = normalize(current)
      const previousSource = metadata && currentNormalized === normalize(metadata.applied)
        ? metadata.source
        : undefined
      const result = translateValue(current, previousSource)
      if (!result) return

      const next = preserveWhitespace(current, result.translated)
      textMetadata.set(textNode, { source: result.source, applied: next })
      if (next !== current) textNode.data = next
    }

    const translateAttributes = (element: Element) => {
      if (!isWithinPortalScope(element) || element.closest('[data-no-translate]')) return
      const metadataByAttribute = attributeMetadata.get(element) || new Map()

      for (const attribute of LOCALIZED_ATTRIBUTES) {
        const current = element.getAttribute(attribute)
        if (!current) continue
        const metadata = metadataByAttribute.get(attribute)
        const previousSource = metadata && normalize(current) === normalize(metadata.applied)
          ? metadata.source
          : undefined
        const result = translateValue(current, previousSource)
        if (!result) continue

        metadataByAttribute.set(attribute, { source: result.source, applied: result.translated })
        if (result.translated !== current) element.setAttribute(attribute, result.translated)
      }

      attributeMetadata.set(element, metadataByAttribute)
    }

    const translateTree = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        translateTextNode(node as Text)
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return

      const element = node as Element
      translateAttributes(element)
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
      let current: Node | null = walker.nextNode()
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text)
        else translateAttributes(current as Element)
        current = walker.nextNode()
      }
    }

    document.querySelectorAll(SCOPED_ROOT_SELECTOR).forEach(translateTree)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateTextNode(mutation.target as Text)
        if (mutation.type === 'attributes') translateAttributes(mutation.target as Element)
        mutation.addedNodes.forEach(translateTree)
      }
    })

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...LOCALIZED_ATTRIBUTES],
    })

    const originalAlert = window.alert
    const originalConfirm = window.confirm
    const translateDialogs = /^\/(admin|kiosk)(\/|$)/.test(window.location.pathname)
    if (translateDialogs) {
      window.alert = (message?: unknown) => originalAlert.call(window, translateDialogValue(String(message ?? '')))
      window.confirm = (message?: string) => originalConfirm.call(window, translateDialogValue(message || ''))
    }

    return () => {
      observer.disconnect()
      if (translateDialogs) {
        window.alert = originalAlert
        window.confirm = originalConfirm
      }
    }
  }, [language, lookup])

  return null
}
