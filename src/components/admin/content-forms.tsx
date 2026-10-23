"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
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

export function FaqForm({ id, initial }: { id: string | null; initial: { question: string; answer: string; category: string; sortOrder: number; isPublished: boolean } }) {
  const [v, setV] = useState(initial);
  const { pending, run } = useSubmit();
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => saveFaqAction(id, v), () => !id && setV(initial)); }}>
      <FormField id={`faq-q-${id}`} label="Question">{(p) => <Input {...p} value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} />}</FormField>
      <FormField id={`faq-a-${id}`} label="Answer">{(p) => <Textarea {...p} rows={3} value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} />}</FormField>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField id={`faq-c-${id}`} label="Category">{(p) => <Input {...p} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />}</FormField>
        <FormField id={`faq-s-${id}`} label="Sort order">{(p) => <Input {...p} type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} />}</FormField>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><Checkbox checked={v.isPublished} onChange={(e) => setV({ ...v, isPublished: e.target.checked })} /> Published</label>
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
