const { normalizeEventStatus, normalizeSaleStatus } = require("../constants/ticketing.constants");
const {
  localizedArray,
  localizedSeo,
  localizedValue,
  normalizeLocale,
  translationMeta,
} = require("./locale.service");

const idOf = (value) => {
  if (!value) return null;
  return String(value._id || value.id || value);
};

const plain = (value) => {
  if (!value) return null;
  return typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : value;
};

const publicTranslations = (value) => {
  const sanitize = (entry) => {
    if (entry == null) return entry;
    if (Array.isArray(entry)) return entry.map(sanitize);
    if (entry instanceof Date) return entry;
    if (typeof entry?.toHexString === "function") return entry.toHexString();
    if (typeof entry !== "object") return entry;

    const source = plain(entry) || {};
    return Object.fromEntries(
      Object.entries(source)
        .filter(([key]) => key !== "_id" && key !== "__v")
        .map(([key, nestedValue]) => [key, sanitize(nestedValue)]),
    );
  };

  return sanitize(value) || {};
};

const translatedBySourceId = (items, source) => {
  const key = idOf(source);
  return (items || []).find((entry) => String(entry.sourceId || "") === key) || {};
};

const translatedBySourceOrIndex = (items, source, index) => {
  const bySourceId = translatedBySourceId(items, source);
  return Object.keys(bySourceId).length ? bySourceId : items?.[index] || {};
};

const localizedPageSections = (sections = [], translations = []) =>
  sections.map((section, index) => {
    const translated = translatedBySourceOrIndex(translations, section, index);
    return {
      ...section,
      eyebrow: translated.eyebrow || section.eyebrow || "",
      heading: translated.heading || section.heading || "",
      subtitle: translated.subtitle || section.subtitle || "",
      body: translated.body || section.body || "",
      caption: translated.caption || section.caption || "",
      ctaLabel: translated.ctaLabel || section.ctaLabel || "",
      videoTitle: translated.videoTitle || section.videoTitle || "",
      quote: translated.quote || section.quote || "",
      authorName: translated.authorName || section.authorName || "",
      authorRole: translated.authorRole || section.authorRole || "",
      timelineItems: (section.timelineItems || []).map((entry, entryIndex) => {
        const translatedEntry = translatedBySourceOrIndex(
          translated.timelineItems,
          entry,
          entryIndex,
        );
        return {
          ...entry,
          period: translatedEntry.period || entry.period || "",
          title: translatedEntry.title || entry.title || "",
          description: translatedEntry.description || entry.description || "",
        };
      }),
      featureItems: (section.featureItems || []).map((entry, entryIndex) => {
        const translatedEntry = translatedBySourceOrIndex(
          translated.featureItems,
          entry,
          entryIndex,
        );
        return {
          ...entry,
          title: translatedEntry.title || entry.title || "",
          description: translatedEntry.description || entry.description || "",
        };
      }),
      galleryItems: (section.galleryItems || []).map((entry, entryIndex) => {
        const translatedEntry = translatedBySourceOrIndex(
          translated.galleryItems,
          entry,
          entryIndex,
        );
        return {
          ...entry,
          caption: translatedEntry.caption || entry.caption || "",
          credit: translatedEntry.credit || entry.credit || "",
          altText: translatedEntry.altText || entry.altText || "",
        };
      }),
    };
  });

const mediaDto = (value, locale = "sr") => {
  const item = plain(value);
  if (!item) return null;

  if (typeof item === "string" || !item.url) return { id: idOf(item) };

  return {
    id: idOf(item),
    url: item.url,
    fileType: item.fileType,
    mimeType: item.mimeType,
    title: normalizeLocale(locale) === "en" ? item.translations?.en?.title || item.title || "" : item.title || "",
    altText: normalizeLocale(locale) === "en" ? item.translations?.en?.alt || item.altText || item.alt || "" : item.altText || item.alt || "",
    caption: normalizeLocale(locale) === "en" ? item.translations?.en?.caption || item.caption || "" : item.caption || "",
    credit: normalizeLocale(locale) === "en" ? item.translations?.en?.credit || item.credit || "" : item.credit || "",
    translations: publicTranslations(item.translations),
    width: item.width,
    height: item.height,
  };
};

