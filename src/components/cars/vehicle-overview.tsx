import Link from "next/link";
import type { OverviewSection } from "@/lib/vehicle-overview";

/** "About the <model>" long-form section with contextual internal links. */
export function VehicleOverview({ id = "overview", title, sections }: { id?: string; title: string; sections: OverviewSection[] }) {
  if (!sections.length) return null;
  return (
    <section id={id} className="scroll-mt-32 rounded-2xl border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      <div className="mt-4 space-y-5">
        {sections.map((s) => (
          <div key={s.heading}>
            <h3 className="font-semibold text-ink">{s.heading}</h3>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-1.5 text-sm leading-6 text-foreground/80">
                {p.map((seg, j) =>
                  typeof seg === "string" ? (
                    seg
                  ) : (
                    <Link key={j} href={seg.href} className="font-medium text-primary hover:underline">
                      {seg.text}
                    </Link>
                  ),
                )}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
