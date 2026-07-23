const nodemailer = require("nodemailer");
const SiteSettings = require("../models/SiteSettings");
const { ORDER_STATUS_LABELS } = require("../constants/order.constants");

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
  if (order.status === "reserved") return `Madlenianum rezervacija ${reference}`;
  if (order.status === "pending_payment") return `Madlenianum kupovina u toku ${reference}`;
  if (order.status === "paid") return `Madlenianum potvrda placanja ${reference}`;
  if (order.status === "cancelled") return `Madlenianum otkazivanje ${reference}`;
  if (order.status === "expired") return `Madlenianum istek rezervacije ${reference}`;
  return `Madlenianum porudzbina ${reference}`;
};

const getLeadText = (order) => {
  if (order.status === "reserved") return "Vasa sedista su rezervisana do navedenog roka.";
  if (order.status === "pending_payment") {
    return "Kupovina je pokrenuta. Ova poruka nije potvrda uspesnog placanja.";
  }
  if (order.status === "paid") return "Placanje je evidentirano i ulaznice su potvrdene.";
  if (order.status === "cancelled") return "Porudzbina ili rezervacija je otkazana.";
  if (order.status === "expired") return "Rok je istekao i sedista su oslobodjena.";
  return "Primili smo vas zahtev.";
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("sr-Latn-RS", {
      timeZone: "Europe/Belgrade",
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(value))
  : "-";

const formatMoney = (amount, currency) => new Intl.NumberFormat("sr-Latn-RS", {
  style: "currency",
  currency: currency || "RSD",
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

const buildOrderEmail = async (order, accessToken) => {
  const settings = await SiteSettings.findOne({ key: "default" }).lean();
  const event = order.event || {};
  const snapshot = order.eventSnapshot || {};
  const productionTitle = event.production?.title || snapshot.productionTitle || "";
  const venueName = event.venue?.name || snapshot.venueName || "";
  const startsAt = event.startsAt || snapshot.eventStartsAt;
  const expiresAt = order.reservationExpiresAt || order.paymentExpiresAt || order.expiresAt;
  const baseUrl = String(process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "http://localhost:4200")
    .replace(/\/+$/, "");
  const orderUrl = `${baseUrl}/porudzbina/${encodeURIComponent(order.orderCode)}?token=${encodeURIComponent(accessToken)}`;
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
      <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(formatMoney(item.finalPrice, item.currency))}</td>
    </tr>`).join("");

  return {
    subject: getSubject(order),
    text: [
      getLeadText(order),
      `Referenca: ${order.orderCode}`,
      `Predstava: ${productionTitle}`,
      `Termin: ${formatDate(startsAt)}`,
      `Scena: ${venueName}`,
      `Status: ${ORDER_STATUS_LABELS[order.status] || order.status}`,
      expiresAt ? `Rok: ${formatDate(expiresAt)}` : "",
      `Ukupno: ${formatMoney(order.totalAmount, order.currency)}`,
      `Pregled: ${orderUrl}`,
      contactEmail ? `Kontakt: ${contactEmail}` : "",
      contactPhones.length ? `Telefon: ${contactPhones.join(", ")}` : "",
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#1c1b19;max-width:680px;margin:auto">
        <h1 style="font-family:Georgia,serif">${escapeHtml(productionTitle || "Madlenianum")}</h1>
        <p>${escapeHtml(getLeadText(order))}</p>
        <p><strong>Referenca:</strong> ${escapeHtml(order.orderCode)}</p>
        <p><strong>Termin:</strong> ${escapeHtml(formatDate(startsAt))}<br>
        <strong>Scena:</strong> ${escapeHtml(venueName)}<br>
        <strong>Status:</strong> ${escapeHtml(ORDER_STATUS_LABELS[order.status] || order.status)}
        ${expiresAt ? `<br><strong>Rok:</strong> ${escapeHtml(formatDate(expiresAt))}` : ""}</p>
        <table style="border-collapse:collapse;width:100%"><tbody>${items}</tbody></table>
        <p style="font-size:20px"><strong>Ukupno: ${escapeHtml(formatMoney(order.totalAmount, order.currency))}</strong></p>
        <p><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#1c1b19;color:#fff;padding:12px 18px;text-decoration:none">Pregled porudzbine</a></p>
        ${contactEmail ? `<p>Kontakt: ${escapeHtml(contactEmail)}</p>` : ""}
        ${contactPhones.length ? `<p>Telefon: ${escapeHtml(contactPhones.join(", "))}</p>` : ""}
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
  sendOrderConfirmation,
};
