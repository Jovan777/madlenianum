# Manual test matrix

Use a disposable development/test database. Do not run seeds or destructive scenarios against production.

## Administrator and CMS

1. Run the documented seeds and log in with `marketing@madlenianum.rs` / `Admin123!`.
2. Open `/admin`, `/admin/system` and `/admin/audit-logs`; verify loading, empty/error behavior and readable warnings.
3. Create a draft News item containing Serbian and English content. Verify it is absent publicly.
4. Publish it, verify both locale routes, then archive it and verify it disappears publicly.
5. Repeat save/preview/publish checks for a Production, Artist, PromoSlide, About/Contact, HomepageConfig and SiteSettings change.
6. Confirm the audit view records the mutations without passwords, complete request bodies or personal-data snapshots.

## Event, pricing and map

1. Open an Event and verify Production, Venue, SeatMap and PricePlan compatibility details.
2. Attempt invalid dates, Venue/SeatMap mismatch and invalid PricePlan; expect field-level `400` responses.
3. Open base SeatMap preview and Event override map; compare physical coordinates with `/kupovina/:eventId`.
4. Add and remove one Event override; confirm the public seat becomes unavailable without changing the base Seat.
5. Verify section filters, row/section selection, zoom/pan and keyboard focus in admin.

## Guest ticketing

1. Open a future on-sale Event and select seats on desktop and a narrow mobile viewport.
2. Continue to checkout; verify the backend creates all locks together and shows the server expiry countdown.
3. Refresh and verify lock restoration for the same guest session.
4. In a second private browser session select the same seat and continue; expect a conflict and refreshed map state.
5. Create a reservation. Verify status `reserved`, yellow state, reference, expiry and secure guest link.
6. Create a purchase attempt. Verify status `pending_payment`, not `paid`, and no false payment-success wording.
7. Look up each Order using reference and email; verify no account is requested.
8. In admin, filter by Event/status, inspect snapshots and cancel the reservation; confirm its seat becomes available.
9. Mark only an eligible pending purchase paid using the authorized admin action; verify its seat remains sold after expiry processing.
10. Simulate email transport failure, create an Order and verify the Order remains saved with failed delivery; restore transport and use Resend.

## Fundus, rental and inquiries

1. Browse Costume and Prop/Scenography tabs; verify URL filters/pagination and published-only detail pages.
2. Confirm no Fundus reservation or inquiry form exists.
3. Submit a RentalSpace inquiry twice with one idempotency key; verify one record and one reference.
4. Submit a general Event Planning inquiry without a selected space.
5. In `/admin/inquiries`, filter both types, change valid statuses, add notes and resend notification.
6. Confirm status text never implies an automatic reservation.

## Media and security

1. Upload valid JPEG, PNG, WEBP, GIF and PDF files within the configured limit.
2. Rename a text/script file to an allowed extension; expect content-signature rejection and cleanup.
3. Attempt unsupported MIME/extension, oversized file and too many files; expect clear `400`/`413` style validation.
4. Try deleting used Media; expect `409` with usage. Delete one unused managed file and verify file plus record removal.
5. Confirm repeated failed admin logins and Order lookups eventually return `429`.
6. Confirm an untrusted Origin is rejected while the configured frontend Origin succeeds.
7. Save rich text containing `<script>`, `onclick` and `javascript:`; verify unsafe content is removed while paragraphs/lists/emphasis remain.

## Responsive and accessibility

1. Check public header/menu, homepage, repertoire, detail pages, Fundus, rental, checkout and Order lookup at 1440, 1024, 768, 390 and 360 px widths.
2. Complete mobile checkout without desktop mode; verify map controls, selected-seat summary and form actions remain reachable.
3. Check admin sidebar, filters, long forms, tables, action groups and dialogs at desktop, laptop and tablet widths.
4. Navigate menus, forms, seat controls and dialogs by keyboard. Verify visible focus, labels, error association, Escape behavior and modal focus restoration.
5. Verify meaningful image alt text and that statuses are not conveyed by color alone.

