import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../api/endpoints";
import type { Cart } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export const CART_KEY = ["cart"];

export function useCart() {
  const { isCustomer } = useAuth();
  return useQuery({ queryKey: CART_KEY, queryFn: cartApi.get, enabled: isCustomer });
}

/** Every cart endpoint returns the fresh cart, so we put it straight into the cache. */
export function useCartMutation<TArgs>(fn: (args: TArgs) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => queryClient.setQueryData(CART_KEY, cart),
  });
}

export function cartCount(cart: Cart | undefined) {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}
