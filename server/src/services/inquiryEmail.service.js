const SiteSettings = require("../models/SiteSettings");
const { createTransport, escapeHtml } = require("./orderEmail.service");

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("sr-Latn-RS", {
      timeZone: "Europe/Belgrade",
      dateStyle: "long",
    }).format(new Date(value))
  : "-";

const configuredRecipients = (settings, type) => {
  const inquiryRecipients = settings?.inquiryRecipients || {};
  const fromSettings = type === "rental"
    ? inquiryRecipients.rentalEmails
    : inquiryRecipients.eventPlanningEmails;
  const envValue = type === "rental"
    ? process.env.RENTAL_INQUIRY_RECIPIENTS
    : process.env.EVENT_PLANNING_INQUIRY_RECIPIENTS;
  const fallback = process.env.INQUIRY_RECIPIENTS;

  return [
    ...(Array.isArray(fromSettings) ? fromSettings : []),
    ...String(envValue || fallback || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ].filter(Boolean);
};

const subjectFor = (inquiry, type) => {
  if (type === "rental") {
    return `Madlenianum upit za zakup ${inquiry.referenceNumber}`;
  }
  return `Madlenianum event planning upit ${inquiry.referenceNumber}`;
};

const buildInquiryEmail = (inquiry, type) => {
  const isRental = type === "rental";
  const title = isRental
    ? inquiry.rentalSpaceSnapshot?.title || inquiry.rentalSpace?.title || "Zakup prostora"
    : inquiry.eventType || "Planiranje dogadjaja";
  const preferredSpace = inquiry.preferredRentalSpaceSnapshot?.title
    || inquiry.preferredRentalSpace?.title
    || "";

  const lines = [
    `Referenca: ${inquiry.referenceNumber}`,
    `Tip: ${isRental ? "Zakup prostora" : "Planiranje dogadjaja"}`,
    `Prostor/tema: ${title}`,
    preferredSpace ? `Preferirani prostor: ${preferredSpace}` : "",
    `Kontakt: ${inquiry.firstName} ${inquiry.lastName}`,
    inquiry.companyName ? `Kompanija: ${inquiry.companyName}` : "",
    `Email: ${inquiry.email}`,
    `Telefon: ${inquiry.phone}`,
    inquiry.desiredDate ? `Zeljeni datum: ${formatDate(inquiry.desiredDate)}` : "",
    inquiry.approximateGuestCount ? `Broj gostiju: ${inquiry.approximateGuestCount}` : "",
    inquiry.note ? `Napomena: ${inquiry.note}` : "",
  ].filter(Boolean);

  return {
    subject: subjectFor(inquiry, type),
    text: lines.join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#1c1b19;max-width:680px;margin:auto">
        <h1 style="font-family:Georgia,serif">${escapeHtml(title)}</h1>
        <p><strong>Referenca:</strong> ${escapeHtml(inquiry.referenceNumber)}</p>
        <p><strong>Kontakt:</strong> ${escapeHtml(`${inquiry.firstName} ${inquiry.lastName}`)}<br>
        <strong>Email:</strong> ${escapeHtml(inquiry.email)}<br>
        <strong>Telefon:</strong> ${escapeHtml(inquiry.phone)}</p>
        ${inquiry.companyName ? `<p><strong>Kompanija:</strong> ${escapeHtml(inquiry.companyName)}</p>` : ""}
        <p><strong>Zeljeni datum:</strong> ${escapeHtml(formatDate(inquiry.desiredDate))}<br>
        <strong>Broj gostiju:</strong> ${escapeHtml(inquiry.approximateGuestCount || "-")}</p>
        ${preferredSpace ? `<p><strong>Preferirani prostor:</strong> ${escapeHtml(preferredSpace)}</p>` : ""}
        ${inquiry.note ? `<p><strong>Napomena:</strong><br>${escapeHtml(inquiry.note).replace(/\n/g, "<br>")}</p>` : ""}
      </div>`,
  };
};

const sendInquiryNotification = async (inquiry, type, { isResend = false } = {}) => {
  inquiry.emailDelivery = inquiry.emailDelivery || {};
  inquiry.emailDelivery.status = "pending";
  inquiry.emailDelivery.lastAttemptAt = new Date();
  if (isResend) {
    inquiry.emailDelivery.resendCount = Number(inquiry.emailDelivery.resendCount || 0) + 1;
    inquiry.emailDelivery.lastResendAt = new Date();
  }
  await inquiry.save();

  try {
    const settings = await SiteSettings.findOne({ key: "default" }).lean();
    const recipients = configuredRecipients(settings, type);
    if (!recipients.length) {
      const error = new Error("Inquiry recipients are not configured.");
      error.code = "EMAIL_NOT_CONFIGURED";
      throw error;
    }
    const message = buildInquiryEmail(inquiry, type);
    await createTransport().sendMail({
      from: {
        name: process.env.EMAIL_FROM_NAME || "Madlenianum",
        address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || "noreply@localhost",
      },
      to: recipients.join(","),
      replyTo: inquiry.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    inquiry.emailDelivery.status = "sent";
    inquiry.emailDelivery.sentAt = new Date();
    inquiry.emailDelivery.lastError = "";
    await inquiry.save();
    return { sent: true };
  } catch (error) {
    inquiry.emailDelivery.status = error.code === "EMAIL_NOT_CONFIGURED"
      ? "not_configured"
      : "failed";
    inquiry.emailDelivery.lastError = String(error.message || error).slice(0, 1000);
    await inquiry.save();
    return { sent: false, error: inquiry.emailDelivery.lastError };
  }
};

module.exports = {
  sendInquiryNotification,
};
