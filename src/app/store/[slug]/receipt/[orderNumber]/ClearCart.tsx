"use client";

import { useEffect } from "react";
import { useCart } from "@/components/storefront/CartProvider";

/** Empties the cart after a successful online payment (Paystack returns here). */
export default function ClearCart() {
  const { clearCart } = useCart();
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
