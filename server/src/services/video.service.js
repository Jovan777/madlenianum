const { isHttpUrl } = require("../models/schemas/cms.schemas");

const VIDEO_PROVIDERS = ["youtube", "vimeo", "external"];

const detectVideoProvider = (value) => {
  if (!isHttpUrl(value)) return null;

  const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "youtube";
  if (hostname === "vimeo.com" || hostname.endsWith("vimeo.com")) return "vimeo";
  return "external";
};

const isValidVideoUrl = (value, provider) => {
  const detected = detectVideoProvider(value);
  if (!detected || !VIDEO_PROVIDERS.includes(provider)) return false;
  return provider === "external" || detected === provider;
};

module.exports = {
  VIDEO_PROVIDERS,
  detectVideoProvider,
  isValidVideoUrl,
};
