const sanitizeHtml = require("sanitize-html");

const ALLOWED_TAGS = [
  "p",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "br",
];

const sanitizeRichText = (value) => {
  if (value === null || value === undefined) return "";

  return sanitizeHtml(String(value), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
    disallowedTagsMode: "discard",
  }).trim();
};

module.exports = {
  ALLOWED_TAGS,
  sanitizeRichText,
};
