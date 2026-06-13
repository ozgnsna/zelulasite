import { ProductImage } from "@/components/product/ProductImage";

export function ReviewPhoto({
  src,
  alt,
  className,
  sizes = "120px",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100 ${className ?? "size-28"}`}>
      <ProductImage src={src} alt={alt} fill className="object-cover" sizes={sizes} />
    </div>
  );
}
