require("dotenv").config();

const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const marker = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const created = { artistId: "", productionId: "", newsId: "", promoId: "" };

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, { method = "GET", token, body, expected } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  const allowed = Array.isArray(expected) ? expected : [expected ?? 200];
  if (!allowed.includes(response.status)) {
    throw new Error(`${method} ${path} returned ${response.status}: ${payload.message || JSON.stringify(payload)}`);
  }
  return { status: response.status, payload };
};

const idOf = (value) => String(value?._id || value?.id || value || "");

const run = async () => {
  const login = await request("/api/admin/auth/login", {
    method: "POST",
    body: {
      email: process.env.ADMIN_EMAIL || "marketing@madlenianum.rs",
      password: process.env.ADMIN_PASSWORD || "Admin123!",
    },
  });
  const token = login.payload.token;
  assert(token, "Admin login did not return a token.");

  await request("/api/admin/auth/me", { token });
  await request("/api/admin/productions/missing/preview", { expected: 401 });

  const options = await request("/api/admin/form-options/production", { token });
  const mediaId = idOf(options.payload.options?.media?.[0]);
  const existingProductionId = idOf(options.payload.options?.productions?.[0]);

  const artist = await request("/api/admin/artists", {
    method: "POST",
    token,
    expected: 201,
    body: {
      displayName: `CMS Smoke Artist ${marker}`,
      professions: ["Glumac"],
      biography: "<p>Privremeni profil.</p>",
      status: "draft",
      links: [{ label: "Website", type: "website", url: "https://example.com", displayOrder: 0 }],
    },
  });
  created.artistId = idOf(artist.payload.item);
  assert(created.artistId, "Artist create response did not contain an ID.");

  await request("/api/admin/productions", {
    method: "POST",
    token,
    expected: 400,
    body: {
      title: `Invalid Video ${marker}`,
      type: "drama",
      videos: [{ provider: "youtube", url: "https://example.com/not-youtube", isTrailer: true }],
    },
  });

  const slug = `cms-smoke-${marker}`;
  const production = await request("/api/admin/productions", {
    method: "POST",
    token,
    expected: 201,
    body: {
      title: `CMS Smoke Production ${marker}`,
      slug,
      type: "drama",
      status: "draft",
      poster: mediaId || null,
      description: '<p>Visible text</p><script>alert("unsafe")</script><p onclick="unsafe()">Safe paragraph</p>',
      videos: [{ provider: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Trailer", isTrailer: true, displayOrder: 0 }],
      creativeTeam: [{ roleKey: "director", label: "Reditelj", artist: created.artistId, displayOrder: 0 }],
      cast: [{ artist: created.artistId, role: "Test role", displayOrder: 0 }],
      reviews: [{ title: "Review", publication: "Example", url: "https://example.com/review", displayOrder: 0 }],
    },
  });
  created.productionId = idOf(production.payload.item);
  assert(created.productionId, "Production create response did not contain an ID.");

  await request("/api/admin/productions", {
    method: "POST",
    token,
    expected: 400,
    body: { title: `Duplicate Slug ${marker}`, slug, type: "drama", status: "draft" },
  });

  const publicDraft = await request(`/api/public/productions/${slug}`, { expected: 404 });
  assert(publicDraft.status === 404, "Draft production was public.");

  const preview = await request(`/api/admin/productions/${created.productionId}/preview`, { token });
  const previewText = preview.payload.item?.description || "";
  assert(!previewText.includes("<script"), "Rich-text sanitizer left a script element.");
  assert(!previewText.includes("onclick"), "Rich-text sanitizer left an event handler.");
  assert(preview.payload.item?.trailer?.url, "Preview did not expose the structured trailer.");

  await request(`/api/admin/artists/${created.artistId}`, { method: "DELETE", token, expected: 409 });
  if (mediaId) await request(`/api/admin/media/${mediaId}`, { method: "DELETE", token, expected: 409 });

  await request(`/api/admin/productions/${created.productionId}`, {
    method: "PATCH",
    token,
    expected: 400,
    body: { recommendedProductions: [created.productionId] },
  });
  if (existingProductionId) {
    await request(`/api/admin/productions/${created.productionId}`, {
      method: "PATCH",
      token,
      expected: 400,
      body: { recommendedProductions: [existingProductionId, existingProductionId] },
    });
  }

  await request(`/api/admin/productions/${created.productionId}`, {
    method: "PATCH",
    token,
    body: { status: "published" },
  });
  await request(`/api/public/productions/${slug}`);
  await request(`/api/admin/productions/${created.productionId}/archive`, { method: "PATCH", token });
  await request(`/api/public/productions/${slug}`, { expected: 404 });

  const futureSlug = `cms-future-news-${marker}`;
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const news = await request("/api/admin/news", {
    method: "POST",
    token,
    expected: 201,
    body: {
      title: `CMS Future News ${marker}`,
      slug: futureSlug,
      body: "<p>Scheduled article.</p>",
      status: "published",
      publishedAt: future,
    },
  });
  created.newsId = idOf(news.payload.item);
  await request(`/api/admin/news/${created.newsId}/preview`, { token });
  await request(`/api/public/news/${futureSlug}`, { expected: 404 });

  await request("/api/admin/promo-slides", {
    method: "POST",
    token,
    expected: 400,
    body: { title: `Invalid Promo ${marker}`, activeFrom: future, activeUntil: new Date().toISOString() },
  });
  const promoTitle = `CMS Smoke Promo ${marker}`;
  const promo = await request("/api/admin/promo-slides", {
    method: "POST",
    token,
    expected: 201,
    body: {
      title: promoTitle,
      subtitle: "Temporary slide",
      status: "draft",
      language: "sr",
      relatedProduction: created.productionId,
      linkLabel: "Detalji",
      linkUrl: `/${slug}`,
    },
  });
  created.promoId = idOf(promo.payload.item);
  await request(`/api/admin/promo-slides/${created.promoId}/preview`, { token });
  const homeWithDraftPromo = await request("/api/public/home");
  assert(!JSON.stringify(homeWithDraftPromo.payload).includes(promoTitle), "Draft Promo Slide was public.");

  const aboutAdmin = await request("/api/admin/pages/structured/about", { token });
  const aboutSaved = await request("/api/admin/pages/structured/about", { method: "PUT", token, body: { title: aboutAdmin.payload.item.title } });
  assert(idOf(aboutAdmin.payload.item) === idOf(aboutSaved.payload.item), "About partial save changed document identity.");
  await request("/api/admin/pages/structured/about/preview", { token });

  const contactAdmin = await request("/api/admin/pages/structured/contact", { token });
  const contactSaved = await request("/api/admin/pages/structured/contact", { method: "PUT", token, body: { title: contactAdmin.payload.item.title } });
  assert(idOf(contactAdmin.payload.item) === idOf(contactSaved.payload.item), "Contact partial save changed document identity.");
  await request("/api/admin/pages/structured/contact/preview", { token });

  const homepageBefore = await request("/api/admin/homepage-config", { token });
  const homepageAfter = await request("/api/admin/homepage-config", { method: "PATCH", token, body: {} });
  assert(idOf(homepageBefore.payload.item) === idOf(homepageAfter.payload.item), "Homepage singleton identity changed.");

  const settingsBefore = await request("/api/admin/site-settings", { token });
  const settingsAfter = await request("/api/admin/site-settings", { method: "PATCH", token, body: {} });
  assert(idOf(settingsBefore.payload.item) === idOf(settingsAfter.payload.item), "Site Settings singleton identity changed.");

  const about = await request("/api/public/pages/o-nama");
  const settings = await request("/api/public/site-settings");
  assert(!JSON.stringify(about.payload).includes("updatedBy"), "Public About response exposed audit fields.");
  assert(!JSON.stringify(about.payload).includes('"_id"'), "Public About response exposed Mongo IDs.");
  assert(!JSON.stringify(settings.payload).includes("updatedBy"), "Public Site Settings response exposed audit fields.");
  assert(!JSON.stringify(settings.payload).includes('"_id"'), "Public Site Settings response exposed Mongo IDs.");

  console.log(JSON.stringify({
    success: true,
    checks: [
      "admin auth and protected preview",
      "draft preview and public protection",
      "rich-text sanitization",
      "video validation and trailer DTO",
      "artist and media deletion conflicts",
      "self-recommendation validation",
      "slug uniqueness and duplicate recommendation validation",
      "publish and archive visibility",
      "future News scheduling",
      "Promo Slide validation, preview, and draft protection",
      "structured About and Contact save/preview",
      "singleton identity",
      "public DTO privacy",
    ],
  }, null, 2));
};

const cleanup = async () => {
  try {
    const login = await request("/api/admin/auth/login", {
      method: "POST",
      body: {
        email: process.env.ADMIN_EMAIL || "marketing@madlenianum.rs",
        password: process.env.ADMIN_PASSWORD || "Admin123!",
      },
    });
    const token = login.payload.token;
    if (created.promoId) await request(`/api/admin/promo-slides/${created.promoId}`, { method: "DELETE", token, expected: [200, 404] });
    if (created.newsId) await request(`/api/admin/news/${created.newsId}`, { method: "DELETE", token, expected: [200, 404] });
    if (created.productionId) await request(`/api/admin/productions/${created.productionId}`, { method: "DELETE", token, expected: [200, 404] });
    if (created.artistId) await request(`/api/admin/artists/${created.artistId}`, { method: "DELETE", token, expected: [200, 404] });
  } catch (error) {
    console.error(`Cleanup warning: ${error.message}`);
  }
};

run()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
