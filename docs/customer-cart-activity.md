# Customer cart activity

Implemented locally on 7 October 2026. Not deployed.

## Built

Dashboard navigation: **Customer Carts**, route `/admin/cart-activity`.

- Paginated customer cards show name, email, phone, account status, cart line count and up to three product previews.
- Customers sort by their latest successful add-to-cart action. Adding another quantity through the add endpoint also moves the card up. Reads, repricing, removal and ordinary cart updates do not change this timestamp.
- Search covers name and all credential emails/phone numbers. An optional filter shows only customers with cart items. Visible pages refresh every 15 seconds and on window focus.
- Clicking a card opens current cart contents: product image/name, SKU/variant SKU, quantity, recorded price, currency/market and checkout selection. Pending checkout carts remain visible when there is no active cart, matching customer cart reads. Viewing does not resume checkout or rewrite prices.
- A subject and plain-text message composer sends one email and creates a notification in the customer's inbox. Registered devices receive a push attempt; web/mobile notification clicks open the cart.
- Recent message history records subject/body, timestamp and separate channel outcomes. Unique request IDs and a database claim prevent duplicate sends when a request is retried. Sender/customer/body mismatches cannot reuse an existing ID.
- Email permission checks, existing opt-out/suppression rules and the existing Redis-backed send limits apply. HTML is escaped, emails include an unsubscribe link, and long device-push previews are shortened while the inbox/email retain the full message.

Backend endpoints are under `/api/admin/cart-activity`: paginated list, `/{userId}` detail, and `/{userId}/messages` submission. Customer data responses are private and not cached.

## Meaning of delivery states

`ACCEPTED` means the email provider accepted the email; it does not establish inbox delivery. `FAILED` means the provider request failed. Notification `RECORDED` means it was saved in the customer inbox; `QUEUED` additionally means the asynchronous device delivery was dispatched, not that a device displayed it. `SENDING`/`PENDING` can remain after an interrupted process and require checking the send record before starting a new message. Automatic retries never resend an uncertain outcome.

Historical addition timestamps are backfilled approximately from remaining item creation dates. Accurate add timestamps begin with this backend release. Device-only guest carts cannot be seen by the backend; existing customer accounts, including empty carts, are listed.

## Verification

- Dashboard production build, type check and scoped lint passed. The existing large-bundle warning remains.
- 35 backend tests passed, including messaging, escaped email content/provider failure and existing cart lifecycle/repricing/checkout regressions.
- Nine mobile notification routing tests and one website notification routing test passed. Website type checking passed.
- Four real-PostgreSQL integration tests were written but skipped because Docker is not running. They cover the migration, customer ordering/previews, search/pagination/multiple credentials, checkout-cart visibility and actual send-ledger/inbox writes.
- No production database writes, emails or pushes were performed during verification.

## Pending and requirements from your end

1. Make Docker/PostgreSQL integration testing available, then run `AdminCartActivityIT` before release. A staging database test is still required; mocked service tests do not establish PostgreSQL query correctness.
2. Deploy the backend with Flyway migration `V62__admin_cart_activity.sql`, then deploy the dashboard. Release the small website/mobile notification-routing updates so clicking the new notification type opens the cart.
3. Verify the existing SendGrid sender configuration, Redis connection and customer-email feature switch/limits. No new provider or credential type is introduced. Existing default limits allow five sends per admin per day and 1,000 recipients platform-wide per day; single-customer outreach consumes those same limits.
4. Use a staging customer with a valid email, populated contact details and registered notification-enabled mobile device to verify card movement, cart contents, email acceptance/receipt, inbox display and device push. Configure the intended dashboard users with `user:read` for viewing or `marketing:email:send` for outreach; SUPERADMIN is supported. Existing legacy-admin fallback follows backend RBAC configuration.

Device push depends on the customer's permissions and valid registered Expo/FCM token. Firebase is needed only for legacy raw FCM tokens; Expo tokens use the existing Expo delivery service.
