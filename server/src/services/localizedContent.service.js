const isPlainObject = (value) =>
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && !(value instanceof Date);

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === "function") return value.toObject({ depopulate: true });
  return value;
};

const mergeObjects = (current, incoming) => {
  if (!isPlainObject(incoming)) return incoming;

  const result = { ...toPlainObject(current) };
  Object.entries(incoming).forEach(([key, value]) => {
    result[key] = isPlainObject(value)
      ? mergeObjects(result[key], value)
      : value;
  });
  return result;
};

const withMergedTranslations = (document, payload = {}) => {
  if (!Object.prototype.hasOwnProperty.call(payload, "translations")) return payload;

  return {
    ...payload,
    translations: mergeObjects(toPlainObject(document.translations), payload.translations || {}),
  };
};

const assignLocalizedPayload = (document, payload = {}) => {
  Object.assign(document, withMergedTranslations(document, payload));
  return document;
};

module.exports = {
  assignLocalizedPayload,
  withMergedTranslations,
};
