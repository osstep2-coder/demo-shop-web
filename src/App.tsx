import { Route, Routes } from "react-router-dom";
import { RequireAuth, ShopLayout } from "./components/Layout";
import { NotFoundState } from "./components/states";
import { AccountLayout, MyOrder, MyOrders, Profile } from "./pages/account/Account";
import { AdminLayout } from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import { AdminOrder, AdminOrders } from "./pages/admin/Orders";
import { AdminProducts } from "./pages/admin/Products";
import { AdminPromos } from "./pages/admin/Promos";
import { AdminUsers } from "./pages/admin/Users";
import { Login, Register } from "./pages/Auth";
import Cart from "./pages/Cart";
import Catalog from "./pages/Catalog";
import Checkout from "./pages/Checkout";
import Home from "./pages/Home";
import Payment from "./pages/Payment";
import ProductPage from "./pages/ProductPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ShopLayout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="product/:uuid" element={<ProductPage />} />
        <Route
          path="cart"
          element={
            <RequireAuth roles={["customer"]}>
              <Cart />
            </RequireAuth>
          }
        />
        <Route
          path="checkout"
          element={
            <RequireAuth roles={["customer"]}>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="orders/:uuid/pay"
          element={
            <RequireAuth roles={["customer"]}>
              <Payment />
            </RequireAuth>
          }
        />
        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Profile />} />
          <Route
            path="orders"
            element={
              <RequireAuth roles={["customer"]}>
                <MyOrders />
              </RequireAuth>
            }
          />
          <Route
            path="orders/:uuid"
            element={
              <RequireAuth roles={["customer"]}>
                <MyOrder />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundState />} />
      </Route>

      <Route
        path="admin"
        element={
          <RequireAuth roles={["manager", "admin"]} framed>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:uuid" element={<AdminOrder />} />
        <Route path="products" element={<AdminProducts />} />
        <Route
          path="users"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminUsers />
            </RequireAuth>
          }
        />
        <Route
          path="promos"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminPromos />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundState text="Такого раздела в панели управления нет." backTo="/admin" backLabel="К обзору" />} />
      </Route>
      <Route path="*" element={<NotFoundState />} />
    </Routes>
  );
}
