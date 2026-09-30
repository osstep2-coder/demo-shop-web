import { useQuery } from "@tanstack/react-query";
import { productsApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

/** The API has no categories endpoint: collect them from the catalog (max page size is 100). */
export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["categories", user?.role ?? "guest"],
    queryFn: async () => {
      const { items } = await productsApi.list({ take: 100 });
      const counts = new Map<string, number>();
      for (const p of items) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
      return [...counts.entries()].map(([name, count]) => ({ name, count })).toSorted((a, b) => a.name.localeCompare(b.name, "ru"));
    },
    staleTime: 60_000,
  });
}
