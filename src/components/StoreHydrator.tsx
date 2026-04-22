"use client";

import { useEffect } from "react";
import { useGuildStore } from "@/lib/store";

export function StoreHydrator() {
  useEffect(() => {
    if (useGuildStore.persist.hasHydrated()) return;
    void useGuildStore.persist.rehydrate();
  }, []);
  return null;
}
