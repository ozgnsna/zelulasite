export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  featured: boolean;
  new_arrival: boolean;
  category_id: string;
  collection_id: string | null;
  material: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  category?: Category;
  collection?: Collection | null;
  product_images?: { id: string; image_url: string; is_cover: boolean }[];
};

export type CartItem = {
  productId: string;
  quantity: number;
};
