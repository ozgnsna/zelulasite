import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export async function getHomeData() {
  try {
    const supabase = await createClient();
    const [categoriesRes, collectionsRes, bestRes, newRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("collections").select("*").order("name"),
      supabase
        .from("products")
        .select("*, category:categories(*), collection:collections(*), product_images(*)")
        .eq("is_active", true)
        .eq("featured", true)
        .limit(8),
      supabase
        .from("products")
        .select("*, category:categories(*), collection:collections(*), product_images(*)")
        .eq("is_active", true)
        .eq("new_arrival", true)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    return {
      categories: categoriesRes.data ?? [],
      collections: collectionsRes.data ?? [],
      bestSellers: (bestRes.data ?? []) as Product[],
      newArrivals: (newRes.data ?? []) as Product[],
    };
  } catch {
    return { categories: [], collections: [], bestSellers: [], newArrivals: [] as Product[] };
  }
}

export async function getProducts(params: {
  category?: string;
  collection?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "featured";
  min?: number;
  max?: number;
}) {
  try {
    const supabase = await createClient();
    const [categoriesRes, collectionsRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("collections").select("*").order("name"),
    ]);
    const categories = categoriesRes.data ?? [];
    const collections = collectionsRes.data ?? [];
    const categoryId = categories.find((c) => c.slug === params.category)?.id;
    const collectionId = collections.find((c) => c.slug === params.collection)?.id;

    let query = supabase
      .from("products")
      .select("*, category:categories(*), collection:collections(*), product_images(*)")
      .eq("is_active", true);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (collectionId) query = query.eq("collection_id", collectionId);
    if (params.min) query = query.gte("price", params.min);
    if (params.max) query = query.lte("price", params.max);

    switch (params.sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "featured":
        query = query.order("featured", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data } = await query;
    return {
      products: (data ?? []) as Product[],
      categories,
      collections,
    };
  } catch {
    return { products: [] as Product[], categories: [], collections: [] };
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(*), collection:collections(*), product_images(*)")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();
    return data as Product | null;
  } catch {
    return null;
  }
}
