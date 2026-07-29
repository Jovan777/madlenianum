const SUPPORTED_LOCALES = Object.freeze(["sr", "en"]);
const DEFAULT_LOCALE = "sr";

const normalizeLocale = (value, fallback = DEFAULT_LOCALE) => {
  const locale = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : fallback;
};

const requestLocale = (req) => normalizeLocale(
  req.query?.lang
    || req.headers?.["x-public-locale"]
    || req.body?.locale
    || req.body?.language
    || req.acceptsLanguages?.(...SUPPORTED_LOCALES)
);

const publicLocale = (req, res, next) => {
  req.locale = requestLocale(req);
  res.setHeader("Content-Language", req.locale);
  next();
};

const plain = (value) => {
  if (!value) return value;
  return typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : value;
};

const translationOf = (value, locale) => {
  const item = plain(value) || {};
  if (locale === DEFAULT_LOCALE) return item.translations?.sr || {};
  return item.translations?.[locale] || {};
};

const localizedValue = (value, field, locale, options = {}) => {
  const item = plain(value) || {};
  const normalized = normalizeLocale(locale);
  const translation = translationOf(item, normalized);
  const translated = translation?.[field];
  if (translated !== undefined && translated !== null && translated !== "") return translated;
  if (normalized === DEFAULT_LOCALE || options.fallback !== false) return item[field] ?? options.defaultValue ?? "";
  return options.defaultValue ?? "";
};

const localizedArray = (value, field, locale, options = {}) => {
  const translated = localizedValue(value, field, locale, { ...options, defaultValue: [] });
  return Array.isArray(translated) ? translated : [];
};

const hasTranslation = (value, locale, requiredFields = ["title", "slug"]) => {
  const normalized = normalizeLocale(locale);
  if (normalized === DEFAULT_LOCALE) return true;
  const translation = translationOf(value, normalized);
  return requiredFields.every((field) => {
    const fieldValue = translation?.[field];
    return Array.isArray(fieldValue) ? fieldValue.length > 0 : Boolean(String(fieldValue || "").trim());
  });
};

const translationMeta = (value, requiredFields = ["title", "slug"]) => {
  const item = plain(value) || {};
  const englishAvailable = hasTranslation(item, "en", requiredFields);
  return {
    locale: DEFAULT_LOCALE,
    availableLocales: ["sr", "en"],
    slugs: {
      sr: item.slug || "",
      en: item.translations?.en?.slug || item.slug || "",
    },
    translationComplete: {
      sr: true,
      en: englishAvailable,
    },
  };
};

const localizedSlugQuery = (slug, locale) => (
  normalizeLocale(locale) === "en"
    ? {
        $or: [
          { "translations.en.slug": String(slug || "").trim().toLowerCase() },
          { slug: String(slug || "").trim().toLowerCase() },
        ],
      }
    : { slug: String(slug || "").trim().toLowerCase() }
);

const localizedSearchFields = (fields, locale) => (
  normalizeLocale(locale) === "en"
    ? [...fields.map((field) => `translations.en.${field}`), ...fields]
    : fields
);

// Legacy Serbian records remain publicly visible while their English
// translations are completed. Translation completeness is still exposed
// separately so admin and SEO can distinguish translated content.
const localeAvailabilityFilter = () => ({});

const localizedSeo = (value, locale) => {
  const item = plain(value) || {};
  const translation = translationOf(item, locale);
  const base = item.seo || {};
  const translationComplete = hasTranslation(item, locale);
  return {
    title: translation.seoTitle || base.title || "",
    description: translation.seoDescription || base.description || "",
    keywords: Array.isArray(translation.seoKeywords) && translation.seoKeywords.length
      ? translation.seoKeywords
      : base.keywords || [],
    canonicalUrl: normalizeLocale(locale) === "sr" ? base.canonicalUrl || "" : "",
    noIndex: Boolean(base.noIndex) || !translationComplete,
  };
};

const MESSAGES = Object.freeze({
  requiredEmail: { sr: "Email je obavezan.", en: "Email is required." },
  newsletterSaved: { sr: "Prijava je sacuvana.", en: "Your subscription has been saved." },
  contactSaved: { sr: "Poruka je sacuvana.", en: "Your message has been sent." },
  productionNotFound: { sr: "Predstava nije pronadjena.", en: "Production not found." },
  artistNotFound: { sr: "Umetnik nije pronadjen.", en: "Artist not found." },
  newsNotFound: { sr: "Vest nije pronadjena.", en: "News article not found." },
  pageNotFound: { sr: "Strana nije pronadjena.", en: "Page not found." },
});

const localeMessage = (key, locale) => MESSAGES[key]?.[normalizeLocale(locale)] || MESSAGES[key]?.sr || key;

module.exports = {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  hasTranslation,
  localeMessage,
  localeAvailabilityFilter,
  localizedArray,
  localizedSearchFields,
  localizedSeo,
  localizedSlugQuery,
  localizedValue,
  normalizeLocale,
  publicLocale,
  requestLocale,
  translationMeta,
  translationOf,
};
