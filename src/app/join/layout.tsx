"use client";

import { ViewportLock } from "@/components/viewport-lock";

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ViewportLock />
      {children}
    </>
  );
}
