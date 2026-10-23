"use client";

import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CarArt } from "@/components/shared/car-art";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { VehicleColour } from "@/lib/types";
import { cn } from "@/lib/utils";

export type GallerySlide = { kind: "photo"; url: string; alt: string } | { kind: "art"; colour: VehicleColour };

function Slide({ slide, body, name, sizes, priority }: { slide: GallerySlide; body: string | null; name: string; sizes: string; priority?: boolean }) {
  if (slide.kind === "photo") {
    return <Image src={slide.url} alt={slide.alt} fill sizes={sizes} priority={priority} className="object-cover" />;
  }
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <CarArt body={body} color={slide.colour.hex} title={`${name} in ${slide.colour.name} (illustration)`} className="w-[86%]" />
    </div>
  );
}

/** Main image with arrows, counter, thumbnails and a full-screen "All photos" view. */
export function CarGallery({ slides, body, name }: { slides: GallerySlide[]; body: string | null; name: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = slides.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);
  const hasPhotos = slides.some((s) => s.kind === "photo");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!count) return null;
  const current = slides[index];

  const arrows = (dark?: boolean) =>
    count > 1 ? (
      <>
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous image"
          className={cn(
            "absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110",
            dark ? "bg-white/15 text-white hover:bg-white/25" : "bg-white text-ink",
          )}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next image"
          className={cn(
            "absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110",
            dark ? "bg-white/15 text-white hover:bg-white/25" : "bg-white text-ink",
          )}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </>
    ) : null;

  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border bg-white">
        <button type="button" onClick={() => setOpen(true)} className="absolute inset-0 cursor-zoom-in" aria-label="Open all photos">
          <Slide slide={current} body={body} name={name} sizes="(min-width: 1024px) 66vw, 100vw" priority />
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-ink"
        >
          <Images className="size-3.5" aria-hidden="true" /> All {hasPhotos ? "photos" : "colours"} ({count})
        </button>
        {arrows()}
        <span className="absolute right-3 bottom-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">
          {index + 1}/{count}
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show image ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all hover:opacity-100",
              i === index ? "border-primary" : "border-transparent opacity-70",
            )}
          >
            <Slide slide={s} body={body} name={name} sizes="96px" />
          </button>
        ))}
      </div>
      {!hasPhotos ? (
        <p className="mt-2 text-xs text-muted-foreground">Illustrations shown in this model&apos;s colour options. Photos will appear here once uploaded.</p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-none bg-ink p-3 text-white sm:p-4 [&>button]:hidden">
          <DialogTitle className="sr-only">{name} images</DialogTitle>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-white">
            <Slide slide={current} body={body} name={name} sizes="90vw" />
            {arrows(true)}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>
              {current.kind === "art" ? current.colour.name : current.alt} · {index + 1}/{count}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">
              <X className="size-4" aria-hidden="true" /> Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Large car image in the selected paint, with round swatches. */
export function ColourPicker({ colours, body, name }: { colours: VehicleColour[]; body: string | null; name: string }) {
  const [i, setI] = useState(0);
  if (!colours.length) return null;
  const c = colours[i];
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-white px-6 pt-8 pb-4">
        <CarArt body={body} color={c.hex} title={`${name} in ${c.name} (illustration)`} className="mx-auto max-w-xl transition-all duration-500" />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-xl bg-white/90 px-3 py-2 shadow-sm">
            <span className="size-6 rounded-full border shadow-inner" style={{ background: c.hex }} />
            <div>
              <p className="text-sm font-semibold text-ink">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                Colour {i + 1} of {colours.length}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setI((i - 1 + colours.length) % colours.length)} aria-label="Previous colour" className="flex size-9 items-center justify-center rounded-full border bg-white hover:border-primary hover:text-primary">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setI((i + 1) % colours.length)} aria-label="Next colour" className="flex size-9 items-center justify-center rounded-full border bg-white hover:border-primary hover:text-primary">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div role="radiogroup" aria-label="Colours" className="mt-4 flex flex-wrap gap-4">
        {colours.map((col, idx) => (
          <button
            key={col.name}
            type="button"
            role="radio"
            aria-checked={idx === i}
            onClick={() => setI(idx)}
            className="group flex w-16 flex-col items-center gap-1.5 text-center"
          >
            <span
              className={cn(
                "size-10 rounded-full border-2 shadow-inner transition-transform group-hover:scale-110",
                idx === i ? "border-primary ring-2 ring-primary/30 ring-offset-2" : "border-white ring-1 ring-border",
              )}
              style={{ background: col.hex }}
            />
            <span className={cn("text-[11px] leading-tight", idx === i ? "font-semibold text-ink" : "text-muted-foreground")}>{col.name}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Colour shades are approximate. Check availability and the actual shade at the dealership.</p>
    </div>
  );
}
