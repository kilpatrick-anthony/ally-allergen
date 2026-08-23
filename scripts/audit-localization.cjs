const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const scanRoots = [
  'app/admin',
  'components/admin',
  'components/messaging',
  'components/auth',
  'components/layout',
  'components/shared',
  'components/team',
  'components/ui',
  'components/SpeechController.tsx',
  'app/kiosk',
  'components/kiosk',
]
const recentOnly = process.argv.includes('--recent')
const recentFiles = new Set([
  'components/admin/MenuItemSupplyFields.tsx',
  'components/admin/AdminTopBar.tsx',
  'components/admin/QRCodeManagement.tsx',
  'components/admin/NotificationsPanel.tsx',
  'components/admin/ReviewFrequencySelector.tsx',
  'components/layout/LoadingScreen.tsx',
  'components/layout/Navigation.tsx',
  'components/messaging/CharacterMessageForm.tsx',
  'components/shared/CookieConsentManager.tsx',
  'components/shared/NotificationContainer.tsx',
  'components/team/TeamMembersPanel.tsx',
  'app/admin/devices/page.tsx',
  'app/admin/qr-codes/page.tsx',
  'app/admin/sites/page.tsx',
])

function loadTypeScriptExport(filename, exportName) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText
  const moduleRecord = { exports: {} }
  const localRequire = (request) => {
    if (request === '@/lib/admin-access-translations') {
      return {
        adminAccessTranslations: loadTypeScriptExport(
          path.join(root, 'lib/admin-access-translations.ts'),
          'adminAccessTranslations',
        ),
      }
    }
    if (request === '@/lib/recent-ui-translations') {
      return {
        recentUiTranslations: loadTypeScriptExport(
          path.join(root, 'lib/recent-ui-translations.ts'),
          'recentUiTranslations',
        ),
      }
    }
    return require(request)
  }
  new Function('module', 'exports', 'require', output)(moduleRecord, moduleRecord.exports, localRequire)
  return moduleRecord.exports[exportName]
}

function loadTranslations() {
  return loadTypeScriptExport(path.join(root, 'lib/translations.ts'), 'translations')
}

function flattenStrings(value, prefix = '', output = new Map()) {
  if (typeof value === 'string') {
    const normalized = normalize(value)
    if (normalized && !output.has(normalized)) output.set(normalized, prefix)
    return output
  }
  if (!value || typeof value !== 'object') return output
  for (const [key, child] of Object.entries(value)) {
    flattenStrings(child, prefix ? `${prefix}.${key}` : key, output)
  }
  return output
}

function flattenPaths(value, prefix = '', output = new Map()) {
  if (typeof value === 'string') {
    output.set(prefix, value)
    return output
  }
  if (!value || typeof value !== 'object') return output
  for (const [key, child] of Object.entries(value)) {
    flattenPaths(child, prefix ? `${prefix}.${key}` : key, output)
  }
  return output
}

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function walkFiles(directory, output = []) {
  if (!fs.existsSync(directory)) return output
  if (fs.statSync(directory).isFile()) {
    if (directory.endsWith('.tsx') && !directory.endsWith('.backup')) output.push(directory)
    return output
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walkFiles(target, output)
    else if (entry.isFile() && target.endsWith('.tsx') && !target.endsWith('.backup')) output.push(target)
  }
  return output
}

function looksUserFacing(value) {
  const text = normalize(value)
  if (!text || !/[A-Za-z]/.test(text)) return false
  if (/^(https?:|\/|#|[a-z]+-[a-z-]+$)/i.test(text)) return false
  return true
}

function lineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function recordStaticStrings(node, record, kind) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    record(node, node.text, kind)
    return
  }
  if (ts.isTemplateExpression(node)) {
    record(node.head, node.head.text, kind)
    for (const span of node.templateSpans) record(span.literal, span.literal.text, kind)
    return
  }
  ts.forEachChild(node, (child) => recordStaticStrings(child, record, kind))
}

function recordRenderedStrings(node, record, kind) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    record(node, node.text, kind)
    return
  }
  if (ts.isTemplateExpression(node)) {
    record(node.head, node.head.text, kind)
    for (const span of node.templateSpans) record(span.literal, span.literal.text, kind)
    return
  }
  if (ts.isConditionalExpression(node)) {
    recordRenderedStrings(node.whenTrue, record, kind)
    recordRenderedStrings(node.whenFalse, record, kind)
    return
  }
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind
    if (operator === ts.SyntaxKind.PlusToken) {
      recordRenderedStrings(node.left, record, kind)
      recordRenderedStrings(node.right, record, kind)
    } else if ([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(operator)) {
      recordRenderedStrings(node.right, record, kind)
    }
    return
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
    recordRenderedStrings(node.expression, record, kind)
    return
  }
  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements) recordRenderedStrings(element, record, kind)
  }
}