const galleryDto = (document, locale = "sr") => {
  const item = plain(document) || {};
  const structured = Array.isArray(item.galleryItems) ? item.galleryItems : [];

  if (structured.length) {
    return structured
      .map((entry, index) => ({
        id: idOf(entry),
        media: mediaDto(entry.media, locale),
        caption: normalizeLocale(locale) === "en" ? entry.translations?.en?.caption || entry.caption || "" : entry.caption || "",
        credit: normalizeLocale(locale) === "en" ? entry.translations?.en?.credit || entry.credit || "" : entry.credit || "",
        altText: normalizeLocale(locale) === "en" ? entry.translations?.en?.altText || entry.altText || "" : entry.altText || "",
        translations: publicTranslations(entry.translations),
        displayOrder: entry.displayOrder ?? index,
      }))
      .filter((entry) => entry.media)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  return (item.gallery || []).map((media, index) => ({
    id: `legacy-${idOf(media)}`,
    media: mediaDto(media, locale),
    caption: media?.caption || "",
    credit: media?.credit || "",
    altText: media?.altText || media?.alt || "",
    displayOrder: index,
  }));
};

const seoDto = (value, locale = "sr") => {
  const seo = plain(value) || {};
  const translation = normalizeLocale(locale) === "en" ? seo.translations?.en || {} : {};
  return {
    title: translation.title || seo.title || "",
    description: translation.description || seo.description || "",
    keywords: Array.isArray(translation.keywords) && translation.keywords.length ? translation.keywords : (Array.isArray(seo.keywords) ? seo.keywords : []),
    canonicalUrl: translation.canonicalUrl || (normalizeLocale(locale) === "sr" ? seo.canonicalUrl || "" : ""),
    noIndex: Boolean(seo.noIndex),
    translations: publicTranslations(seo.translations),
  };
};

const inferRoleKey = (value) => {
  const role = String(value || "").toLowerCase();
  if (role.includes("redit")) return "director";
  if (role.includes("pis") || role.includes("autor")) return "writer";
  if (role.includes("kompoz")) return "composer";
  if (role.includes("dirigent")) return "conductor";
  if (role.includes("koreograf")) return "choreographer";
  if (role.includes("dramatur")) return "dramaturg";
  if (role.includes("scenograf")) return "scenographer";
  if (role.includes("kostim")) return "costumeDesigner";
  if (role.includes("svetl") || role.includes("rasvet")) return "lightingDesigner";
  if (role.includes("muzik")) return "music";
  return "other";
};

const artistSummaryDto = (value, locale = "sr") => {
  const artist = plain(value);
  if (!artist) return null;
  if (typeof artist === "string" || !artist.displayName) return { id: idOf(artist) };

  return {
    id: idOf(artist),
    displayName: localizedValue(artist, "displayName", locale),
    slug: localizedValue(artist, "slug", locale),
    professions: localizedArray(artist, "professions", locale),
    image: mediaDto(artist.image, locale),
    ...translationMeta(artist, ["displayName", "slug"]),
    locale: normalizeLocale(locale),
  };
};

const productionSummaryDto = (value, locale = "sr") => {
  const production = plain(value);
  if (!production) return null;
  if (typeof production === "string" || !production.title) return { id: idOf(production) };
  const primaryCredits = creativeTeamDto(production, locale)
    .filter((credit) => ["writer", "director", "composer", "conductor", "choreographer"].includes(credit.roleKey));

  return {
    id: idOf(production),
    title: localizedValue(production, "title", locale),
    slug: localizedValue(production, "slug", locale),
    type: production.type,
    authorComposer: localizedValue(production, "authorComposer", locale),
    subtitle: localizedValue(production, "subtitle", locale),
    season: localizedValue(production, "season", locale),
    shortDescription: localizedValue(production, "shortDescription", locale),
    poster: mediaDto(production.poster, locale),
    venue: venueDto(production.venue, locale),
    primaryCredits,
    announcement: production.announcement
      ? {
          isAnnounced: Boolean(production.announcement.isAnnounced),
          month: production.announcement.month,
          year: production.announcement.year,
          text: normalizeLocale(locale) === "en" ? production.translations?.en?.announcementText || "" : production.announcement.text || "",
          image: mediaDto(production.announcement.image, locale),
          startsAt: production.announcement.startsAt,
          endsAt: production.announcement.endsAt,
        }
      : null,
    ...translationMeta(production, ["title", "slug"]),
    locale: normalizeLocale(locale),
  };
};

const venueDto = (value, locale = "sr") => {
  const venue = plain(value);
  if (!venue) return null;
  if (typeof venue === "string" || !venue.name) return { id: idOf(venue) };

  return {
    id: idOf(venue),
    name: localizedValue(venue, "name", locale),
    slug: localizedValue(venue, "slug", locale),
    venueType: venue.venueType,
    capacity: venue.capacity,
    ...translationMeta(venue, ["name", "slug"]),
    locale: normalizeLocale(locale),
  };
};

const eventDto = (value, locale = "sr") => {
  const event = plain(value);
  if (!event) return null;

  return {
    id: idOf(event),
    production: productionSummaryDto(event.production, locale),
    venue: venueDto(event.venue, locale),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    isPremiere: Boolean(event.isPremiere),
    badge: normalizeLocale(locale) === "en" ? event.translations?.en?.badge || "" : event.badge || "",
    status: normalizeEventStatus(event.status),
    saleStatus: normalizeSaleStatus(event.saleStatus),
    saleStartsAt: event.saleStartsAt,
    saleEndsAt: event.saleEndsAt,
    ticketing: event.ticketing
      ? {
          enabled: Boolean(event.ticketing.enabled),
          provider: event.ticketing.provider,
          note: normalizeLocale(locale) === "en"
            ? event.translations?.en?.ticketingNote || ""
            : event.ticketing.note || "",
        }
      : null,
    seatMap: idOf(event.seatMap),
    pricePlan: idOf(event.pricePlan),
    maxTicketsPerOrder: event.maxTicketsPerOrder,
    lockDurationMinutes: event.lockDurationMinutes,
    saleAvailability: eventSaleAvailability(event, locale),
    locale: normalizeLocale(locale),
  };
};

const eventSaleAvailability = (event, locale = "sr") => {
  const labels = normalizeLocale(locale) === "en"
    ? { cancelled: "Cancelled", postponed: "Postponed", finished: "Event finished", sold_out: "Sold out", closed: "Sales closed", free: "Free admission", upcoming: "Sales open soon", on_sale: "Buy tickets", unavailable: "Sales unavailable" }
    : { cancelled: "Otkazano", postponed: "Odlozeno", finished: "Dogadjaj je zavrsen", sold_out: "Rasprodato", closed: "Prodaja zavrsena", free: "Slobodan ulaz", upcoming: "Prodaja uskoro", on_sale: "Kupi karte", unavailable: "Prodaja nije dostupna" };
  const now = new Date();
  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const saleStartsAt = event.saleStartsAt ? new Date(event.saleStartsAt) : null;
  const saleEndsAt = event.saleEndsAt ? new Date(event.saleEndsAt) : null;

  const status = normalizeEventStatus(event.status);
  const saleStatus = normalizeSaleStatus(event.saleStatus);
  if (status === "cancelled") return { state: "cancelled", canPurchase: false, label: labels.cancelled };
  if (status === "postponed") return { state: "postponed", canPurchase: false, label: labels.postponed };
  if (["completed", "archived"].includes(status) || (startsAt && startsAt <= now)) return { state: "finished", canPurchase: false, label: labels.finished };
  if (saleStatus === "sold_out") return { state: "sold_out", canPurchase: false, label: labels.sold_out };
  if (saleStatus === "closed" || (saleEndsAt && saleEndsAt <= now)) return { state: "closed", canPurchase: false, label: labels.closed };
  if (saleStatus === "free") return { state: "free", canPurchase: false, label: labels.free };
  if (saleStatus === "not_started" || (saleStartsAt && saleStartsAt > now)) return { state: "upcoming", canPurchase: false, label: labels.upcoming };

  const internalTicketing = event.ticketing?.enabled
    && event.ticketing?.provider === "internal"
    && event.seatMap
    && event.pricePlan;
  if (saleStatus === "on_sale" && internalTicketing) return { state: "on_sale", canPurchase: true, label: labels.on_sale };

  return { state: "unavailable", canPurchase: false, label: labels.unavailable };
};

const promoSlideDto = (value, locale = "sr") => {
  const slide = plain(value);
  if (!slide) return null;

  return {
    id: idOf(slide),
    title: localizedValue(slide, "title", locale),
    subtitle: localizedValue(slide, "subtitle", locale) || localizedValue(slide, "description", locale),
    description: localizedValue(slide, "description", locale),
    image: mediaDto(slide.image, locale),
    linkLabel: localizedValue(slide, "linkLabel", locale),
    linkUrl: slide.linkUrl || "",
    relatedProduction: productionSummaryDto(slide.relatedProduction, locale),
    relatedEvent: eventDto(slide.relatedEvent, locale),
    language: normalizeLocale(locale),
    activeFrom: slide.activeFrom,
    activeUntil: slide.activeUntil,
  };
};

const creativeTeamDto = (value, locale = "sr") => {
  const production = plain(value) || {};
  return (production.creativeTeam || [])
    .map((credit, index) => {
      const translation = normalizeLocale(locale) === "en" ? credit.translations?.en || {} : {};
      const label = translation.label || credit.label || credit.role || "";
      return {
        id: idOf(credit),
        roleKey: credit.roleKey || inferRoleKey(label),
        label,
        role: label,
        artist: artistSummaryDto(credit.artist, locale),
        name: translation.name || credit.name || credit.artist?.displayName || "",
        note: translation.note || credit.note || "",
        displayOrder: credit.displayOrder ?? credit.order ?? index,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

const castDto = (value, locale = "sr") => {
  const production = plain(value) || {};
  const result = [];

  (production.cast || []).forEach((member, index) => {
    const order = member.displayOrder ?? member.order ?? index;
    const translation = normalizeLocale(locale) === "en" ? member.translations?.en || {} : {};
    const role = translation.role || member.role || member.character || "";

    if (member.artist || member.name) {
      result.push({
        id: idOf(member),
        artist: artistSummaryDto(member.artist, locale),
        name: translation.name || member.name || member.artist?.displayName || "",
        role,
        character: role,
        note: translation.note || member.note || "",
        displayOrder: order,
      });
      return;
    }

    const artists = member.artists || [];
    const names = member.names || [];
    const length = Math.max(artists.length, names.length, 1);
    for (let itemIndex = 0; itemIndex < length; itemIndex += 1) {
      result.push({
        id: `${idOf(member) || index}-${itemIndex}`,
        artist: artistSummaryDto(artists[itemIndex], locale),
        name: translation.name || names[itemIndex] || artists[itemIndex]?.displayName || "",
        role,
        character: role,
        note: translation.note || member.note || "",
        displayOrder: order + itemIndex / 100,
      });
    }
  });

  return result.sort((a, b) => a.displayOrder - b.displayOrder);
};

const productionDto = (value, locale = "sr") => {
  const item = plain(value);
  if (!item) return null;
  const credits = creativeTeamDto(item, locale);
  const videos = item.videos?.length
    ? item.videos
    : (item.videoUrls || []).map((video, index) => ({
        provider: "external",
        url: video.url,
        title: video.label,
        isTrailer: index === 0,
        displayOrder: index,
      }));
  const galleryItems = galleryDto(item, locale);
  const videoItems = videos.map((video, index) => ({
    id: idOf(video),
    provider: video.provider,
    url: video.url,
    title: normalizeLocale(locale) === "en" ? video.translations?.en?.title || video.title || "" : video.title || "",
    thumbnail: mediaDto(video.thumbnail, locale),
    isTrailer: Boolean(video.isTrailer),
    displayOrder: video.displayOrder ?? index,
  }));

  return {
    id: idOf(item),
    title: localizedValue(item, "title", locale),
    slug: localizedValue(item, "slug", locale),
    type: item.type,
    originalTitle: localizedValue(item, "originalTitle", locale),
    authorComposer: localizedValue(item, "authorComposer", locale),
    subtitle: localizedValue(item, "subtitle", locale),
    season: localizedValue(item, "season", locale),
    premiereDate: item.premiereDate,
    durationMinutes: item.durationMinutes,
    performanceLanguage: localizedValue(item, "performanceLanguage", locale),
    subtitles: localizedValue(item, "subtitles", locale),
    tags: localizedArray(item, "tags", locale),
    shortDescription: localizedValue(item, "shortDescription", locale),
    description: localizedValue(item, "description", locale),
    synopsis: localizedValue(item, "synopsis", locale),
    poster: mediaDto(item.poster, locale),
    venue: venueDto(item.venue, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    videos: videoItems,
    trailer: videoItems.find((video) => video.isTrailer) || videoItems[0] || null,
    creativeTeam: credits,
    primaryCredits: credits.filter((credit) => ["writer", "director", "composer", "conductor", "choreographer"].includes(credit.roleKey)),
    cast: castDto(item, locale),
    reviews: (item.reviews || []).map((review, index) => ({
      id: idOf(review),
      title: normalizeLocale(locale) === "en" ? review.translations?.en?.title || review.title || "" : review.title || "",
      publication: normalizeLocale(locale) === "en" ? review.translations?.en?.publication || review.publication || "" : review.publication || "",
      url: review.url,
      publishedAt: review.publishedAt,
      note: normalizeLocale(locale) === "en" ? review.translations?.en?.note || review.note || "" : review.note || "",
      displayOrder: review.displayOrder ?? index,
    })),
    recommendedProductions: (item.recommendedProductions || []).map((entry) => productionSummaryDto(entry, locale)).filter(Boolean),
    announcement: item.announcement
      ? {
          isAnnounced: Boolean(item.announcement.isAnnounced),
          month: item.announcement.month,
          year: item.announcement.year,
          text: normalizeLocale(locale) === "en" ? item.translations?.en?.announcementText || "" : item.announcement.text || "",
          image: mediaDto(item.announcement.image, locale),
          startsAt: item.announcement.startsAt,
          endsAt: item.announcement.endsAt,
        }
      : {},
    isFeatured: Boolean(item.isFeatured),
    isOnRepertoire: item.isOnRepertoire !== false,
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["title", "slug"]),
    locale: normalizeLocale(locale),
  };
};

const artistDto = (value, locale = "sr") => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item, locale);
  return {
    id: idOf(item),
    displayName: localizedValue(item, "displayName", locale),
    slug: localizedValue(item, "slug", locale),
    professions: localizedArray(item, "professions", locale),
    biography: localizedValue(item, "biography", locale),
    image: mediaDto(item.image, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    links: (item.links || []).map((link, index) => ({
      id: idOf(link),
      label: normalizeLocale(locale) === "en" ? link.translations?.en?.label || link.label || "" : link.label,
      url: link.url,
      type: link.type || "other",
      displayOrder: link.displayOrder ?? index,
    })),
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["displayName", "slug"]),
    locale: normalizeLocale(locale),
  };
};

const newsDto = (value, locale = "sr") => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item, locale);
  return {
    id: idOf(item),
    title: localizedValue(item, "title", locale),
    slug: localizedValue(item, "slug", locale),
    subtitle: localizedValue(item, "subtitle", locale),
    excerpt: localizedValue(item, "excerpt", locale),
    category: item.category,
    categoryLabel: localizedValue(item, "categoryLabel", locale),
    body: localizedValue(item, "body", locale),
    image: mediaDto(item.image, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    attachment: mediaDto(item.attachment, locale),
    attachmentLabel: localizedValue(item, "attachmentLabel", locale),
    externalLinks: (item.externalLinks || []).map((link) => ({
      label: normalizeLocale(locale) === "en" ? link.translations?.en?.label || link.label || "" : link.label,
      url: link.url,
      displayOrder: link.displayOrder,
    })),
    relatedProduction: productionSummaryDto(item.relatedProduction, locale),
    publishedAt: item.publishedAt,
    isFeatured: Boolean(item.isFeatured),
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["title", "slug", "excerpt"]),
    locale: normalizeLocale(locale),
  };
};

const pageDto = (value, locale = "sr") => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item, locale);
  const translatedSections = normalizeLocale(locale) === "en" ? item.translations?.en?.sections || [] : [];
  const sections = normalizeLocale(locale) === "en"
    ? localizedPageSections(item.sections || [], translatedSections)
    : item.sections || [];
  const translatedContact = normalizeLocale(locale) === "en" ? item.translations?.en?.contact : null;
  const contact = item.contact || null;
  return {
    id: idOf(item),
    title: localizedValue(item, "title", locale),
    slug: localizedValue(item, "slug", locale),
    pageType: item.pageType,
    body: localizedValue(item, "body", locale),
    image: mediaDto(item.image, locale),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    attachments: (item.attachments || []).map((entry) => mediaDto(entry, locale)),
    sections: sections
      .filter((section) => section.enabled !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((section) => ({
        id: idOf(section),
        sectionType: section.sectionType,
        eyebrow: section.eyebrow || "",
        heading: section.heading || "",
        subtitle: section.subtitle || "",
        body: section.body || "",
        image: mediaDto(section.image, locale),
        backgroundImage: mediaDto(section.backgroundImage, locale),
        imagePosition: section.imagePosition || "right",
        caption: section.caption || "",
        timelineItems: (section.timelineItems || []).map((entry, index) => ({
          id: idOf(entry),
          period: entry.period || "",
          title: entry.title || "",
          description: entry.description || "",
          image: mediaDto(entry.image, locale),
          displayOrder: entry.displayOrder ?? index,
        })),
        featureItems: (section.featureItems || []).map((entry, index) => ({
          id: idOf(entry),
          title: entry.title || "",
          description: entry.description || "",
          iconKey: entry.iconKey || "",
          image: mediaDto(entry.image, locale),
          displayOrder: entry.displayOrder ?? index,
        })),
        galleryItems: galleryDto({ galleryItems: section.galleryItems }, locale),
        videoUrl: section.videoUrl || "",
        videoTitle: section.videoTitle || "",
        quote: section.quote || "",
        authorName: section.authorName || "",
        authorRole: section.authorRole || "",
        ctaLabel: section.ctaLabel || "",
        ctaUrl: section.ctaUrl || "",
        displayOrder: section.displayOrder,
      })),
    contact: contact
      ? {
          introduction: translatedContact?.introduction || contact.introduction || "",
          mapUrl: contact.mapUrl || "",
          officeHours: translatedContact?.officeHours || contact.officeHours || "",
          ticketOfficeHours: translatedContact?.ticketOfficeHours || contact.ticketOfficeHours || "",
          additionalItems: (contact.additionalItems || []).map((entry, index) => {
            const translatedEntry = translatedBySourceOrIndex(
              translatedContact?.additionalItems,
              entry,
              index,
            );
            return {
            label: translatedEntry.label || entry.label || "",
            value: translatedEntry.value || entry.value || "",
            link: entry.link || "",
            displayOrder: entry.displayOrder ?? index,
          };
          }),
          contactFormEnabled: item.contact?.contactFormEnabled !== false,
        }
      : null,
    seo: { ...seoDto(item.seo, locale), ...localizedSeo(item, locale) },
    translations: publicTranslations(item.translations),
    ...translationMeta(item, ["title", "slug"]),
    locale: normalizeLocale(locale),
  };
};

