import NewProduct from "../Products/NewProduct";

/**
 * Supplier portal "New Product" — reuses the admin form in supplierMode so suppliers
 * get the exact same translations / specs / variants / colors / accessories pipeline,
 * with two extras: store picker + store price, and a bg-removed image-rule notice.
 *
 * Submission posts to /api/supplier/products/full which auto-stamps:
 *   - supplierId = current supplier
 *   - supplierStatus = PENDING_REVIEW
 *   - isActive = false (draft)
 *   - status = "INACTIVE" (hidden from catalog until approved + published)
 */
export default function NewSupplierFullProductPage() {
  return <NewProduct supplierMode />;
}
