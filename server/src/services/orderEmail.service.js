const nodemailer = require("nodemailer");
const SiteSettings = require("../models/SiteSettings");
const { ORDER_STATUS_LABELS } = require("../constants/order.constants");
const { localizedValue, normalizeLocale } = require("./locale.service");

let cachedTransport = null;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const createTransport = () => {
  if (cachedTransport) return cachedTransport;
  if (process.env.EMAIL_TRANSPORT === "json" || process.env.NODE_ENV === "test") {
    cachedTransport = nodemailer.createTransport({ jsonTransport: true });
    return cachedTransport;
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const error = new Error("SMTP email transport is not configured.");
    error.code = "EMAIL_NOT_CONFIGURED";
    throw error;
  }
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return cachedTransport;
};

const getMessageType = (order) => {
  if (order.status === "reserved") return "reservation";
  if (["pending_payment", "paid", "cancelled", "expired"].includes(order.status)) {
    return order.status;
  }
  return order.orderType === "purchase" ? "pending_payment" : "reservation";
};

const getSubject = (order) => {
  const reference = order.orderCode;
  if (normalizeLocale(order.locale) === "en") {
    if (order.status === "reserved") return `Madlenianum reservation ${reference}`;
    if (order.status === "pending_payment") return `Madlenianum purchase pending ${reference}`;
    if (order.status === "paid") return `Madlenianum payment confirmation ${reference}`;
    if (order.status === "cancelled") return `Madlenianum cancellation ${reference}`;
    if (order.status === "expired") return `Madlenianum reservation expired ${reference}`;
    return `Madlenianum order ${reference}`;
  }
  if (order.status === "reserved") return `Madlenianum rezervacija ${reference}`;
  if (order.status === "pending_payment") return `Madlenianum kupovina u toku ${reference}`;
  if (order.status === "paid") return `Madlenianum potvrda placanja ${reference}`;
  if (order.status === "cancelled") return `Madlenianum otkazivanje ${reference}`;
  if (order.status === "expired") return `Madlenianum istek rezervacije ${reference}`;
  return `Madlenianum porudzbina ${reference}`;
};

const getLeadText = (order) => {
  if (normalizeLocale(order.locale) === "en") {
    if (order.status === "reserved") return "Your seats are reserved until the stated deadline.";
    if (order.status === "pending_payment") return "Your purchase has started. This message is not a payment confirmation.";
    if (order.status === "paid") return "Your payment has been recorded and the tickets are confirmed.";
    if (order.status === "cancelled") return "The order or reservation has been cancelled.";
    if (order.status === "expired") return "The deadline has expired and the seats have been released.";
    return "We have received your request.";
  }
  if (order.status === "reserved") return "Vasa sedista su rezervisana do navedenog roka.";
  if (order.status === "pending_payment") {
    return "Kupovina je pokrenuta. Ova poruka nije potvrda uspesnog placanja.";
  }
  if (order.status === "paid") return "Placanje je evidentirano i ulaznice su potvrdene.";
  if (order.status === "cancelled") return "Porudzbina ili rezervacija je otkazana.";
  if (order.status === "expired") return "Rok je istekao i sedista su oslobodjena.";
  return "Primili smo vas zahtev.";
};

