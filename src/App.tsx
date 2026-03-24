import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Stories from "./pages/Stories/Stories";
import NewStory from "./pages/Stories/NewStory";
import Products from "./pages/Products/Products";
import ProductDetail from "./pages/Products/ProductDetail";
import NewProduct from "./pages/Products/NewProduct";
import ProductsTrash from "./pages/Products/ProductsTrash";
import Categories from "./pages/Products/Categories";
import Brands from "./pages/Products/Brands";
import Specs from "./pages/Products/Specs";
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
import Couriers from "./pages/Couriers/Couriers";
import CourierDetail from "./pages/Couriers/CourierDetail";
import NewCourier from "./pages/Couriers/NewCourier";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      {/* AuthProvider must be inside Router so it can use useNavigate */}
      <AuthProvider>
        <Routes>
          {/* ── Protected dashboard routes ─────────────────────────────────── */}
          {/* ProtectedRoute checks auth state; redirects to /signin if needed */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              {/* Stories */}
              <Route path="/stories" element={<Stories />} />
              <Route path="/new-story" element={<NewStory />} />

              {/* Products */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/new-product" element={<NewProduct />} />
              <Route path="/products/trash" element={<ProductsTrash />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/specs" element={<Specs />} />

              {/* Stores */}
              <Route path="/stores" element={<Stores />} />
              <Route path="/stores/new" element={<NewStore />} />
              <Route path="/stores/:id" element={<StoreDetail />} />
              <Route path="/stores/:id/products" element={<StoreProducts />} />
              <Route path="/stores/:id/products/assign" element={<AssignProduct />} />
              <Route path="/countries" element={<Countries />} />

              {/* Admins */}
              <Route path="/admin/admins" element={<Admins />} />
              <Route path="/admin/admins/:authCredentialId" element={<AdminDetail />} />

              {/* Users */}
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/:authCredentialId" element={<UserDetail />} />

              {/* Couriers */}
              <Route path="/admin/couriers" element={<Couriers />} />
              <Route path="/admin/couriers/new" element={<NewCourier />} />
              <Route path="/admin/couriers/:courierId" element={<CourierDetail />} />

              {/* Reviews & Q&A */}
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/questions" element={<Questions />} />

              {/* Others Page */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>

          {/* ── Public auth routes ─────────────────────────────────────────── */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
