# Manual partnership invitations

Dashboard location: **Partnership requests → Manual Invitation** at
`/partnership-requests/manual-invitation`. Existing Requests stays in the same
sidebar dropdown. Access matches the existing partnership section: superadmin,
customer support, and legacy admin when enabled by the server policy.

The form accepts up to 50 comma-separated email addresses, trims whitespace,
normalizes case and removes duplicates. Any invalid address rejects the entire
submission before emails are queued. The existing customer-email campaign limits
and enable switch also apply. Each recipient gets their own message; addresses
are never shared in To/CC lists.

The preview comes from the backend's actual versioned template, not a separate
frontend copy. Subject: **Your invitation to partner with Buyology**.
The **Apply for partnership** CTA links to `https://business.buyology.online`.
Reply-To is `support@buyology.online`. Template source:
`src/main/resources/static/partnership-invitation.html` in the backend repo.

## Queue and delivery status

Backend migration V68 adds invitation batches and individual recipients. A batch
stores the exact subject/HTML preview at submission time. Submissions use a UUID
reference: retries with the same reference and recipients do not create another
batch or consume the campaign quota again. A reference cannot be reused for a
different administrator or recipient list. Pending browser submissions retain
that reference across reloads, scoped to the signed-in administrator.

The scheduled dispatcher checks every five seconds and processes at most five
recipients per pass. Claims commit before contacting the existing SendGrid
provider, using PostgreSQL `FOR UPDATE SKIP LOCKED` so replicas cannot claim the
same recipient. This is a queued send; the dashboard polls status and shows the
20 most recent batches.

Statuses are Queued, Sending, Provider accepted (SendGrid HTTP 202), Not accepted
(explicit rejection), and Check with provider (uncertain response). Acceptance
is not inbox delivery. Timeouts/5xx/interrupted attempts are never automatically
resent: an interrupted claim becomes Unknown after ten minutes. Check the email
provider before deliberately creating a new submission for uncertain recipients.

API, all under the same server-side role guard:

- `GET /api/admin/partnership/invitations/template`: subject, HTML, version, limit.
- `POST /api/admin/partnership/invitations`: `requestId`, `emails`, `templateVersion`.
- `GET /api/admin/partnership/invitations`: latest 20 batches and recipient statuses.
- `GET /api/admin/partnership/invitations/{id}`: one batch's status.

## Release

The invitation template was reviewed and approved for pushing on 19 October 2026.
Deploy the backend/migration before the dashboard. No real invitations were sent
during implementation or verification.

Verification: 854 unit tests passed, including normalization, idempotent retries,
limits, transaction ordering, provider outcomes, role enforcement and exact
preview/send equality. Two new PostgreSQL integration checks cover concurrent
submissions/claims and uncertain outcomes; they were skipped locally because no
Docker daemon is installed/running. The dashboard production build passes.
