// This script removes duplicate keys from all object literals in translations.ts, keeping only the last occurrence.
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'translations.ts');
const src = fs.readFileSync(filePath, 'utf8');

// Helper to remove duplicate keys in an object literal string
function removeDuplicateKeys(objStr) {
  // This regex matches key: value pairs, including nested objects/arrays/strings
  const keyValRegex = /([\w$]+)\s*:\s*((?:\{[^{}]*\}|\[[^\[\]]*\]|'[^']*'|"[^"]*"|`[^`]*`|[^,{}\[\]]+)*)/g;
  let match;
  const keys = [];
  const keyVals = [];
  let lastIndex = 0;
  while ((match = keyValRegex.exec(objStr)) !== null) {
    keys.push(match[1]);
    keyVals.push({ key: match[1], value: match[2], index: match.index });
    lastIndex = keyValRegex.lastIndex;
  }
  // Remove all but the last occurrence of each key
  const seen = new Set();
  const keep = new Array(keyVals.length).fill(true);
  for (let i = keyVals.length - 1; i >= 0; i--) {
    if (seen.has(keyVals[i].key)) {
      keep[i] = false;
    } else {
      seen.add(keyVals[i].key);
    }
  }
  // Rebuild the object literal
  let result = '';
  let cursor = 0;
  let removed = 0;
  for (let i = 0; i < keyVals.length; i++) {
    if (keep[i]) {
      result += objStr.slice(cursor, keyVals[i].index);
      result += `${keyVals[i].key}: ${keyVals[i].value}`;
      cursor = keyValRegex.lastIndex;
    } else {
      removed++;
    }
  }
  result += objStr.slice(cursor);
  return { result, removed };
}

// Find all top-level language objects
const langRegex = /(\w+):\s*\{([\s\S]*?)(?=^\s*\w+:|^\s*\})/gm;
let match;
let newSrc = src;
let totalRemoved = 0;

while ((match = langRegex.exec(src)) !== null) {
  const lang = match[1];
  const objStr = match[2];
  // Remove duplicate keys in this object
  const { result, removed } = removeDuplicateKeys(objStr);
  if (removed > 0) {
    newSrc = newSrc.replace(objStr, result);
    totalRemoved += removed;
  }
}

fs.writeFileSync(filePath, newSrc, 'utf8');
console.log(`Removed ${totalRemoved} duplicate keys from translations.ts`);
