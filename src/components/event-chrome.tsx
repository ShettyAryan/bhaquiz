import Image from "next/image";
import { EVENT_NAME, LOGO_ALT, LOGO_SRC, QUIZ_NAME } from "@/lib/branding";

export function EventHeader() {
  return (
    <header className="shrink-0 border-b border-sky-100 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-2 text-center">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-brand uppercase sm:text-[11px]">
          {QUIZ_NAME}
        </p>
        <h1 className="font-display text-xl leading-tight text-slate-900 sm:text-2xl">
          {EVENT_NAME}
        </h1>
        <div className="mt-1 h-0.5 w-16 rounded-full bg-brand" />
      </div>
    </header>
  );
}

export function EventFooter() {
  return (
    <footer className="shrink-0 border-t border-sky-100 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-1.5">
        <p className="text-[9px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
          Supported by
        </p>
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={720}
          height={140}
          className="mt-0.5 h-8 w-auto max-w-[min(100%,22rem)] object-contain sm:h-10"
        />
      </div>
    </footer>
  );
}
