"use client";

import { useEffect } from "react";

export function ViewportLock() {
  useEffect(() => {
    document.documentElement.classList.add("live-viewport");
    document.body.classList.add("live-viewport");
    return () => {
      document.documentElement.classList.remove("live-viewport");
      document.body.classList.remove("live-viewport");
    };
  }, []);

  return null;
}