const siteSettingsDto = (value, locale = "sr") => {
  const item = plain(value) || {};
  const translation = normalizeLocale(locale) === "en" ? item.translations?.en || {} : {};
  return {
    siteName: translation.siteName || item.siteName || "Madlenianum",
    shortDescription: translation.shortDescription || item.shortDescription || "",
    mainLogo: mediaDto(item.mainLogo, locale),
    footerLogo: mediaDto(item.footerLogo, locale),
    contact: {
      address: translation.contactAddress || item.contact?.address || "",
      generalEmail: item.contact?.generalEmail || "",
      ticketOfficeEmail: item.contact?.ticketOfficeEmail || "",
      phones: item.contact?.phones || [],
      ticketOfficePhones: item.contact?.ticketOfficePhones || [],
      // Singular aliases preserve the contract used by the existing public footer.
      email: item.contact?.generalEmail || "",
      phone: item.contact?.phones?.[0] || "",
      ticketOfficePhone: item.contact?.ticketOfficePhones?.[0] || "",
    },
    fundusContact: {
      contactName: item.fundusContact?.contactName || "",
      email: item.fundusContact?.email || item.contact?.generalEmail || "",
      phone: item.fundusContact?.phone || item.contact?.phones?.[0] || "",
      responseTimeText: translation.fundusResponseTimeText || item.fundusContact?.responseTimeText || "",
    },
    commercialContact: {
      contactName: item.commercialContact?.contactName || "",
      email: item.commercialContact?.email || item.contact?.generalEmail || "",
      phone: item.commercialContact?.phone || item.contact?.phones?.[0] || "",
      responseTimeText: translation.commercialResponseTimeText || item.commercialContact?.responseTimeText || "",
    },
    socialLinks: (item.socialLinks || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry, index) => ({
        platform: entry.platform || "",
        label: translatedBySourceId(translation.socialLinks, entry).label || entry.label || "",
        url: entry.url,
        displayOrder: entry.displayOrder ?? index,
      })),
    legalLinks: (item.legalLinks || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry, index) => ({
        label: translatedBySourceId(translation.legalLinks, entry).label || entry.label || "",
        url: entry.url,
        displayOrder: entry.displayOrder ?? index,
      })),
    footerNavigation: (item.footerNavigation || [])
      .filter((group) => group.enabled !== false)
      .map((group, groupIndex) => {
        const translatedGroup = translatedBySourceId(translation.footerNavigation, group);
        return {
        title: translatedGroup.title || group.title || "",
        displayOrder: group.displayOrder ?? groupIndex,
        links: (group.links || [])
          .filter((entry) => entry.enabled !== false)
          .map((entry, index) => ({
            label: translatedBySourceId(translatedGroup.links, entry).label || entry.label || "",
            url: entry.url,
            displayOrder: entry.displayOrder ?? index,
          })),
      };
      }),
    partnerLogos: (item.partnerLogos || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry, index) => ({
        label: translatedBySourceId(translation.partnerLogos, entry).label || entry.label || "",
        media: mediaDto(entry.media, locale),
        url: entry.url || "",
        displayOrder: entry.displayOrder ?? index,
      })),
    defaultSeo: {
      ...seoDto(item.defaultSeo, locale),
      title: translation.seoTitle || seoDto(item.defaultSeo, locale).title,
      description: translation.seoDescription || seoDto(item.defaultSeo, locale).description,
    },
    socialImage: mediaDto(item.socialImage, locale),
    languages: item.languages?.length ? item.languages : ["sr", "en"],
    defaultLanguage: item.defaultLanguage || "sr",
    maintenanceMessage: translation.maintenanceMessage || item.maintenanceMessage || "",
    translations: publicTranslations(item.translations),
    locale: normalizeLocale(locale),
  };
};

