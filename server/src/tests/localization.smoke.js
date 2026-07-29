const assert = require("node:assert/strict");

const {
  eventDto,
  mediaDto,
  pageDto,
  productionDto,
  promoSlideDto,
} = require("../services/cmsDto.service");
const {
  localizedSlugQuery,
  localizedValue,
  normalizeLocale,
} = require("../services/locale.service");
const { withMergedTranslations } = require("../services/localizedContent.service");

const production = {
  _id: "production-1",
  slug: "srpski-naslov",
  title: "Srpski naslov",
  subtitle: "Srpski podnaslov",
  status: "published",
  translations: {
    en: {
      slug: "english-title",
      title: "English title",
      subtitle: "English subtitle",
    },
  },
  creativeTeam: [{
    _id: "credit-1",
    roleKey: "director",
    label: "Reditelj",
    name: "Ime reditelja",
    note: "Srpska napomena",
    translations: {
      en: { label: "Director", name: "Director name", note: "English note" },
    },
  }],
  cast: [{
    _id: "cast-1",
    name: "Ime glumca",
    role: "Lik",
    translations: { en: { name: "Actor name", role: "Character", note: "Cast note" } },
  }],
  videos: [{
    _id: "video-1",
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Trejler",
    isTrailer: true,
    translations: { en: { title: "Trailer" } },
  }],
  reviews: [{
    _id: "review-1",
    title: "Kritika",
    publication: "Kulturni dodatak",
    url: "https://example.com/review",
    note: "Srpska beleška",
    translations: {
      en: { title: "Review", publication: "Culture supplement", note: "English note" },
    },
  }],
};

assert.equal(normalizeLocale("en-US"), "en");
assert.equal(normalizeLocale("unknown"), "sr");
assert.equal(localizedValue(production, "title", "sr"), "Srpski naslov");
assert.equal(localizedValue(production, "title", "en"), "English title");
assert.equal(localizedValue({ title: "Legacy Serbian" }, "title", "en"), "Legacy Serbian");
assert.equal(
  localizedValue({ title: "Legacy Serbian" }, "title", "en", { fallback: false }),
  "",
);
assert.deepEqual(localizedSlugQuery("english-title", "en"), {
  $or: [
    { "translations.en.slug": "english-title" },
    { slug: "english-title" },
  ],
});

const englishProduction = productionDto(production, "en");
assert.equal(englishProduction.title, "English title");
assert.equal(englishProduction.slug, "english-title");
assert.equal(englishProduction.locale, "en");
assert.equal(englishProduction.slugs.sr, "srpski-naslov");
assert.equal(englishProduction.slugs.en, "english-title");
assert.equal(englishProduction.creativeTeam[0].label, "Director");
assert.equal(englishProduction.creativeTeam[0].name, "Director name");
assert.equal(englishProduction.creativeTeam[0].note, "English note");
assert.equal(englishProduction.cast[0].name, "Actor name");
assert.equal(englishProduction.cast[0].role, "Character");
assert.equal(englishProduction.videos[0].title, "Trailer");
assert.equal(englishProduction.reviews[0].title, "Review");
assert.equal(englishProduction.reviews[0].publication, "Culture supplement");
assert.equal(englishProduction.reviews[0].note, "English note");

const englishEvent = eventDto({
  _id: "event-1",
  startsAt: new Date(Date.now() + 86_400_000),
  badge: "Premijera",
  status: "published",
  saleStatus: "not_started",
  ticketing: {
    enabled: false,
    provider: "manual",
    note: "Prodaja na blagajni",
  },
  translations: {
    en: {
      badge: "Premiere",
      ticketingNote: "Tickets available at the box office",
    },
  },
}, "en");
assert.equal(englishEvent.badge, "Premiere");
assert.equal(englishEvent.ticketing.note, "Tickets available at the box office");

const serbianEvent = eventDto({
  _id: "event-1",
  startsAt: new Date(Date.now() + 86_400_000),
  badge: "Premijera",
  status: "published",
  saleStatus: "not_started",
  ticketing: {
    enabled: false,
    provider: "manual",
    note: "Prodaja na blagajni",
  },
  translations: {
    en: {
      badge: "Premiere",
      ticketingNote: "Tickets available at the box office",
    },
  },
}, "sr");
assert.equal(serbianEvent.badge, "Premijera");
assert.equal(serbianEvent.ticketing.note, "Prodaja na blagajni");

const slide = promoSlideDto({
  _id: "slide-1",
  title: "Srpski slajd",
  linkUrl: "/predstave/srpski-naslov",
  relatedProduction: production,
  translations: { en: { title: "English slide", linkLabel: "Learn more" } },
}, "en");
assert.equal(slide.title, "English slide");
assert.equal(slide.relatedProduction.id, "production-1");
assert.equal(slide.relatedProduction.slug, "english-title");

const page = pageDto({
  _id: "page-1",
  pageType: "about",
  slug: "o-nama",
  title: "O nama",
  sections: [{
    _id: "section-1",
    sectionType: "imageText",
    heading: "Srpski naslov sekcije",
    image: { _id: "media-1", url: "/uploads/about.jpg", alt: "Zgrada" },
    enabled: true,
    displayOrder: 0,
  }],
  translations: {
    en: {
      slug: "about-us",
      title: "About us",
      sections: [{ sourceId: "section-1", heading: "English section heading" }],
    },
  },
}, "en");
assert.equal(page.title, "About us");
assert.equal(page.slug, "about-us");
assert.equal(page.sections[0].heading, "English section heading");
assert.equal(page.sections[0].image.url, "/uploads/about.jpg");

const media = mediaDto({
  _id: "media-1",
  url: "/uploads/photo.jpg",
  title: "Srpski naslov",
  alt: "Srpski alt",
  translations: { en: { title: "English title", alt: "English alt" } },
}, "en");
assert.equal(media.title, "English title");
assert.equal(media.altText, "English alt");

const merged = withMergedTranslations({
  translations: {
    sr: { title: "Srpski" },
    en: { title: "Old English", caption: "Keep me" },
  },
}, {
  translations: { en: { title: "New English" } },
});
assert.equal(merged.translations.sr.title, "Srpski");
assert.equal(merged.translations.en.title, "New English");
assert.equal(merged.translations.en.caption, "Keep me");

console.log(JSON.stringify({
  success: true,
  checks: [
    "locale normalization and fallback",
    "localized slug lookup",
    "production SR/EN DTO",
    "nested production translations",
    "localized event badge and ticketing note",
    "hero slide production association",
    "structured page text overlay with shared media",
    "localized media metadata",
    "non-destructive translation merge",
  ],
}, null, 2));
