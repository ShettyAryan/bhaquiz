import Image from "next/image";
import {
  EVENT_LOGO_ALT,
  EVENT_LOGO_SRC,
  MED_LOGOS,
  QUIZ_NAME,
  SPONSOR_LOGO_ALT,
  SPONSOR_LOGO_SRC,
} from "@/lib/branding";

export function EventHeader() {
  return (
    <header className="shrink-0 border-b border-sky-100 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-3 py-[0.2rem] text-center sm:py-1">
        <div className="relative h-[clamp(2.7rem,8vh,4.85rem)] w-[min(94vw,26rem)] overflow-hidden">
          <Image
            src={EVENT_LOGO_SRC}
            alt={EVENT_LOGO_ALT}
            width={1600}
            height={721}
            priority
            quality={100}
            className="h-full w-full origin-center object-contain scale-[1.68]"
          />
        </div>
        <p className="px-2 text-[0.62rem] font-semibold tracking-[0.12em] text-brand uppercase sm:text-[0.78rem] sm:tracking-[0.14em]">
          {QUIZ_NAME}
        </p>
      </div>
    </header>
  );
}

export function EventFooter() {
  return (
    <footer className="shrink-0 border-t border-sky-100 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-3 py-[0.2rem] sm:py-1">
        <p className="text-[8px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
          Supported by
        </p>
        <Image
          src={SPONSOR_LOGO_SRC}
          alt={SPONSOR_LOGO_ALT}
          width={940}
          height={102}
          quality={100}
          className="mt-px h-[clamp(1.15rem,3.1vh,1.85rem)] w-auto max-w-[min(100%,20rem)] object-contain"
        />
        <div className="mt-0.5 flex w-full max-w-4xl items-center justify-center gap-2 sm:gap-5">
          {MED_LOGOS.map((logo) => (
            <Image
              key={logo.src}
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              quality={100}
              className="h-[clamp(1.85rem,5.2vh,3.1rem)] w-auto max-w-[32%] object-contain"
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