const formatDate = (value, locale = "sr") => value
  ? new Intl.DateTimeFormat(normalizeLocale(locale) === "en" ? "en-GB" : "sr-Latn-RS", {
      timeZone: "Europe/Belgrade",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(value))
  : "-";

const formatMoney = (amount, currency, locale = "sr") => new Intl.NumberFormat(normalizeLocale(locale) === "en" ? "en-GB" : "sr-Latn-RS", {
  style: "currency",
  currency: currency || "RSD",
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

const buildOrderEmail = async (order, accessToken) => {
  const settings = await SiteSettings.findOne({ key: "default" }).lean();
  const locale = normalizeLocale(order.locale);
  const en = locale === "en";
  const event = order.event || {};
  const snapshot = order.eventSnapshot || {};
  const productionTitle = localizedValue(event.production, "title", locale) || snapshot.productionTitle || event.production?.title || "";
  const venueName = localizedValue(event.venue, "name", locale) || snapshot.venueName || event.venue?.name || "";
  const startsAt = event.startsAt || snapshot.eventStartsAt;
  const expiresAt = order.reservationExpiresAt || order.paymentExpiresAt || order.expiresAt;
  const baseUrl = String(process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "http://localhost:4200")
    .replace(/\/+$/, "");
  const orderUrl = `${baseUrl}${en ? "/en/order" : "/porudzbina"}/${encodeURIComponent(order.orderCode)}?token=${encodeURIComponent(accessToken)}`;
  const contactEmail = settings?.contact?.ticketOfficeEmail
    || settings?.contact?.generalEmail
    || process.env.EMAIL_FROM_ADDRESS
    || "";
  const contactPhones = settings?.contact?.ticketOfficePhones
    || settings?.contact?.phones
    || [];
  const items = (order.items || []).map((item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(item.section)} / ${escapeHtml(item.row)} / ${escapeHtml(item.number ?? item.seatLabel)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd">${escapeHtml(item.priceCategoryName || item.priceCategoryCode)}</td>
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(formatMoney(item.finalPrice, item.currency, locale))}</td>
    </tr>`).join("");

  return {
    subject: getSubject(order),
    text: [
      getLeadText(order),
      `${en ? "Reference" : "Referenca"}: ${order.orderCode}`,
      `${en ? "Production" : "Predstava"}: ${productionTitle}`,
      `${en ? "Date" : "Termin"}: ${formatDate(startsAt, locale)}`,
      `${en ? "Venue" : "Scena"}: ${venueName}`,
      `${en ? "Status" : "Status"}: ${en ? ({ reserved: "Reserved", pending_payment: "Payment pending", paid: "Paid", cancelled: "Cancelled", expired: "Expired" }[order.status] || order.status) : ORDER_STATUS_LABELS[order.status] || order.status}`,
      expiresAt ? `${en ? "Deadline" : "Rok"}: ${formatDate(expiresAt, locale)}` : "",
      `${en ? "Total" : "Ukupno"}: ${formatMoney(order.totalAmount, order.currency, locale)}`,
      `${en ? "View order" : "Pregled"}: ${orderUrl}`,
      contactEmail ? `${en ? "Contact" : "Kontakt"}: ${contactEmail}` : "",
      contactPhones.length ? `${en ? "Phone" : "Telefon"}: ${contactPhones.join(", ")}` : "",
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#1c1b19;max-width:680px;margin:auto">
        <h1 style="font-family:Georgia,serif">${escapeHtml(productionTitle || "Madlenianum")}</h1>
        <p>${escapeHtml(getLeadText(order))}</p>
        <p><strong>${en ? "Reference" : "Referenca"}:</strong> ${escapeHtml(order.orderCode)}</p>
        <p><strong>${en ? "Date" : "Termin"}:</strong> ${escapeHtml(formatDate(startsAt, locale))}<br>
        <strong>${en ? "Venue" : "Scena"}:</strong> ${escapeHtml(venueName)}<br>
        <strong>Status:</strong> ${escapeHtml(en ? ({ reserved: "Reserved", pending_payment: "Payment pending", paid: "Paid", cancelled: "Cancelled", expired: "Expired" }[order.status] || order.status) : ORDER_STATUS_LABELS[order.status] || order.status)}
        ${expiresAt ? `<br><strong>${en ? "Deadline" : "Rok"}:</strong> ${escapeHtml(formatDate(expiresAt, locale))}` : ""}</p>
        <table style="border-collapse:collapse;width:100%"><tbody>${items}</tbody></table>
        <p style="font-size:20px"><strong>${en ? "Total" : "Ukupno"}: ${escapeHtml(formatMoney(order.totalAmount, order.currency, locale))}</strong></p>
        <p><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#1c1b19;color:#fff;padding:12px 18px;text-decoration:none">${en ? "View order" : "Pregled porudzbine"}</a></p>
        ${contactEmail ? `<p>${en ? "Contact" : "Kontakt"}: ${escapeHtml(contactEmail)}</p>` : ""}
        ${contactPhones.length ? `<p>${en ? "Phone" : "Telefon"}: ${escapeHtml(contactPhones.join(", "))}</p>` : ""}
      </div>`,
    orderUrl,
  };
};

const sendOrderConfirmation = async (order, accessToken, { isResend = false } = {}) => {
  order.emailDelivery = order.emailDelivery || {};
  order.emailDelivery.status = "pending";
  order.emailDelivery.messageType = getMessageType(order);
  order.emailDelivery.lastAttemptAt = new Date();
  if (isResend) {
    order.emailDelivery.resendCount = Number(order.emailDelivery.resendCount || 0) + 1;
    order.emailDelivery.lastResendAt = new Date();
  }
  await order.save();

  try {
    const message = await buildOrderEmail(order, accessToken);
    await createTransport().sendMail({
      from: {
        name: process.env.EMAIL_FROM_NAME || "Madlenianum",
        address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "noreply@localhost",
      },
      to: order.customerSnapshot.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    order.emailDelivery.status = "sent";
    order.emailDelivery.sentAt = new Date();
    order.emailDelivery.lastError = "";
    await order.save();
    return { sent: true, orderUrl: message.orderUrl };
  } catch (error) {
    order.emailDelivery.status = error.code === "EMAIL_NOT_CONFIGURED"
      ? "not_configured"
      : "failed";
    order.emailDelivery.lastError = String(error.message || error).slice(0, 1000);
    await order.save();
    return { sent: false, error: order.emailDelivery.lastError };
  }
};

module.exports = {
  buildOrderEmail,
  createTransport,
  escapeHtml,
  sendOrderConfirmation,
};
