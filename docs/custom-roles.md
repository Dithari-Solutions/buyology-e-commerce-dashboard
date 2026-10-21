# Custom staff roles

As a Super Admin, open **Admins → Roles & Permissions** (`/admin/roles`).

1. Choose **Create Role**, enter a name such as **Inventory Manager**, and select its permissions. The role and its initial permissions are saved together.
2. Select the role and choose **Assign people**. Search existing admin accounts by name or email.
3. Assign the role in addition to their existing roles, or explicitly select **Replace existing roles with this role** to narrow their access. All assigned roles contribute permissions; direct user ALLOW/DENY overrides still apply.
4. Use **Members** to see or remove assignments. An admin must keep a replacement role. Own/last Super Admin removal is protected by the API.
5. Use **Permissions** to edit grants and **Edit** to rename a custom role or change its description. A role with assigned people cannot be deleted.

For a person without an admin account, the assignment dialog links to the existing account creation/promotion flow with the role preselected. A customer must be explicitly promoted before receiving a custom staff role.

For inventory work, consider `store:read`, `store:product:read`, and `store:product:update`. Add `product:read` for the product catalog, `store:product:assign` to assign listings or variants, and `store:product:remove` only if removal is required. Store-product pages require both store and store-product read access. Select only the capabilities the person needs.

Custom-role accounts always use their database permissions even when `RBAC_STRICT_PERMISSIONS=false`. The authentication filter does not synthesize blanket `ROLE_ADMIN` authority for them. Existing built-in role permissions still contribute their grants. System-only accounts keep the existing compatibility behavior. Super Admin retains its recovery access and exclusive account/role management endpoints.

API access is checked against current assignments and permissions on every request, including existing access tokens. Dashboard navigation uses signed JWT claims: reload the person's dashboard (or sign in again) after changing their roles or permissions to refresh its menus. Empty custom roles receive a workspace without access to business sections.

Deploy the backend before deploying this dashboard version. No database migration is needed. Role names are stored as uppercase identifiers, with spaces/hyphens normalized to underscores, and displayed as readable names.

Validation: dashboard production build, lint of changed files, mocked browser flows for creation/assignment/replacement/revocation/removal and 320–1440 px layouts; backend unit tests cover permission grants, invalid selections, assignment safeguards, signed custom-role claims, live revocation and denial of legacy admin fallback. Browser checks use test accounts and mocked API responses; no live accounts are changed.
