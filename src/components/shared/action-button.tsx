"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";

export interface ActionInput {
  reason?: string;
  value?: string;
}

interface ActionButtonProps extends Omit<ButtonProps, "onClick" | "action"> {
  action: (input: ActionInput) => Promise<ActionResult<unknown>>;
  children: ReactNode;
  /** Ask for confirmation before running. */
  confirm?: { title: string; description?: ReactNode; confirmLabel?: string; destructive?: boolean };
  /** Collect a mandatory reason (e.g. audit trail) before running. */
  reason?: { label: string; placeholder?: string; minLength?: number; optional?: boolean };
  /** Collect a single extra value (e.g. a date or amount). */
  valueField?: { label: string; type?: "text" | "number" | "date" | "datetime-local"; required?: boolean; hint?: string };
  successMessage?: string;
  onSuccess?: () => void;
}

/**
 * Runs a Server Action from a button with optional confirmation, reason
 * capture, pending state and toast feedback. Authorisation is always enforced
 * by the action on the server.
 */
export function ActionButton({
  action,
  children,
  confirm,
  reason,
  valueField,
  successMessage,
  onSuccess,
  disabled,
  ...buttonProps
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [value, setValue] = useState("");
  const router = useRouter();
  const reasonId = useId();
  const valueId = useId();
  const needsDialog = Boolean(confirm || reason || valueField);
  const minLength = reason?.optional ? 0 : (reason?.minLength ?? 5);

  function run() {
    startTransition(async () => {
      const result = await action({ reason: reasonText.trim() || undefined, value: value || undefined });
      if (result.ok) {
        toast.success(result.message ?? successMessage ?? "Done");
        setOpen(false);
        setReasonText("");
        setValue("");
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const canSubmit =
    (!reason || reasonText.trim().length >= minLength) && (!valueField || !valueField.required || value.length > 0);

  return (
    <>
      <Button {...buttonProps} disabled={disabled || pending} onClick={() => (needsDialog ? setOpen(true) : run())}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </Button>
      {needsDialog ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm?.title ?? (typeof children === "string" ? children : "Confirm")}</DialogTitle>
              {confirm?.description ? <DialogDescription>{confirm.description}</DialogDescription> : null}
            </DialogHeader>
            {valueField ? (
              <div className="grid gap-1.5">
                <Label htmlFor={valueId}>{valueField.label}</Label>
                <Input id={valueId} type={valueField.type ?? "text"} value={value} onChange={(e) => setValue(e.target.value)} />
                {valueField.hint ? <p className="text-xs text-muted-foreground">{valueField.hint}</p> : null}
              </div>
            ) : null}
            {reason ? (
              <div className="grid gap-1.5">
                <Label htmlFor={reasonId}>{reason.label}</Label>
                <Textarea
                  id={reasonId}
                  value={reasonText}
                  placeholder={reason.placeholder}
                  onChange={(e) => setReasonText(e.target.value)}
                  maxLength={1000}
                />
                {!reason.optional ? (
                  <p className="text-xs text-muted-foreground">Recorded in the audit log. Minimum {minLength} characters.</p>
                ) : null}
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant={confirm?.destructive ? "destructive" : "default"} onClick={run} disabled={pending || !canSubmit}>
                {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
                {confirm?.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
