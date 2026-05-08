"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { trackCategoryClick } from "@/lib/analytics";

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
  category: string;
  location: string;
};

export function CategoryClickLink({ children, className, category, location, ...props }: Props) {
  return (
    <Link
      {...props}
      className={className}
      onClick={() =>
        trackCategoryClick({
          category,
          location,
          href: typeof props.href === "string" ? props.href : undefined,
        })
      }
    >
      {children}
    </Link>
  );
}
