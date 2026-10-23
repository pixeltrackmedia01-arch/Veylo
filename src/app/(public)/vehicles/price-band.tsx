"use client";

import { useState } from "react";
import { NativeSelect } from "@/components/ui/input";

export function PriceBandClient({ value, bands }: { value: string; bands: { label: string; min: string; max: string }[] }) {
  const [selected, setSelected] = useState(bands.find((b) => `${b.min}-${b.max}` === value) ?? bands[0]);
  return (
    <>
      <NativeSelect
        id="price"
        value={`${selected.min}-${selected.max}`}
        onChange={(e) => setSelected(bands.find((b) => `${b.min}-${b.max}` === e.target.value) ?? bands[0])}
      >
        {bands.map((b) => (
          <option key={b.label} value={`${b.min}-${b.max}`}>
            {b.label}
          </option>
        ))}
      </NativeSelect>
      {selected.min ? <input type="hidden" name="min" value={selected.min} /> : null}
      {selected.max ? <input type="hidden" name="max" value={selected.max} /> : null}
    </>
  );
}
