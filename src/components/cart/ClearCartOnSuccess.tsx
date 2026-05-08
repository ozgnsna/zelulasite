"use client";

import { useEffect, useRef } from "react";
import { clearCart } from "@/app/actions/store";

export function ClearCartOnSuccess() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    void clearCart();
  }, []);

  return null;
}
