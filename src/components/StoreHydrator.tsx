"use client";

import { useEffect } from "react";
import { useGuildStore } from "@/lib/store";

export function StoreHydrator() {
  useEffect(() => {
    if (useGuildStore.getState().hydrated) return;
    void useGuildStore.getState().loadFromServer();
  }, []);
  return null;
}