function isInsideNonContentElement(node, sourceFile) {
  let current = node.parent
  while (current && current !== sourceFile) {
    if (ts.isJsxElement(current)) {
      const tag = current.openingElement.tagName.getText(sourceFile).toLowerCase()
      if (['script', 'style', 'code', 'pre'].includes(tag)) return true
      if (current.openingElement.attributes.properties.some((attribute) =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'data-no-translate'
      )) return true
    }
    if (ts.isJsxSelfClosingElement(current) && current.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'data-no-translate'
    )) {
      return true
    }
    current = current.parent
  }
  return false
}

function callName(node) {
  if (ts.isIdentifier(node.expression)) return node.expression.text
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text
  return ''
}

function isInsideLocalizedBranch(node, sourceFile) {
  let current = node.parent
  while (current && current !== sourceFile) {
    if (ts.isPropertyAssignment(current)) {
      const name = current.name.getText(sourceFile).replace(/["']/g, '')
      if (['ga', 'pt', 'fr', 'es', 'de'].includes(name)) return true
    }
    current = current.parent
  }
  return false
}

const translations = loadTranslations()
const english = flattenStrings(translations.en)
const flattenedTranslations = Object.fromEntries(
  Object.entries(translations).map(([language, values]) => [language, flattenPaths(values)]),
)
const translationOverrides = loadTypeScriptExport(
  path.join(root, 'lib/ui-literal-overrides.ts'),
  'uiLiteralOverrides',
)
const reviewedOverrides = new Set(
  Object.entries(translationOverrides.en).flatMap(([key, value]) => [normalize(key), normalize(value)]),
)
const findings = []
const usedTranslationKeys = new Set()

for (const relativeRoot of scanRoots) {
  for (const filename of walkFiles(path.join(root, relativeRoot))) {
    const relativeFilename = path.relative(root, filename)
    if (recentOnly && !recentFiles.has(relativeFilename)) continue
    const source = fs.readFileSync(filename, 'utf8')
    const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

    function record(node, value, kind) {
      if (isInsideNonContentElement(node, sourceFile)) return
      let current = node.parent
      while (current && current !== sourceFile) {
        if (ts.isCallExpression(current) && callName(current) === 't') return
        current = current.parent
      }

      const text = normalize(value)
      if (!looksUserFacing(text)) return
      findings.push({
        file: relativeFilename,
        line: lineNumber(sourceFile, node),
        kind,
        text,
        key: english.get(text) || (reviewedOverrides.has(text) ? 'reviewed-override' : ''),
      })
    }

    function visit(node) {
      if (ts.isCallExpression(node) && callName(node) === 't' && ts.isStringLiteral(node.arguments[0])) {
        usedTranslationKeys.add(node.arguments[0].text)
      }
      if (ts.isJsxText(node)) record(node, node.getText(sourceFile), 'text')
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const attribute = node.name.getText(sourceFile)
        if (['placeholder', 'title', 'aria-label'].includes(attribute)) {
          record(node, node.initializer.text, attribute)
        }
      }
      if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent) && node.expression) {
        recordRenderedStrings(node.expression, record, 'expression')
      }
      if (ts.isCallExpression(node) && ['showNotification', 'alert', 'confirm'].includes(callName(node))) {
        if (node.arguments[0]) recordStaticStrings(node.arguments[0], record, callName(node))
      }
      if (ts.isPropertyAssignment(node) && !isInsideLocalizedBranch(node, sourceFile)) {
        const property = node.name.getText(sourceFile).replace(/["']/g, '')
        if (['label', 'title', 'description', 'help', 'emptyText'].includes(property)) {
          recordStaticStrings(node.initializer, record, `property:${property}`)
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

for (const finding of findings) {
  const candidate = finding.key ? ` -> ${finding.key}` : ' -> MISSING'
  process.stdout.write(`${finding.file}:${finding.line} [${finding.kind}] ${JSON.stringify(finding.text)}${candidate}\n`)
}

const matched = findings.filter((finding) => finding.key).length
const missing = findings.length - matched
process.stdout.write(`\n${findings.length} visible literals: ${matched} are covered by reviewed translations; ${missing} need review.\n`)
const missingTranslationKeys = []
for (const key of [...usedTranslationKeys].sort()) {
  for (const language of Object.keys(flattenedTranslations)) {
    if (!flattenedTranslations[language].has(key)) missingTranslationKeys.push(`${language}:${key}`)
  }
}
if (missingTranslationKeys.length > 0) {
  process.stdout.write(`Missing locale values: ${missingTranslationKeys.join(', ')}\n`)
}
process.stdout.write(`${usedTranslationKeys.size} static translation keys checked across ${Object.keys(flattenedTranslations).length} locales.\n`)
if (process.argv.includes('--write-catalogue')) {
  const literals = [...new Set(findings.map((finding) => finding.text))].sort((a, b) => a.localeCompare(b))
  const target = path.join(root, 'lib/ui-audited-literals.generated.ts')
  fs.writeFileSync(
    target,
    `// Generated by scripts/audit-localization.cjs --write-catalogue\nexport const uiAuditedLiterals = ${JSON.stringify(literals, null, 2)} as const\n`,
    'utf8',
  )
}
if (missing > 0 || missingTranslationKeys.length > 0) process.exitCode = 1
