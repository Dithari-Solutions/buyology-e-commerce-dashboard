import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RoleRoute from "./components/common/RoleRoute";
import { I18nProvider } from "./i18n/I18nProvider";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import MfaSetup from "./pages/AuthPages/MfaSetup";
import MfaVerify from "./pages/AuthPages/MfaVerify";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Stories from "./pages/Stories/Stories";
import NewStory from "./pages/Stories/NewStory";
import Products from "./pages/Products/Products";
import ProductDetail from "./pages/Products/ProductDetail";
import EditProductPage from "./pages/Products/EditProductPage";
import NewProduct from "./pages/Products/NewProduct";
import ProductsTrash from "./pages/Products/ProductsTrash";
import Categories from "./pages/Products/Categories";
import Brands from "./pages/Products/Brands";
import Specs from "./pages/Products/Specs";
import SpecCodes from "./pages/Products/SpecCodes";
import Reviews from "./pages/ReviewsQA/Reviews";
import Questions from "./pages/ReviewsQA/Questions";
import Stores from "./pages/Stores/Stores";
import NewStore from "./pages/Stores/NewStore";
import StoreDetail from "./pages/Stores/StoreDetail";
import StoreProducts from "./pages/Stores/StoreProducts";
import AssignProduct from "./pages/Stores/AssignProduct";
import Countries from "./pages/Stores/Countries";
import Users from "./pages/Users/Users";
import UserDetail from "./pages/Users/UserDetail";
import Admins from "./pages/Admins/Admins";
import AdminDetail from "./pages/Admins/AdminDetail";
import NewAdmin from "./pages/Admins/NewAdmin";
import Couriers from "./pages/Couriers/Couriers";
import CourierDetail from "./pages/Couriers/CourierDetail";
import NewCourier from "./pages/Couriers/NewCourier";
import EditCourier from "./pages/Couriers/EditCourier";
import CourierMap from "./pages/Couriers/CourierMap";
import Orders from "./pages/Orders/Orders";
import StoreOrders from "./pages/Orders/StoreOrders";
import OrderDetail from "./pages/Orders/OrderDetail";
import AllOrdersPage from "./pages/Orders/AllOrdersPage";
import GamesPage from "./pages/Games/GamesPage";
import PromoCodePage from "./pages/PromoCode/PromoCodePage";
import NewsletterPage from "./pages/Newsletter/NewsletterPage";
import BannersPage from "./pages/Banners/BannersPage";
import B2BInquiriesPage from "./pages/B2BInquiries/B2BInquiriesPage";
import RefundsPage from "./pages/Refunds/RefundsPage";
import RefundDetailPage from "./pages/Refunds/RefundDetailPage";
import PayoutsPage from "./pages/Payouts/PayoutsPage";
import PayoutDetailPage from "./pages/Payouts/PayoutDetailPage";
import B2BMembershipPage from "./pages/B2BMembership/B2BMembershipPage";
import B2BMemberDetailPage from "./pages/B2BMembership/B2BMemberDetailPage";
import B2BApplicationDetailPage from "./pages/B2BMembership/B2BApplicationDetailPage";
import CreditManagementPage from "./pages/B2BMembership/CreditManagementPage";
import B2BCountriesPage from "./pages/B2BMembership/B2BCountriesPage";
import SuppliersPage from "./pages/Suppliers/SuppliersPage";
import SupplierDetailPage from "./pages/Suppliers/SupplierDetailPage";
import SupplierProductsPage from "./pages/Suppliers/SupplierProductsPage";
import RevenuesPage from "./pages/Revenue/RevenuesPage";
import SupplierRevenuesPage from "./pages/Revenue/SupplierRevenuesPage";
import RevenueExportsPage from "./pages/Revenue/RevenueExportsPage";
import SupplierSetPasswordPage from "./pages/SupplierPortal/SupplierSetPasswordPage";
import MyProductsPage from "./pages/SupplierPortal/MyProductsPage";
import NewSupplierFullProductPage from "./pages/SupplierPortal/NewSupplierFullProductPage";
import SupplierAnalyticsPage from "./pages/SupplierPortal/SupplierAnalyticsPage";
import SupplierOrdersPage from "./pages/SupplierPortal/SupplierOrdersPage";
import SupplierAccountPage from "./pages/SupplierPortal/SupplierAccountPage";
import SupplierReviewsPage from "./pages/SupplierPortal/SupplierReviewsPage";
import SupplierPayoutsPage from "./pages/SupplierPortal/SupplierPayoutsPage";
import SupplierProductDetailPage from "./pages/SupplierPortal/SupplierProductDetailPage";
import SupplierRefundsPage from "./pages/SupplierPortal/SupplierRefundsPage";
import SupplierTrashPage from "./pages/SupplierPortal/SupplierTrashPage";
import SupplierProductChangesPage from "./pages/Suppliers/SupplierProductChangesPage";
import CourierProfilesPage from "./pages/Couriers/CourierProfilesPage";
import Quotes from "./pages/Procurement/Quotes";
import QuoteDetail from "./pages/Procurement/QuoteDetail";
import Requests from "./pages/Procurement/Requests";
import SellRequests from "./pages/Procurement/SellRequests";
import SellRequestDetail from "./pages/Procurement/SellRequestDetail";
import Repair from "./pages/Repair/Repair";
import RepairDetail from "./pages/Repair/RepairDetail";
import QuiqupTestingPage from "./pages/QuiqupTesting/QuiqupTestingPage";
import ErpPage from "./pages/Erp/ErpPage";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <I18nProvider>
      {/* AuthProvider must be inside Router so it can use useNavigate */}
      <AuthProvider>
        <Routes>
          {/* ── Protected dashboard routes ─────────────────────────────────── */}
          {/* ProtectedRoute checks auth state; redirects to /signin if needed */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* ── Admin-side routes (ADMIN/SUPERADMIN/CUSTOMER_SUPPORT/COURIER).
                  Pure SUPPLIER users hitting any of these are bounced to their portal. */}
              <Route element={<RoleRoute mode="admin" />}>
              <Route index path="/" element={<Home />} />

              {/* Stories */}
              <Route path="/stories" element={<Stories />} />
              <Route path="/new-story" element={<NewStory />} />

              {/* Products */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/products/:id/edit" element={<EditProductPage />} />
              <Route path="/new-product" element={<NewProduct />} />
              <Route path="/products/trash" element={<ProductsTrash />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/specs" element={<Specs />} />
              <Route path="/spec-codes" element={<SpecCodes />} />

              {/* Stores */}
              <Route path="/stores" element={<Stores />} />
              <Route path="/stores/new" element={<NewStore />} />
              <Route path="/stores/:id" element={<StoreDetail />} />
              <Route path="/stores/:id/products" element={<StoreProducts />} />
              <Route path="/stores/:id/products/assign" element={<AssignProduct />} />
              <Route path="/countries" element={<Countries />} />

              {/* Admins */}
              <Route path="/admin/admins" element={<Admins />} />
              <Route path="/admin/admins/new" element={<NewAdmin />} />
              <Route path="/admin/admins/:authCredentialId" element={<AdminDetail />} />

              {/* Users */}
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/:authCredentialId" element={<UserDetail />} />

              {/* Couriers */}
              <Route path="/admin/courier-profiles" element={<CourierProfilesPage />} />
              <Route path="/admin/couriers" element={<Couriers />} />
              <Route path="/admin/couriers/new" element={<NewCourier />} />
              <Route path="/admin/couriers/map" element={<CourierMap />} />
              <Route path="/admin/couriers/:courierId" element={<CourierDetail />} />
              <Route path="/admin/couriers/:courierId/edit" element={<EditCourier />} />

              {/* Orders */}
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/all" element={<AllOrdersPage />} />
              <Route path="/orders/:storeId" element={<StoreOrders />} />
              <Route path="/orders/:storeId/:orderId" element={<OrderDetail />} />

              {/* Reviews & Q&A */}
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/questions" element={<Questions />} />

              {/* Games */}
              <Route path="/games" element={<GamesPage />} />

              {/* Promo Codes */}
              <Route path="/promo-codes" element={<PromoCodePage />} />

              {/* Newsletter & News */}
              <Route path="/newsletter" element={<NewsletterPage />} />

              {/* Banners */}
              <Route path="/banners" element={<BannersPage />} />

              {/* B2B Inquiries */}
              <Route path="/b2b-inquiries" element={<B2BInquiriesPage />} />

              {/* Refunds */}
              <Route path="/refunds" element={<RefundsPage />} />
              <Route path="/refunds/store/:storeId" element={<RefundsPage />} />
              <Route path="/refunds/:id" element={<RefundDetailPage />} />

              {/* Payouts */}
              <Route path="/payouts" element={<PayoutsPage />} />
              <Route path="/payouts/:id" element={<PayoutDetailPage />} />

              {/* B2B Membership */}
              <Route path="/b2b-membership" element={<B2BMembershipPage />} />
              <Route path="/b2b-members/:id" element={<B2BMemberDetailPage />} />
              <Route path="/b2b-applications/:id" element={<B2BApplicationDetailPage />} />
              <Route path="/b2b-credit" element={<CreditManagementPage />} />
              <Route path="/b2b-countries" element={<B2BCountriesPage />} />

              {/* Revenue (admin). Export buttons + history are SUPERADMIN-gated in-page. */}
              <Route path="/revenue" element={<RevenuesPage />} />
              <Route path="/supplier-revenue" element={<SupplierRevenuesPage />} />
              <Route path="/revenue-exports" element={<RevenueExportsPage />} />

              {/* Procurement — B2B RFQ quotes (PROCUREMENT + SUPERADMIN; pages self-gate) */}
              <Route path="/procurement/quotes" element={<Quotes />} />
              <Route path="/procurement/quotes/:id" element={<QuoteDetail />} />
              <Route path="/procurement/requests" element={<Requests />} />
              {/* Sell (trade-in) requests — procurement prices what Buyology pays */}
              <Route path="/procurement/sell-requests" element={<SellRequests />} />
              <Route path="/procurement/sell-requests/:id" element={<SellRequestDetail />} />
              {/* Repair — customer device-repair requests (REPAIR + SUPERADMIN; pages self-gate) */}
              <Route path="/repair" element={<Repair />} />
              <Route path="/repair/:id" element={<RepairDetail />} />

              {/* Quiqup Testing — isolated staging delivery sandbox (SUPERADMIN; sidebar-gated).
                  Talks only to the local quiqup-sandbox server, never the prod order APIs. */}
              <Route path="/quiqup-testing" element={<QuiqupTestingPage />} />

              {/* ERP — ERPNext product list (SUPERADMIN; sidebar-gated). Testing stage:
                  fetches Items live from ERPNext for display only, no DB persistence. */}
              <Route path="/erp" element={<ErpPage />} />

              {/* Supplier Management (admin) */}
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="/supplier-products" element={<SupplierProductsPage />} />
              <Route path="/supplier-product-changes" element={<SupplierProductChangesPage />} />

              </Route>

              {/* ── Supplier Portal routes. Only pure SUPPLIER users; admins are
                  bounced to "/" (which they own). */}
              <Route element={<RoleRoute mode="supplier" />}>
              <Route path="/supplier/my-products" element={<MyProductsPage />} />
              <Route path="/supplier/products/:id" element={<SupplierProductDetailPage />} />
              <Route path="/supplier/refunds" element={<SupplierRefundsPage />} />
              <Route path="/supplier/trash" element={<SupplierTrashPage />} />
              <Route path="/supplier/orders" element={<SupplierOrdersPage />} />
              <Route path="/supplier/new-product" element={<NewSupplierFullProductPage />} />
              <Route path="/supplier/analytics" element={<SupplierAnalyticsPage />} />
              <Route path="/supplier/account" element={<SupplierAccountPage />} />
              <Route path="/supplier/reviews" element={<SupplierReviewsPage />} />
              <Route path="/supplier/payouts" element={<SupplierPayoutsPage />} />
              </Route>

              {/* ── Pages available to any authenticated user ── */}
              <Route path="/profile" element={<UserProfiles />} />
            </Route>
          </Route>

          {/* ── Public auth routes ─────────────────────────────────────────── */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          {/* Two-factor flow — reachable only mid-sign-in (guarded by pendingMfa). */}
          <Route path="/mfa/setup" element={<MfaSetup />} />
          <Route path="/mfa/verify" element={<MfaVerify />} />
          <Route path="/supplier/set-password" element={<SupplierSetPasswordPage />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
      </I18nProvider>
    </Router>
  );
}
