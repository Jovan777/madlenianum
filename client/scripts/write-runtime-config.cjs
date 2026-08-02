const fs = require("node:fs");
const path = require("node:path");

const rawOrigin = String(process.env.MADLENIANUM_API_ORIGIN || "").trim();

if (!rawOrigin) {
  throw new Error(
    "MADLENIANUM_API_ORIGIN is required for the Vercel production build. " +
      "Set it to the public Render origin, for example https://example.onrender.com."
  );
}

let apiOrigin;

try {
  const parsed = new URL(rawOrigin);
  if (parsed.protocol !== "https:") {
    throw new Error("The production API origin must use HTTPS.");
  }
  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  apiOrigin = parsed.origin;
} catch (error) {
  throw new Error(`Invalid MADLENIANUM_API_ORIGIN: ${error.message}`);
}

const targetPath = path.resolve(__dirname, "../public/runtime-config.js");
const contents = [
  "globalThis.__MADLENIANUM_CONFIG__ = Object.freeze({",
  `  apiOrigin: ${JSON.stringify(apiOrigin)},`,
  "});",
  "",
].join("\n");

fs.writeFileSync(targetPath, contents, "utf8");
console.log(`Configured Angular API and media origin: ${apiOrigin}`);
