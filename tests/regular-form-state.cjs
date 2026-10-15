const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript'), fs = require('node:fs')
const exportsObject = {}
new Function('exports', ts.transpileModule(fs.readFileSync('lib/regular-form-state.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exportsObject)
const { changedAttachments } = exportsObject
const original = [{ id: 'evidence', file_name: 'spec.pdf', notes: 'Current label' }]
test('adding then removing a file restores the unchanged evidence state', () => {
  assert.equal(changedAttachments([], []), null)
  assert.equal(changedAttachments(original, original), null)
  assert.equal(changedAttachments([{ ...original[0], isExisting: true, version: '' }], original), null)
})
test('removing evidence or changing its supplier/review metadata remains unsaved', () => {
  for (const files of [[], [{ ...original[0], supplier_name: 'New supplier' }], [{ ...original[0], notes: 'Changed' }], [{ ...original[0], next_review_date: '2027-01-01' }]]) {
    assert.equal(changedAttachments(files, original), files)
  }
})
test('a replacement file counts even when its name and metadata match', () => {
  const replacement = [{ ...original[0], file: {} }]
  assert.equal(changedAttachments(replacement, original), replacement)
})
