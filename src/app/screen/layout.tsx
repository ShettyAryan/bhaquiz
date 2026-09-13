import { ViewportLock } from "@/components/viewport-lock";

export default function ScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ViewportLock />
      {children}
    </>
  );
}
