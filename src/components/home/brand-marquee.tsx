import { BrandMark } from "@/components/home/brand-tile";
import { CAR_BRANDS, TWO_WHEELER_BRANDS } from "@/config/brands";

/** Continuously scrolling strip of brand marks; pauses on hover. */
export function BrandMarquee() {
  const seen = new Set<string>();
  const brands = [...CAR_BRANDS, ...TWO_WHEELER_BRANDS].filter((b) => {
    const key = b.logo ?? b.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <div className="group relative overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul className="animate-marquee flex w-max items-center gap-12 group-hover:[animation-play-state:paused]">
        {[...brands, ...brands].map((b, i) => (
          <li
            key={`${b.name}-${i}`}
            className="flex h-12 items-center opacity-60 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0"
            aria-hidden={i >= brands.length}
          >
            <BrandMark brand={b} className="whitespace-nowrap sm:h-10 sm:w-20" />
            <span className="sr-only">{b.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
