import { siteConfig } from "@/config/site";

/**
 * Default copy for content pages. Admins can override any of these from
 * Admin → Content (stored in public.content_pages). Legal pages are marked as
 * requiring professional review and must be checked by a qualified Indian
 * lawyer before launch.
 */
export interface DefaultContent {
  slug: string;
  title: string;
  summary: string;
  body: string;
  requiresLegalReview: boolean;
}

const name = siteConfig.name;
const city = siteConfig.launchCity.name;

export const DEFAULT_PAGES: Record<string, DefaultContent> = {
  about: {
    slug: "about",
    title: `About ${name}`,
    summary: `${name} helps people in ${city} who want the same vehicle come together, so authorised dealerships can respond with clearer, itemised quotations.`,
    requiresLegalReview: false,
    body: `## Why we exist

Buying a car or two-wheeler usually means visiting dealerships one at a time, collecting quotations in different formats and trying to work out what is actually included. ${name} brings together buyers who want the **same model and variant** in the same city, so dealerships can respond to a group of verified, local buyers with an itemised quotation.

## What we do

- Organise free buyer groups for specific vehicle variants in ${city}.
- Verify participants so group sizes reflect real, local buyers.
- Request itemised quotations from authorised dealerships once a group closes.
- Review every quotation before publishing it to participants.
- Record completed sales only after verification.

## What we don't do

- We don't sell vehicles. You buy directly from an authorised dealership.
- We don't charge customers anything — no registration or joining fee.
- We don't promise discounts. Dealers decide what to offer.
- We don't publish fabricated prices, quotes, savings, testimonials or sales figures.

## How we earn money

Dealerships may pay ${name} a commission after a **verified completed sale**, under a written agreement with that dealership. Commission terms are agreed per dealership and never charged to you.

## Where we operate

We are starting in ${city}, ${siteConfig.launchCity.state}. The platform is built to add more cities over time.`,
  },
  "how-it-works": {
    slug: "how-it-works",
    title: "How it works",
    summary: "From choosing a variant to buying directly from the dealership — step by step.",
    requiresLegalReview: false,
    body: "",
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "How we collect, use and protect your personal data.",
    requiresLegalReview: true,
    body: `*This policy is a working draft and must be reviewed by a qualified legal professional, including for compliance with the Digital Personal Data Protection Act, 2023 and applicable rules, before launch.*

## Who we are

${siteConfig.legalEntity} ("${name}", "we") operates this website.

## What we collect

- **Account details:** full name, email address, mobile number, city, preferred vehicle category and expected purchase timeline.
- **Group activity:** groups you join, verification status, buying-intent responses, enquiries, bookings and purchase confirmations.
- **Technical data:** session cookies required to keep you signed in, and basic security logs (such as IP address) used to prevent abuse.

We collect only what we need to run buyer groups. We do not collect payment card details.

## How we use it

- To create and secure your account and verify your eligibility.
- To count verified participants and run group closures.
- To send service notifications you can manage in your dashboard.
- To share your contact details with a dealership **only when you choose to send that dealership an enquiry**.
- To verify completed sales with the dealership involved.

## Who can see your data

- Other participants never see your name, phone number or email address.
- Dealerships see only the details you share in an enquiry you send them.
- Authorised ${name} staff can access data needed to operate the service; sensitive actions are audit-logged.

## Storage and security

Data is stored with our infrastructure provider (Supabase) with row-level access controls. Uploaded documents are stored privately and shared through short-lived links.

## Your choices and rights

You can update your profile and notification preferences in your dashboard, leave open groups, and ask us to access, correct or delete your data by contacting us.

## Contact

Questions about privacy: ${siteConfig.contact.email}.`,
  },
  terms: {
    slug: "terms",
    title: "Terms of Use",
    summary: "The rules for using the platform.",
    requiresLegalReview: true,
    body: `*These terms are a working draft and must be reviewed by a qualified legal professional before launch.*

## The service

${name} organises free buyer groups and coordinates quotations from authorised dealerships. ${name} is not a seller, dealer, lender or insurer of vehicles.

## No fees for customers

Creating an account and joining a group is free. ${name} does not charge customers a registration or joining fee.

## No guarantee

Joining a group, or a group reaching its target, does not guarantee a quotation, a discount, availability or a purchase. Dealerships decide whether and what to quote.

## Your purchase

Any purchase is a contract between you and the dealership. The final on-road price, offers, stock, financing, insurance, registration and delivery are confirmed by the dealership. Review all documents carefully before paying a dealership.

## Your account

Provide accurate information, keep your password secure, and use one account per person. We may suspend accounts that provide false information, create duplicate memberships or misuse the platform.

## Quotations

Published quotations are provided by dealerships and reviewed by us for completeness and consistency. They remain subject to the dealership's confirmation and the validity date shown.

## Commission

Dealerships may pay ${name} a commission after a verified completed sale. This does not change the price the dealership quotes you.

## Liability

To the extent permitted by law, ${name} is not liable for the acts or omissions of dealerships, or for losses arising from your purchase decisions.

## Changes

We may update these terms. Material changes will be announced on the website.`,
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    summary: "Important limitations on prices, quotations and savings.",
    requiresLegalReview: true,
    body: `*This disclaimer is a working draft and must be reviewed by a qualified legal professional before launch.*

- **Prices are indicative.** Reference prices are shown with their source and verification date and may be outdated. They are not offers.
- **Quotations come from dealerships.** ${name} reviews them before publication, but the dealership confirms the final on-road price, offers, stock, financing, insurance, registration and delivery.
- **No guaranteed savings.** We show a saving only when a verified reference price for the same variant and city and a valid published quotation can be compared like-for-like.
- **No purchase obligation.** Joining a group never commits you to buy.
- **Demo data.** During development and testing, some vehicles, prices, dealers and quotations are clearly labelled as demo data. They are illustrative and not real.
- **Images.** Where an approved photograph is not available, illustrated placeholders are used and labelled.`,
  },
};
