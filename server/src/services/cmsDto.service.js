const idOf = (value) => {
  if (!value) return null;
  return String(value._id || value.id || value);
};

const plain = (value) => {
  if (!value) return null;
  return typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : value;
};

const mediaDto = (value) => {
  const item = plain(value);
  if (!item) return null;

  if (typeof item === "string" || !item.url) return { id: idOf(item) };

  return {
    id: idOf(item),
    url: item.url,
    fileType: item.fileType,
    mimeType: item.mimeType,
    title: item.title || "",
    altText: item.altText || item.alt || "",
    caption: item.caption || "",
    credit: item.credit || "",
    width: item.width,
    height: item.height,
  };
};

const galleryDto = (document) => {
  const item = plain(document) || {};
  const structured = Array.isArray(item.galleryItems) ? item.galleryItems : [];

  if (structured.length) {
    return structured
      .map((entry, index) => ({
        id: idOf(entry),
        media: mediaDto(entry.media),
        caption: entry.caption || "",
        credit: entry.credit || "",
        altText: entry.altText || "",
        displayOrder: entry.displayOrder ?? index,
      }))
      .filter((entry) => entry.media)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  return (item.gallery || []).map((media, index) => ({
    id: `legacy-${idOf(media)}`,
    media: mediaDto(media),
    caption: media?.caption || "",
    credit: media?.credit || "",
    altText: media?.altText || media?.alt || "",
    displayOrder: index,
  }));
};

const seoDto = (value) => {
  const seo = plain(value) || {};
  return {
    title: seo.title || "",
    description: seo.description || "",
    keywords: Array.isArray(seo.keywords) ? seo.keywords : [],
    canonicalUrl: seo.canonicalUrl || "",
    noIndex: Boolean(seo.noIndex),
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

const artistSummaryDto = (value) => {
  const artist = plain(value);
  if (!artist) return null;
  if (typeof artist === "string" || !artist.displayName) return { id: idOf(artist) };

  return {
    id: idOf(artist),
    displayName: artist.displayName,
    slug: artist.slug,
    professions: artist.professions || [],
    image: mediaDto(artist.image),
  };
};

const productionSummaryDto = (value) => {
  const production = plain(value);
  if (!production) return null;
  if (typeof production === "string" || !production.title) return { id: idOf(production) };
  const primaryCredits = creativeTeamDto(production)
    .filter((credit) => ["writer", "director", "composer", "conductor", "choreographer"].includes(credit.roleKey));

  return {
    id: idOf(production),
    title: production.title,
    slug: production.slug,
    type: production.type,
    authorComposer: production.authorComposer || "",
    subtitle: production.subtitle || "",
    season: production.season || "",
    shortDescription: production.shortDescription || "",
    poster: mediaDto(production.poster),
    venue: venueDto(production.venue),
    primaryCredits,
    announcement: production.announcement
      ? {
          isAnnounced: Boolean(production.announcement.isAnnounced),
          month: production.announcement.month,
          year: production.announcement.year,
          text: production.announcement.text || "",
          image: mediaDto(production.announcement.image),
          startsAt: production.announcement.startsAt,
          endsAt: production.announcement.endsAt,
        }
      : null,
  };
};

const venueDto = (value) => {
  const venue = plain(value);
  if (!venue) return null;
  if (typeof venue === "string" || !venue.name) return { id: idOf(venue) };

  return {
    id: idOf(venue),
    name: venue.name,
    slug: venue.slug,
    venueType: venue.venueType,
    capacity: venue.capacity,
  };
};

const eventDto = (value) => {
  const event = plain(value);
  if (!event) return null;

  return {
    id: idOf(event),
    production: productionSummaryDto(event.production),
    venue: venueDto(event.venue),
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    isPremiere: Boolean(event.isPremiere),
    badge: event.badge || "",
    status: event.status,
    saleStatus: event.saleStatus,
    saleStartsAt: event.saleStartsAt,
    saleEndsAt: event.saleEndsAt,
    ticketing: event.ticketing
      ? { enabled: Boolean(event.ticketing.enabled), provider: event.ticketing.provider }
      : null,
    seatMap: idOf(event.seatMap),
    pricePlan: idOf(event.pricePlan),
    maxTicketsPerOrder: event.maxTicketsPerOrder,
    lockDurationMinutes: event.lockDurationMinutes,
    saleAvailability: eventSaleAvailability(event),
  };
};

const eventSaleAvailability = (event) => {
  const now = new Date();
  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const saleStartsAt = event.saleStartsAt ? new Date(event.saleStartsAt) : null;
  const saleEndsAt = event.saleEndsAt ? new Date(event.saleEndsAt) : null;

  if (event.status === "cancelled") return { state: "cancelled", canPurchase: false, label: "Otkazano" };
  if (event.status === "postponed") return { state: "postponed", canPurchase: false, label: "Odlozeno" };
  if (event.status === "finished" || (startsAt && startsAt <= now)) return { state: "finished", canPurchase: false, label: "Dogadjaj je zavrsen" };
  if (event.saleStatus === "sold_out") return { state: "sold_out", canPurchase: false, label: "Rasprodato" };
  if (event.saleStatus === "sales_closed" || (saleEndsAt && saleEndsAt <= now)) return { state: "closed", canPurchase: false, label: "Prodaja zavrsena" };
  if (event.saleStatus === "free") return { state: "free", canPurchase: false, label: "Slobodan ulaz" };
  if (event.saleStatus === "not_on_sale" || (saleStartsAt && saleStartsAt > now)) return { state: "upcoming", canPurchase: false, label: "Prodaja uskoro" };

  const internalTicketing = event.ticketing?.enabled
    && event.ticketing?.provider === "internal"
    && event.seatMap
    && event.pricePlan;
  if (event.saleStatus === "on_sale" && internalTicketing) return { state: "on_sale", canPurchase: true, label: "Kupi karte" };

  return { state: "unavailable", canPurchase: false, label: "Prodaja nije dostupna" };
};

const promoSlideDto = (value) => {
  const slide = plain(value);
  if (!slide) return null;

  return {
    id: idOf(slide),
    title: slide.title,
    subtitle: slide.subtitle || slide.description || "",
    description: slide.description || "",
    image: mediaDto(slide.image),
    linkLabel: slide.linkLabel || "",
    linkUrl: slide.linkUrl || "",
    relatedProduction: productionSummaryDto(slide.relatedProduction),
    relatedEvent: eventDto(slide.relatedEvent),
    language: slide.language || "sr",
    activeFrom: slide.activeFrom,
    activeUntil: slide.activeUntil,
  };
};

const creativeTeamDto = (value) => {
  const production = plain(value) || {};
  return (production.creativeTeam || [])
    .map((credit, index) => {
      const label = credit.label || credit.role || "";
      return {
        id: idOf(credit),
        roleKey: credit.roleKey || inferRoleKey(label),
        label,
        role: label,
        artist: artistSummaryDto(credit.artist),
        name: credit.name || credit.artist?.displayName || "",
        note: credit.note || "",
        displayOrder: credit.displayOrder ?? credit.order ?? index,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

const castDto = (value) => {
  const production = plain(value) || {};
  const result = [];

  (production.cast || []).forEach((member, index) => {
    const order = member.displayOrder ?? member.order ?? index;
    const role = member.role || member.character || "";

    if (member.artist || member.name) {
      result.push({
        id: idOf(member),
        artist: artistSummaryDto(member.artist),
        name: member.name || member.artist?.displayName || "",
        role,
        character: role,
        note: member.note || "",
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
        artist: artistSummaryDto(artists[itemIndex]),
        name: names[itemIndex] || artists[itemIndex]?.displayName || "",
        role,
        character: role,
        note: member.note || "",
        displayOrder: order + itemIndex / 100,
      });
    }
  });

  return result.sort((a, b) => a.displayOrder - b.displayOrder);
};

const productionDto = (value) => {
  const item = plain(value);
  if (!item) return null;
  const credits = creativeTeamDto(item);
  const videos = item.videos?.length
    ? item.videos
    : (item.videoUrls || []).map((video, index) => ({
        provider: "external",
        url: video.url,
        title: video.label,
        isTrailer: index === 0,
        displayOrder: index,
      }));
  const galleryItems = galleryDto(item);
  const videoItems = videos.map((video, index) => ({
    id: idOf(video),
    provider: video.provider,
    url: video.url,
    title: video.title || "",
    thumbnail: mediaDto(video.thumbnail),
    isTrailer: Boolean(video.isTrailer),
    displayOrder: video.displayOrder ?? index,
  }));

  return {
    id: idOf(item),
    title: item.title,
    slug: item.slug,
    type: item.type,
    originalTitle: item.originalTitle || "",
    authorComposer: item.authorComposer || "",
    subtitle: item.subtitle || "",
    season: item.season || "",
    premiereDate: item.premiereDate,
    durationMinutes: item.durationMinutes,
    performanceLanguage: item.performanceLanguage || "",
    subtitles: item.subtitles || "",
    tags: item.tags || [],
    shortDescription: item.shortDescription || "",
    description: item.description || "",
    synopsis: item.synopsis || "",
    poster: mediaDto(item.poster),
    venue: venueDto(item.venue),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    videos: videoItems,
    trailer: videoItems.find((video) => video.isTrailer) || videoItems[0] || null,
    creativeTeam: credits,
    primaryCredits: credits.filter((credit) => ["writer", "director", "composer", "conductor", "choreographer"].includes(credit.roleKey)),
    cast: castDto(item),
    reviews: (item.reviews || []).map((review, index) => ({
      id: idOf(review),
      title: review.title || "",
      publication: review.publication || "",
      url: review.url,
      publishedAt: review.publishedAt,
      note: review.note || "",
      displayOrder: review.displayOrder ?? index,
    })),
    recommendedProductions: (item.recommendedProductions || []).map(productionSummaryDto).filter(Boolean),
    announcement: item.announcement
      ? {
          isAnnounced: Boolean(item.announcement.isAnnounced),
          month: item.announcement.month,
          year: item.announcement.year,
          text: item.announcement.text || "",
          image: mediaDto(item.announcement.image),
          startsAt: item.announcement.startsAt,
          endsAt: item.announcement.endsAt,
        }
      : {},
    isFeatured: Boolean(item.isFeatured),
    isOnRepertoire: item.isOnRepertoire !== false,
    seo: seoDto(item.seo),
  };
};

const artistDto = (value) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item);
  return {
    id: idOf(item),
    displayName: item.displayName,
    slug: item.slug,
    professions: item.professions || [],
    biography: item.biography || "",
    image: mediaDto(item.image),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    links: (item.links || []).map((link, index) => ({
      id: idOf(link),
      label: link.label,
      url: link.url,
      type: link.type || "other",
      displayOrder: link.displayOrder ?? index,
    })),
    seo: seoDto(item.seo),
  };
};

const newsDto = (value) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item);
  return {
    id: idOf(item),
    title: item.title,
    slug: item.slug,
    subtitle: item.subtitle || "",
    excerpt: item.excerpt || "",
    category: item.category,
    body: item.body || "",
    image: mediaDto(item.image),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    attachment: mediaDto(item.attachment),
    externalLinks: (item.externalLinks || []).map((link) => ({
      label: link.label,
      url: link.url,
      displayOrder: link.displayOrder,
    })),
    relatedProduction: productionSummaryDto(item.relatedProduction),
    publishedAt: item.publishedAt,
    isFeatured: Boolean(item.isFeatured),
    seo: seoDto(item.seo),
  };
};

const pageDto = (value) => {
  const item = plain(value);
  if (!item) return null;
  const galleryItems = galleryDto(item);
  return {
    id: idOf(item),
    title: item.title,
    slug: item.slug,
    pageType: item.pageType,
    body: item.body || "",
    image: mediaDto(item.image),
    gallery: galleryItems.map((entry) => entry.media),
    galleryItems,
    attachments: (item.attachments || []).map(mediaDto),
    sections: (item.sections || [])
      .filter((section) => section.enabled !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((section) => ({
        id: idOf(section),
        sectionType: section.sectionType,
        eyebrow: section.eyebrow || "",
        heading: section.heading || "",
        subtitle: section.subtitle || "",
        body: section.body || "",
        image: mediaDto(section.image),
        backgroundImage: mediaDto(section.backgroundImage),
        imagePosition: section.imagePosition || "right",
        caption: section.caption || "",
        timelineItems: (section.timelineItems || []).map((entry, index) => ({
          id: idOf(entry),
          period: entry.period || "",
          title: entry.title || "",
          description: entry.description || "",
          image: mediaDto(entry.image),
          displayOrder: entry.displayOrder ?? index,
        })),
        featureItems: (section.featureItems || []).map((entry, index) => ({
          id: idOf(entry),
          title: entry.title || "",
          description: entry.description || "",
          iconKey: entry.iconKey || "",
          image: mediaDto(entry.image),
          displayOrder: entry.displayOrder ?? index,
        })),
        galleryItems: galleryDto({ galleryItems: section.galleryItems }),
        videoUrl: section.videoUrl || "",
        videoTitle: section.videoTitle || "",
        quote: section.quote || "",
        authorName: section.authorName || "",
        authorRole: section.authorRole || "",
        ctaLabel: section.ctaLabel || "",
        ctaUrl: section.ctaUrl || "",
        displayOrder: section.displayOrder,
      })),
    contact: item.contact
      ? {
          introduction: item.contact.introduction || "",
          mapUrl: item.contact.mapUrl || "",
          officeHours: item.contact.officeHours || "",
          ticketOfficeHours: item.contact.ticketOfficeHours || "",
          additionalItems: (item.contact.additionalItems || []).map((entry, index) => ({
            label: entry.label || "",
            value: entry.value || "",
            link: entry.link || "",
            displayOrder: entry.displayOrder ?? index,
          })),
          contactFormEnabled: item.contact.contactFormEnabled !== false,
        }
      : null,
    seo: seoDto(item.seo),
  };
};

const siteSettingsDto = (value) => {
  const item = plain(value) || {};
  return {
    siteName: item.siteName || "Madlenianum",
    shortDescription: item.shortDescription || "",
    mainLogo: mediaDto(item.mainLogo),
    footerLogo: mediaDto(item.footerLogo),
    contact: {
      address: item.contact?.address || "",
      generalEmail: item.contact?.generalEmail || "",
      ticketOfficeEmail: item.contact?.ticketOfficeEmail || "",
      phones: item.contact?.phones || [],
      ticketOfficePhones: item.contact?.ticketOfficePhones || [],
      // Singular aliases preserve the contract used by the existing public footer.
      email: item.contact?.generalEmail || "",
      phone: item.contact?.phones?.[0] || "",
      ticketOfficePhone: item.contact?.ticketOfficePhones?.[0] || "",
    },
    socialLinks: (item.socialLinks || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry, index) => ({
        platform: entry.platform || "",
        label: entry.label || "",
        url: entry.url,
        displayOrder: entry.displayOrder ?? index,
      })),
    legalLinks: (item.legalLinks || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry, index) => ({
        label: entry.label || "",
        url: entry.url,
        displayOrder: entry.displayOrder ?? index,
      })),
    footerNavigation: (item.footerNavigation || [])
      .filter((group) => group.enabled !== false)
      .map((group, groupIndex) => ({
        title: group.title || "",
        displayOrder: group.displayOrder ?? groupIndex,
        links: (group.links || [])
          .filter((entry) => entry.enabled !== false)
          .map((entry, index) => ({
            label: entry.label || "",
            url: entry.url,
            displayOrder: entry.displayOrder ?? index,
          })),
      })),
    partnerLogos: (item.partnerLogos || [])
      .filter((entry) => entry.enabled !== false)
      .map((entry, index) => ({
        label: entry.label || "",
        media: mediaDto(entry.media),
        url: entry.url || "",
        displayOrder: entry.displayOrder ?? index,
      })),
    defaultSeo: seoDto(item.defaultSeo),
    socialImage: mediaDto(item.socialImage),
    languages: item.languages || ["sr"],
    defaultLanguage: item.defaultLanguage || "sr",
    maintenanceMessage: item.maintenanceMessage || "",
  };
};

const homepageConfigDto = (value) => {
  const item = plain(value) || {};
  return {
    hero: {
      enabled: item.hero?.enabled !== false,
      limit: item.hero?.limit || 5,
    },
    upcomingEvents: {
      enabled: item.upcomingEvents?.enabled !== false,
      heading: item.upcomingEvents?.heading || "Repertoar",
      limit: item.upcomingEvents?.limit || 8,
    },
    repertoireProductions: {
      enabled: item.repertoireProductions?.enabled !== false,
      heading: item.repertoireProductions?.heading || "Sta je na repertoaru",
      limit: item.repertoireProductions?.limit || 8,
    },
    featuredProductions: {
      enabled: item.featuredProductions?.enabled !== false,
      heading: item.featuredProductions?.heading || "Predstave",
      limit: item.featuredProductions?.limit || 6,
    },
    featuredNews: {
      enabled: item.featuredNews?.enabled !== false,
      heading: item.featuredNews?.heading || "Aktuelno",
      limit: item.featuredNews?.limit || 6,
    },
    institutionalTeaser: {
      enabled: item.institutionalTeaser?.enabled !== false,
      heading: item.institutionalTeaser?.heading || "",
      text: item.institutionalTeaser?.text || "",
      image: mediaDto(item.institutionalTeaser?.image),
      ctaLabel: item.institutionalTeaser?.ctaLabel || "",
      ctaUrl: item.institutionalTeaser?.ctaUrl || "",
    },
    ctaCardsHeading: item.ctaCardsHeading || "Istrazite Madlenianum",
    ctaCards: (item.ctaCards || [])
      .filter((card) => card.enabled !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((card) => ({
        id: idOf(card),
        title: card.title,
        text: card.text || "",
        image: mediaDto(card.image),
        linkLabel: card.linkLabel || "",
        url: card.url || "",
        displayOrder: card.displayOrder,
      })),
    sections: (item.sections || [])
      .filter((section) => section.enabled !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((section) => ({ sectionType: section.sectionType, displayOrder: section.displayOrder })),
    seo: seoDto(item.seo),
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
  seoDto,
  siteSettingsDto,
  venueDto,
};
