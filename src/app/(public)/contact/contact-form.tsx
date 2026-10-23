"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { submitContactAction } from "@/lib/actions/public";
import { contactSchema, type ContactInput } from "@/lib/validation/schemas";

export function ContactForm() {
  const form = useForm<ContactInput>({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", phone: "", subject: "", message: "", website: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ContactInput) {
    const res = await submitContactAction(values);
    if (res.ok) {
      toast.success(res.message);
      form.reset();
    } else toast.error(res.error);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="name" label="Name" required error={errors.name?.message}>
          {(p) => <Input {...p} autoComplete="name" {...form.register("name")} />}
        </FormField>
        <FormField id="email" label="Email" required error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
        </FormField>
      </div>
      <FormField id="phone" label="Mobile (optional)" error={errors.phone?.message}>
        {(p) => <Input {...p} type="tel" autoComplete="tel" {...form.register("phone")} />}
      </FormField>
      <FormField id="subject" label="Subject" required error={errors.subject?.message}>
        {(p) => <Input {...p} {...form.register("subject")} />}
      </FormField>
      <FormField id="message" label="Message" required error={errors.message?.message}>
        {(p) => <Textarea {...p} rows={6} {...form.register("message")} />}
      </FormField>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        Send message
      </Button>
    </form>
  );
}
