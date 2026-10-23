"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FAQ_CATEGORIES } from "@/components/faq/faq-categories";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { saveContentPageAction, saveFaqAction, saveSettingAction } from "@/lib/actions/admin-ops";
import type { ActionResult } from "@/lib/errors";

function useSubmit() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message);
        after?.();
        router.refresh();
      } else toast.error(res.error);
    });
  return { pending, run };
}

export type FaqFormValues = {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  featured: boolean;
  vehicleId: string;
  slug: string;
};

export function FaqForm({ id, initial, vehicles }: { id: string | null; initial: FaqFormValues; vehicles: { id: string; name: string }[] }) {
  const [v, setV] = useState(initial);
  const { pending, run } = useSubmit();
  const categories = FAQ_CATEGORIES.some((c) => c.key === v.category) ? FAQ_CATEGORIES : [...FAQ_CATEGORIES, { key: v.category, label: v.category }];
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => saveFaqAction(id, v), () => !id && setV(initial)); }}>
      <FormField id={`faq-q-${id}`} label="Question">{(p) => <Input {...p} value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} />}</FormField>
      <FormField id={`faq-a-${id}`} label="Answer" hint="Supports **bold**, lists and [links](/page).">{(p) => <Textarea {...p} rows={4} value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} />}</FormField>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField id={`faq-c-${id}`} label="Category">
          {(p) => (
            <NativeSelect {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id={`faq-v-${id}`} label="Car (optional)" hint="Shows on that car's page only">
          {(p) => (
            <NativeSelect {...p} value={v.vehicleId} onChange={(e) => setV({ ...v, vehicleId: e.target.value })}>
              <option value="">General question</option>
              {vehicles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </NativeSelect>
          )}
        </FormField>
        <FormField id={`faq-slug-${id}`} label="Link anchor" hint="e.g. how-do-groups-close">{(p) => <Input {...p} value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} />}</FormField>
        <FormField id={`faq-s-${id}`} label="Sort order">{(p) => <Input {...p} type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />}</FormField>
      </div>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.isPublished} onChange={(e) => setV({ ...v, isPublished: e.target.checked })} /> Published</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={v.featured} onChange={(e) => setV({ ...v, featured: e.target.checked })} /> Show on home page</label>
      </div>
      <Button type="submit" size="sm" disabled={pending} className="justify-self-start">{id ? "Save" : "Add FAQ"}</Button>
    </form>
  );
}

export function ContentPageForm({ initial }: { initial: { slug: string; title: string; summary: string; body: string; requiresLegalReview: boolean; isPublished: boolean } }) {
  const [v, setV] = useState(initial);
  const { pending, run } = useSubmit();
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => saveContentPageAction(v)); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`cp-t-${v.slug}`} label="Title">{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</FormField>
        <FormField id={`cp-s-${v.slug}`} label="Summary">{(p) => <Input {...p} value={v.summary} onChange={(e) => setV({ ...v, summary: e.target.value })} />}</FormField>
      </div>
      <FormField id={`cp-b-${v.slug}`} label="Body (Markdown: ## headings, - lists, **bold**, [links](/path))">
        {(p) => <Textarea {...p} rows={14} className="font-mono text-sm" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />}
      </FormField>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><Checkbox checked={v.requiresLegalReview} onChange={(e) => setV({ ...v, requiresLegalReview: e.target.checked })} /> Show “requires legal review” notice</label>
        <label className="flex items-center gap-2"><Checkbox checked={v.isPublished} onChange={(e) => setV({ ...v, isPublished: e.target.checked })} /> Published</label>
      </div>
      <Button type="submit" size="sm" disabled={pending} className="justify-self-start">Save page</Button>
    </form>
  );
}

export function SettingForm({ settingKey, value, description }: { settingKey: string; value: unknown; description: string | null }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const { pending, run } = useSubmit();
  return (
    <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveSettingAction(settingKey, text)); }}>
      <FormField id={`set-${settingKey}`} label={settingKey} hint={description ?? undefined}>
        {(p) => <Textarea {...p} rows={Math.min(10, text.split("\n").length + 1)} className="font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} />}
      </FormField>
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="justify-self-start">Save</Button>
    </form>
  );
}
