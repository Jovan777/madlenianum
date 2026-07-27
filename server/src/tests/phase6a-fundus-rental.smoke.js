require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const mongoose = require("mongoose");

const CostumeItem = require("../models/CostumeItem");
const PropScenographyItem = require("../models/PropScenographyItem");
const RentalSpace = require("../models/RentalSpace");
const RentalInquiry = require("../models/RentalInquiry");
const EventPlanningInquiry = require("../models/EventPlanningInquiry");
const SiteSettings = require("../models/SiteSettings");
const { runPhase6ASeed } = require("../seed/phase6a.seed");

const PORT = 5104;
const API = `http://localhost:${PORT}/api`;
const marker = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let serverProcess;
let originalRecipients;

const created = {
  costumes: [],
  props: [],
  rentalSpaces: [],
  rentalInquiries: [],
  eventPlanningInquiries: [],
};

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Phase 6A test server did not start.");
};

const request = async (path, { method = "GET", token, body, headers = {} } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const idOf = (value) => String(value?._id || value?.id || value || "");

const cleanup = async () => {
  await CostumeItem.deleteMany({ _id: { $in: created.costumes } });
  await PropScenographyItem.deleteMany({ _id: { $in: created.props } });
  await RentalInquiry.deleteMany({ _id: { $in: created.rentalInquiries } });
  await EventPlanningInquiry.deleteMany({ _id: { $in: created.eventPlanningInquiries } });
  await RentalSpace.deleteMany({ _id: { $in: created.rentalSpaces } });
  if (originalRecipients) {
    await SiteSettings.findOneAndUpdate(
      { key: "default" },
      { $set: { inquiryRecipients: originalRecipients } },
      { upsert: true }
    );
  }
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  assert.ok(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD, "Admin credentials are required.");

  await mongoose.connect(process.env.MONGO_URI);
  const settings = await SiteSettings.findOne({ key: "default" }).lean();
  originalRecipients = settings?.inquiryRecipients || {};
  await SiteSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        "inquiryRecipients.rentalEmails": ["phase6a-rental@example.com"],
        "inquiryRecipients.eventPlanningEmails": ["phase6a-events@example.com"],
      },
    },
    { upsert: true }
  );

  const seedFirst = await runPhase6ASeed();
  const costumeCountBefore = await CostumeItem.countDocuments({
    inventoryNumber: { $in: seedFirst.costumes.map((item) => item.inventoryNumber) },
  });
  await runPhase6ASeed();
  const costumeCountAfter = await CostumeItem.countDocuments({
    inventoryNumber: { $in: seedFirst.costumes.map((item) => item.inventoryNumber) },
  });
  assert.equal(costumeCountAfter, costumeCountBefore, "Phase 6A seed must be idempotent.");

  serverProcess = spawn(process.execPath, ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      EMAIL_TRANSPORT: "json",
      INQUIRY_RECIPIENTS: "",
      RENTAL_INQUIRY_RECIPIENTS: "",
      EVENT_PLANNING_INQUIRY_RECIPIENTS: "",
      INQUIRY_RESEND_COOLDOWN_SECONDS: "60",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();

  const login = await request("/admin/auth/login", {
    method: "POST",
    body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.payload));
  const token = login.payload.token;

  const publicCostumes = await request("/public/fundus/costumes?limit=2&page=1");
  assert.equal(publicCostumes.response.status, 200, JSON.stringify(publicCostumes.payload));
  assert.ok(publicCostumes.payload.items.length >= 1, "Published costumes must be public.");
  assert.equal(publicCostumes.payload.limit, 2);
  const firstCostume = publicCostumes.payload.items[0];
  assert.ok(!("internalNotes" in firstCostume), "Fundus public DTO must not expose internal fields.");
  const costumeDetail = await request(`/public/fundus/costumes/${firstCostume.slug}`);
  assert.equal(costumeDetail.response.status, 200);

  const publicProps = await request("/public/fundus/props-scenography?itemType=prop&limit=10");
  assert.equal(publicProps.response.status, 200, JSON.stringify(publicProps.payload));
  assert.ok(publicProps.payload.items.every((item) => item.itemType === "prop"));
  await request("/public/fundus/inquiries", { method: "POST", body: { email: "x@example.com" } })
    .then((result) => assert.equal(result.response.status, 404, "Fundus inquiry endpoint must not exist."));

  const mediaId = firstCostume.mainImage?.id;
  if (mediaId) {
    const mediaDelete = await request(`/admin/media/${mediaId}`, { method: "DELETE", token });
    assert.equal(mediaDelete.response.status, 409, "Media used by CostumeItem must be protected.");
    assert.ok(mediaDelete.payload.usage.some((entry) => entry.resourceType === "CostumeItem"));
  }

  const draftCostume = await request("/admin/fundus/costumes", {
    method: "POST",
    token,
    body: {
      title: `Phase 6A Draft Costume ${marker}`,
      slug: `phase-6a-draft-costume-${marker}`,
      inventoryNumber: `KOS-P6A-${marker}`,
      gender: "unisex",
      condition: "good",
      status: "draft",
    },
  });
  assert.equal(draftCostume.response.status, 201, JSON.stringify(draftCostume.payload));
  created.costumes.push(idOf(draftCostume.payload.item));
  const duplicateCostume = await request("/admin/fundus/costumes", {
    method: "POST",
    token,
    body: {
      title: `Phase 6A Duplicate ${marker}`,
      slug: `phase-6a-draft-costume-${marker}`,
      inventoryNumber: `KOS-P6A-${marker}`,
      gender: "unisex",
      condition: "good",
      status: "draft",
    },
  });
  assert.equal(duplicateCostume.response.status, 400);
  const publicDraft = await request(`/public/fundus/costumes/${draftCostume.payload.item.slug}`);
  assert.equal(publicDraft.response.status, 404, "Draft costume must not be public.");

  const propCreated = await request("/admin/fundus/props-scenography", {
    method: "POST",
    token,
    body: {
      title: `Phase 6A Prop ${marker}`,
      slug: `phase-6a-prop-${marker}`,
      itemType: "prop",
      inventoryNumber: `PRP-P6A-${marker}`,
      condition: "good",
      status: "published",
      description: "<p>Smoke test prop.</p>",
    },
  });
  assert.equal(propCreated.response.status, 201, JSON.stringify(propCreated.payload));
  created.props.push(idOf(propCreated.payload.item));
  const propPublic = await request(`/public/fundus/props-scenography/${propCreated.payload.item.slug}`);
  assert.equal(propPublic.response.status, 200);

  const rentalSpaces = await request("/public/rental-spaces?limit=5");
  assert.equal(rentalSpaces.response.status, 200, JSON.stringify(rentalSpaces.payload));
  assert.ok(rentalSpaces.payload.items.length >= 1, "Published rental spaces must be public.");
  const rentalSpace = rentalSpaces.payload.items[0];
  const rentalDetail = await request(`/public/rental-spaces/${rentalSpace.slug}`);
  assert.equal(rentalDetail.response.status, 200);

  const rentalInquiry = await request("/public/rental-inquiries", {
    method: "POST",
    body: {
      rentalSpace: rentalSpace.id,
      firstName: "Phase",
      lastName: "Rental",
      companyName: "Smoke",
      email: `phase6a-rental-${marker}@example.com`,
      phone: "+381601111111",
      desiredDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      approximateGuestCount: 75,
      note: "Smoke rental inquiry.",
      idempotencyKey: `phase6a-rental-${marker}`,
    },
  });
  assert.equal(rentalInquiry.response.status, 201, JSON.stringify(rentalInquiry.payload));
  assert.equal(rentalInquiry.payload.emailStatus, "sent");
  assert.ok(!("internalNotes" in rentalInquiry.payload.item), "Public rental inquiry must not expose internal notes.");
  created.rentalInquiries.push(idOf(rentalInquiry.payload.item));
  const rentalDuplicate = await request("/public/rental-inquiries", {
    method: "POST",
    body: {
      rentalSpace: rentalSpace.id,
      firstName: "Phase",
      lastName: "Rental",
      email: `phase6a-rental-${marker}@example.com`,
      phone: "+381601111111",
      idempotencyKey: `phase6a-rental-${marker}`,
    },
  });
  assert.equal(rentalDuplicate.response.status, 200);
  assert.equal(rentalDuplicate.payload.idempotent, true);

  const planningInquiry = await request("/public/event-planning-inquiries", {
    method: "POST",
    body: {
      firstName: "Phase",
      lastName: "Planner",
      companyName: "Smoke Planning",
      email: `phase6a-planning-${marker}@example.com`,
      phone: "+381602222222",
      desiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      approximateGuestCount: 180,
      eventType: "konferencija",
      note: "General event planning without selected space.",
      idempotencyKey: `phase6a-planning-${marker}`,
    },
  });
  assert.equal(planningInquiry.response.status, 201, JSON.stringify(planningInquiry.payload));
  assert.equal(planningInquiry.payload.emailStatus, "sent");
  assert.equal(planningInquiry.payload.item.preferredRentalSpaceSnapshot, null);
  created.eventPlanningInquiries.push(idOf(planningInquiry.payload.item));

  const adminRentalList = await request(`/admin/rental-inquiries?q=${encodeURIComponent(rentalInquiry.payload.item.referenceNumber)}`, { token });
  assert.equal(adminRentalList.response.status, 200);
  assert.ok(adminRentalList.payload.items.some((item) => item.referenceNumber === rentalInquiry.payload.item.referenceNumber));
  const adminRentalDetail = await request(`/admin/rental-inquiries/${rentalInquiry.payload.item.id}`, { token });
  assert.equal(adminRentalDetail.response.status, 200);
  assert.ok("internalNotes" in adminRentalDetail.payload.item);
  const statusUpdate = await request(`/admin/rental-inquiries/${rentalInquiry.payload.item.id}/status`, {
    method: "PATCH",
    token,
    body: { status: "contacted", reason: "Smoke test contact." },
  });
  assert.equal(statusUpdate.response.status, 200, JSON.stringify(statusUpdate.payload));
  assert.equal(statusUpdate.payload.item.status, "contacted");
  assert.ok(statusUpdate.payload.item.statusHistory.some((entry) => entry.toStatus === "contacted"));
  const notesUpdate = await request(`/admin/rental-inquiries/${rentalInquiry.payload.item.id}/notes`, {
    method: "PATCH",
    token,
    body: { internalNotes: "Internal smoke note." },
  });
  assert.equal(notesUpdate.response.status, 200);
  assert.equal(notesUpdate.payload.item.internalNotes, "Internal smoke note.");
  const resend = await request(`/admin/rental-inquiries/${rentalInquiry.payload.item.id}/resend`, {
    method: "POST",
    token,
  });
  assert.equal(resend.response.status, 200, JSON.stringify(resend.payload));
  const rapidResend = await request(`/admin/rental-inquiries/${rentalInquiry.payload.item.id}/resend`, {
    method: "POST",
    token,
  });
  assert.equal(rapidResend.response.status, 429);

  const adminPlanningList = await request(`/admin/event-planning-inquiries?q=${encodeURIComponent(planningInquiry.payload.item.referenceNumber)}`, { token });
  assert.equal(adminPlanningList.response.status, 200);
  assert.ok(adminPlanningList.payload.items.length >= 1);
  const planningStatusUpdate = await request(`/admin/event-planning-inquiries/${planningInquiry.payload.item.id}/status`, {
    method: "PATCH",
    token,
    body: { status: "in_review", reason: "Smoke test review." },
  });
  assert.equal(planningStatusUpdate.response.status, 200);
  assert.equal(planningStatusUpdate.payload.item.status, "in_review");

  await SiteSettings.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        "inquiryRecipients.rentalEmails": [],
        "inquiryRecipients.eventPlanningEmails": [],
      },
    }
  );
  const noRecipientInquiry = await request("/public/rental-inquiries", {
    method: "POST",
    body: {
      rentalSpace: rentalSpace.id,
      firstName: "Phase",
      lastName: "NoRecipient",
      email: `phase6a-no-recipient-${marker}@example.com`,
      phone: "+381603333333",
      idempotencyKey: `phase6a-no-recipient-${marker}`,
    },
  });
  assert.equal(noRecipientInquiry.response.status, 201, JSON.stringify(noRecipientInquiry.payload));
  assert.equal(noRecipientInquiry.payload.emailStatus, "not_configured");
  created.rentalInquiries.push(idOf(noRecipientInquiry.payload.item));

  console.log("Phase 6A fundus, rental and inquiry smoke tests passed.");
};

run()
  .then(async () => {
    if (mongoose.connection.readyState) await cleanup();
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (serverProcess) serverProcess.kill();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    if (mongoose.connection.readyState) await cleanup();
    if (mongoose.connection.readyState) await mongoose.disconnect();
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  });
