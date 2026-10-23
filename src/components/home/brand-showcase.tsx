"use client";

import { ArrowRight, Bike, Car } from "lucide-react";
import Link from "next/link";
import { BrandTile } from "@/components/home/brand-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CAR_BRANDS, TWO_WHEELER_BRANDS } from "@/config/brands";

export function BrandShowcase() {
  return (
    <Tabs defaultValue="car">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold tracking-widest text-primary uppercase">Shop by brand</p>
          <h2 id="brands-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Every major brand, one place
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Pick a brand to see its models and the buyer groups open for them.
          </p>
        </div>
        <TabsList className="self-start sm:self-auto">
          <TabsTrigger value="car">
            <Car className="size-4" aria-hidden="true" /> Cars
          </TabsTrigger>
          <TabsTrigger value="two_wheeler">
            <Bike className="size-4" aria-hidden="true" /> Two-wheelers
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="car" className="mt-8">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-4 lg:grid-cols-7">
          {CAR_BRANDS.map((b) => (
            <BrandTile key={b.name} brand={b} category="car" />
          ))}
        </div>
        <ViewAll href="/cars" label="View all cars" />
      </TabsContent>
      <TabsContent value="two_wheeler" className="mt-8">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-4 lg:grid-cols-7">
          {TWO_WHEELER_BRANDS.map((b) => (
            <BrandTile key={b.name} brand={b} category="two_wheeler" />
          ))}
        </div>
        <ViewAll href="/vehicles?category=two_wheeler" label="View all two-wheelers" />
      </TabsContent>
    </Tabs>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-6 text-center">
      <Link
        href={href}
        className="group inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline"
      >
        {label}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </div>
  );
}
