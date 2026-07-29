const fs = require("node:fs");
const path = require("node:path");

const sourceRoot = path.join(__dirname, "..", "src", "app", "public");
const dictionaryPath = path.join(sourceRoot, "i18n", "public-translations.ts");

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const fullPath = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(fullPath) : [fullPath];
});

const dictionary = fs.readFileSync(dictionaryPath, "utf8");
const englishMarker = dictionary.indexOf("\n  en: {");
if (englishMarker < 0) throw new Error("English public translation dictionary was not found.");

const keysIn = (source) => new Set(
  [...source.matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]),
);
const serbianKeys = keysIn(dictionary.slice(0, englishMarker));
const englishKeys = keysIn(dictionary.slice(englishMarker));
const usedKeys = new Set();

for (const file of walk(sourceRoot).filter((filePath) => /\.(html|ts)$/.test(filePath))) {
  if (file === dictionaryPath) continue;
  const source = fs.readFileSync(file, "utf8");
  const patterns = [
    /['"]([a-z][\w]*(?:\.[\w]+)+)['"]\s*\|\s*publicTranslate/g,
    /(?:i18n\.)?t\(\s*['"]([a-z][\w]*(?:\.[\w]+)+)['"]/g,
  ];
  patterns.forEach((pattern) => {
    for (const match of source.matchAll(pattern)) usedKeys.add(match[1]);
  });
}

const missingSerbian = [...usedKeys].filter((key) => !serbianKeys.has(key)).sort();
const missingEnglish = [...usedKeys].filter((key) => !englishKeys.has(key)).sort();
const languageMismatch = [...serbianKeys]
  .filter((key) => !englishKeys.has(key))
  .concat([...englishKeys].filter((key) => !serbianKeys.has(key)))
  .sort();

if (missingSerbian.length || missingEnglish.length || languageMismatch.length) {
  console.error(JSON.stringify({ missingSerbian, missingEnglish, languageMismatch }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  success: true,
  usedKeys: usedKeys.size,
  dictionaryKeys: serbianKeys.size,
  message: "Every detected public UI key exists in both Serbian and English.",
}, null, 2));