const homepageConfigDto = (value, locale = "sr") => {
  const item = plain(value) || {};
  const translation = normalizeLocale(locale) === "en" ? item.translations?.en || {} : {};
  return {
    hero: {
      enabled: item.hero?.enabled !== false,
      limit: item.hero?.limit || 5,
    },
    upcomingEvents: {
      enabled: item.upcomingEvents?.enabled !== false,
      heading: translation.upcomingEventsHeading || (normalizeLocale(locale) === "en" ? "Repertoire" : item.upcomingEvents?.heading || "Repertoar"),
      limit: item.upcomingEvents?.limit || 8,
    },
    repertoireProductions: {
      enabled: item.repertoireProductions?.enabled !== false,
      heading: translation.repertoireProductionsHeading || (normalizeLocale(locale) === "en" ? "On the repertoire" : item.repertoireProductions?.heading || "Sta je na repertoaru"),
      limit: item.repertoireProductions?.limit || 8,
    },
    featuredProductions: {
      enabled: item.featuredProductions?.enabled !== false,
      heading: translation.featuredProductionsHeading || (normalizeLocale(locale) === "en" ? "Productions" : item.featuredProductions?.heading || "Predstave"),
      limit: item.featuredProductions?.limit || 6,
    },
    featuredNews: {
      enabled: item.featuredNews?.enabled !== false,
      heading: translation.featuredNewsHeading || (normalizeLocale(locale) === "en" ? "Latest news" : item.featuredNews?.heading || "Aktuelno"),
      limit: item.featuredNews?.limit || 6,
    },
    institutionalTeaser: {
      enabled: item.institutionalTeaser?.enabled !== false,
      heading: translation.institutionalTeaser?.heading || item.institutionalTeaser?.heading || "",
      text: translation.institutionalTeaser?.text || item.institutionalTeaser?.text || "",
      image: mediaDto(item.institutionalTeaser?.image, locale),
      ctaLabel: translation.institutionalTeaser?.ctaLabel || item.institutionalTeaser?.ctaLabel || "",
      ctaUrl: item.institutionalTeaser?.ctaUrl || "",
    },
    ctaCardsHeading: translation.ctaCardsHeading || (normalizeLocale(locale) === "en" ? "Explore Madlenianum" : item.ctaCardsHeading || "Istrazite Madlenianum"),
    ctaCards: (item.ctaCards || [])
      .filter((card) => card.enabled !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((card, index) => {
        const bySourceId = translatedBySourceId(translation.ctaCards, card);
        const translatedCard = Object.keys(bySourceId).length
          ? bySourceId
          : translation.ctaCards?.[index] || {};
        return {
        id: idOf(card),
        title: translatedCard.title || card.title || "",
        text: translatedCard.text || card.text || "",
        image: mediaDto(card.image, locale),
        linkLabel: translatedCard.linkLabel || card.linkLabel || "",
        url: card.url || "",
        displayOrder: card.displayOrder,
      };
      }),
    sections: (item.sections || [])
      .filter((section) => section.enabled !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((section) => ({ sectionType: section.sectionType, displayOrder: section.displayOrder })),
    seo: {
      ...seoDto(item.seo, locale),
      title: translation.seoTitle || seoDto(item.seo, locale).title,
      description: translation.seoDescription || seoDto(item.seo, locale).description,
    },
    translations: publicTranslations(item.translations),
    locale: normalizeLocale(locale),
  };
};

module.exports = {
  artistDto,
  artistSummaryDto,
  castDto,
  creativeTeamDto,
  eventDto,
  galleryDto,
  homepageConfigDto,
  idOf,
  mediaDto,
  newsDto,
  pageDto,
  promoSlideDto,
  productionDto,
  productionSummaryDto,
  publicTranslations,
  seoDto,
  siteSettingsDto,
  venueDto,
};
