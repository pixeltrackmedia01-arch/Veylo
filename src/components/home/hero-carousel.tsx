"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CarArt } from "@/components/shared/car-art";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  eyebrow: string;
  title: string;
  /** Part of the title to colour in the accent shade. */
  highlight?: string;
  text: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  /** Licensed background photo; otherwise an illustrated car is drawn. */
  image?: { url: string; alt: string } | null;
  car: { body: string; colour: string };
  /** Background glow colour. */
  glow: string;
  chip?: string;
}

const INTERVAL = 5500;

function Title({ title, highlight }: { title: string; highlight?: string }) {
  if (!highlight || !title.includes(highlight)) return <>{title}</>;
  const [before, after] = title.split(highlight);
  return (
    <>
      {before}
      <span className="bg-gradient-to-r from-primary to-rose-400 bg-clip-text text-transparent">{highlight}</span>
      {after}
    </>
  );
}

/** Auto-advancing hero banner: pauses on hover/focus, swipeable, honours reduced motion. */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || userPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go(1), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, paused, userPaused, count, go]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="relative isolate overflow-hidden bg-[#0b0d10] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="relative min-h-[560px] sm:min-h-[600px] lg:min-h-[640px]">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              className={cn("absolute inset-0 transition-opacity duration-700 ease-out", active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0")}
            >
              {s.image?.url ? (
                <>
                  <Image src={s.image.url} alt={s.image.alt} fill priority={i === 0} sizes="100vw" className="-z-20 object-cover" unoptimized />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/20" aria-hidden="true" />
                </>
              ) : (
                <div className="absolute inset-0 -z-10" aria-hidden="true">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 75% 45%, ${s.glow} 0%, #0b0d10 62%)` }} />
                  <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,transparent,black_40%,transparent)]" />
                  <div className="absolute bottom-[14%] left-0 h-px w-full bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <div
                    className={cn(
                      "absolute right-[-18%] bottom-[8%] w-[110%] transition-all duration-[1200ms] ease-out sm:right-[-8%] sm:w-[75%] lg:right-[2%] lg:w-[55%]",
                      active ? "translate-x-0 opacity-100" : "translate-x-16 opacity-0",
                    )}
                  >
                    <CarArt body={s.car.body} color={s.car.colour} className="drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]" />
                  </div>
                </div>
              )}

              <div className="container-page flex h-full items-start pt-14 sm:items-center sm:pt-0">
                <div
                  className={cn(
                    "max-w-xl transition-all delay-150 duration-700 ease-out lg:max-w-2xl",
                    active ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                  )}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">
                    <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> {s.eyebrow}
                  </span>
                  <h2 className="mt-5 text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl lg:text-6xl">
                    <Title title={s.title} highlight={s.highlight} />
                  </h2>
                  <p className="mt-5 max-w-lg text-lg leading-8 text-white/80">{s.text}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href={s.cta.href}
                      tabIndex={active ? 0 : -1}
                      className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-white shadow-lg shadow-primary/40 transition-all hover:-translate-y-0.5 hover:bg-primary-hover"
                    >
                      {s.cta.label} <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                    {s.secondary ? (
                      <Link
                        href={s.secondary.href}
                        tabIndex={active ? 0 : -1}
                        className="inline-flex h-12 items-center rounded-xl border border-white/30 bg-white/5 px-6 font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
                      >
                        {s.secondary.label}
                      </Link>
                    ) : null}
                  </div>
                  {s.chip ? <p className="mt-6 text-sm font-medium text-emerald-300">{s.chip}</p> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-6 z-20">
          <div className="container-page flex items-center justify-between gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  onClick={() => setIndex(i)}
                  className={cn("relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all", i === index ? "w-12" : "w-6 hover:bg-white/40")}
                >
                  {i === index ? (
                    <span
                      key={`${index}-${paused || userPaused}`}
                      className={cn("absolute inset-y-0 left-0 rounded-full bg-primary", paused || userPaused ? "w-full" : "animate-[progress_5.5s_linear_forwards]")}
                    />
                  ) : null}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
                className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition-colors hover:bg-white/20"
              >
                {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous slide"
                className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next slide"
                className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition-colors hover:bg-white/20"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
