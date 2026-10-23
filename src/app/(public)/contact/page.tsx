import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { getPublicSetting } from "@/lib/data/catalogue";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with the GroupDrive team in Surat.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const contact = await getPublicSetting("contact.public", { ...siteConfig.contact });
  return (
    <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h1 className="text-4xl font-extrabold">Contact us</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Questions about a group, a quotation or your account? Dealerships interested in partnering are welcome too.
        </p>
        <ul className="mt-8 space-y-4 text-[15px]">
          {contact.email ? (
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <a href={`mailto:${contact.email}`} className="font-medium text-ink hover:underline">
                {contact.email}
              </a>
            </li>
          ) : null}
          {contact.phone ? (
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <a href={`tel:${contact.phone}`} className="font-medium text-ink hover:underline">
                {contact.phone}
              </a>
            </li>
          ) : null}
          <li className="flex gap-3">
            <MapPin className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <span>{contact.address}</span>
          </li>
          <li className="flex gap-3">
            <Clock className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <span>{contact.hours}</span>
          </li>
        </ul>
      </div>
      <div className="rounded-3xl border bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h2 className="text-xl font-bold">Send us a message</h2>
        <div className="mt-5">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
