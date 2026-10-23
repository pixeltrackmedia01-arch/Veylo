"use client";

import { Link2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/shared/markdown";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqFeedbackAction } from "@/lib/actions/cars";

export interface FaqItem {
  /** Database id; generated questions have none and skip feedback. */
  id?: string;
  anchor: string;
  question: string;
  answer: string;
}

function clientKey() {
  try {
    let key = window.localStorage.getItem("gd-client");
    if (!key) {
      key = crypto.randomUUID();
      window.localStorage.setItem("gd-client", key);
    }
    return key;
  } catch {
    return "anonymous";
  }
}

function Feedback({ id }: { id: string }) {
  const [voted, setVoted] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  if (voted !== null) return <p className="text-xs text-muted-foreground">Thanks for your feedback.</p>;
  const vote = (helpful: boolean) =>
    start(async () => {
      const res = await faqFeedbackAction(id, helpful, clientKey());
      if (res.ok) setVoted(helpful);
      else toast.error(res.error);
    });
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      Was this helpful?
      <button type="button" disabled={pending} onClick={() => vote(true)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 hover:border-emerald-500 hover:text-emerald-700">
        <ThumbsUp className="size-3.5" aria-hidden="true" /> Yes
      </button>
      <button type="button" disabled={pending} onClick={() => vote(false)} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 hover:border-primary hover:text-primary">
        <ThumbsDown className="size-3.5" aria-hidden="true" /> No
      </button>
    </div>
  );
}

/** Accordion of questions with deep links (#anchor), copy-link and optional helpful votes. */
export function FaqList({ items, feedback = true, className }: { items: FaqItem[]; feedback?: boolean; className?: string }) {
  const [open, setOpen] = useState<string>("");

  // Open the question named in the URL hash (e.g. /faq#how-do-groups-close).
  useEffect(() => {
    const sync = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash && items.some((i) => i.anchor === hash)) {
        setOpen(hash);
        requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [items]);

  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen} className={className}>
      {items.map((f) => (
        <AccordionItem key={f.anchor} value={f.anchor} id={f.anchor} className="scroll-mt-32">
          <AccordionTrigger>{f.question}</AccordionTrigger>
          <AccordionContent>
            <Markdown source={f.answer} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {feedback && f.id ? <Feedback id={f.id} /> : <span />}
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}${window.location.pathname}#${f.anchor}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  } catch {
                    window.location.hash = f.anchor;
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                <Link2 className="size-3.5" aria-hidden="true" /> Copy link
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
