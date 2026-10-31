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

export const DEFAULT_PAGES: Record<string, DefaultContent> = {
  about: {
    slug: "about",
    title: `About ${name}`,
    summary: `${name} helps car, bike and scooter buyers across India compare prices and specifications, and team up with others who want the same vehicle so authorised dealerships respond with clearer, itemised quotations.`,
    requiresLegalReview: false,
    body: `## Why we exist

Buying a car or two-wheeler in India usually means visiting dealerships one at a time, collecting quotations in different formats and trying to work out what is actually included. ${name} brings together buyers who want the **same model and variant** in the same city, so dealerships can respond to a group of verified, local buyers with an itemised quotation.

## What we do

- Publish ex-showroom prices, variants and specifications for new cars, bikes and scooters sold in India.
- Organise free buyer groups for specific vehicle variants, city by city.
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

Prices, specifications and comparisons on ${name} cover new cars, bikes and scooters sold across India. Group deals open city by city as enough buyers join for the same model.`,
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
    summary: "What personal data we collect, why we collect it, who can see it and the choices you have.",
    requiresLegalReview: false,
    body: `This Privacy Policy explains how ${name} ("${name}", "we", "us") collects, uses, shares and protects personal data when you use this website and its services (the "Service"). It is written to meet the Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information Technology Act, 2000 and the rules made under them.

## 1. Data we collect

**Data you give us**

- **Account details:** name, email address, mobile number, city, preferred vehicle category and expected purchase timeline.
- **Enquiries:** details you submit in a price, test-drive, call-back, loan or insurance request, or through the contact form (name, phone, email, city, the vehicle you are interested in and your message).
- **Group activity:** the buying groups you join, eligibility and verification status, buying-intent responses, enquiries you send to dealerships, bookings and purchase confirmations.

**Data collected automatically**

- **Essential cookies** that keep you signed in and protect forms from abuse. We do not use advertising or cross-site tracking cookies.
- **Security and server logs** such as IP address, browser type and request time, used to keep the Service secure and to stop spam and fraud.

We do **not** collect payment card details, Aadhaar numbers or other government identifiers.

## 2. Why we use your data

| Purpose | Legal basis |
|---|---|
| Creating and securing your account | Your consent and the legitimate use of providing the service you asked for |
| Answering an enquiry or arranging a call-back | Your consent when you submit the form |
| Running buying groups (counting verified members, closing groups, requesting quotations) | Your consent when you join a group |
| Sharing your details with a dealership you choose to contact | Your explicit consent each time you send an enquiry |
| Service notifications (group updates, quotation published) | Your consent; you can turn optional notifications off |
| Preventing fraud, spam and misuse | Legitimate use for security, and compliance with law |
| Meeting legal obligations | Compliance with applicable law |

We never sell your personal data, and we do not use it for third-party advertising.

## 3. Who can see your data

- **Other members** of a group never see your name, phone number or email address.
- **Dealerships** see only the details included in an enquiry **you** choose to send them, and use them to contact you about that purchase.
- **Our team** sees the data needed to run the Service; sensitive actions are logged.
- **Service providers** that host or operate the Service for us (database and authentication hosting, email and SMS delivery, website hosting) process data only on our instructions.
- **Authorities**, where disclosure is required by law or to protect rights, safety or the Service.

## 4. How long we keep it

- Account data: while your account is active, and deleted or anonymised within 90 days of a verified deletion request, unless we must keep it longer by law.
- Enquiries and contact messages: up to 24 months, then deleted.
- Records of verified sales and commissions: as long as tax and accounting law requires.
- Security logs: up to 12 months.

## 5. How we protect it

Data is stored with access controls that let each person see only their own records, encrypted in transit (HTTPS) and at rest by our hosting providers. Uploaded documents are private and shared only through short-lived links. No system is perfectly secure; if a personal data breach affects you, we will notify you and the Data Protection Board of India as the DPDP Act requires.

## 6. Your rights

Under the DPDP Act you can:

- **Access** a summary of the personal data we hold about you and how it is processed;
- **Correct, complete or update** inaccurate data (most profile fields can be edited in your dashboard);
- **Erase** your data, subject to legal retention obligations;
- **Withdraw consent** at any time; this does not affect processing done before withdrawal;
- **Nominate** another person to exercise your rights in case of death or incapacity;
- **Raise a grievance** with us, and if unresolved, with the Data Protection Board of India.

Email us at ${siteConfig.contact.email} from the address linked to your account. We respond within 30 days.

## 7. Children

The Service is meant for adults. We do not knowingly collect data from anyone under 18. If you believe a child has given us personal data, contact us and we will delete it.

## 8. Links to other websites

Manufacturer, dealership and lender websites linked from the Service have their own privacy policies; we are not responsible for their practices.

## 9. Grievance officer

Questions, requests or complaints about personal data: **Grievance Officer, ${name}** — ${siteConfig.contact.email}, ${siteConfig.contact.address}. We acknowledge grievances within 48 hours and aim to resolve them within 30 days.

## 10. Changes to this policy

We may update this policy as the Service or the law changes. The "last updated" date shows the latest version; material changes will be announced on the website before they take effect.`,
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    summary: "The terms that apply when you browse the website, create an account, send an enquiry or join a buying group.",
    requiresLegalReview: false,
    body: `These Terms & Conditions ("Terms") govern your use of the ${name} website and services (the "Service"). By using the Service you agree to these Terms and to our [Privacy Policy](/privacy). If you do not agree, please do not use the Service.

## 1. What ${name} is — and is not

${name} publishes new car, bike and scooter prices, variants and specifications, and organises free buyer groups so authorised dealerships can quote for several buyers who want the same vehicle. ${name} **is not** a vehicle manufacturer, dealer, seller, lender, insurer or broker. Every purchase is made directly between you and a dealership.

## 2. Eligibility and accounts

- You must be at least 18 years old and able to enter a binding contract under Indian law.
- Give accurate, current information and keep it up to date. One account per person.
- Keep your password confidential; you are responsible for activity under your account. Tell us immediately at ${siteConfig.contact.email} if you suspect misuse.

## 3. Prices, specifications and content

Prices on the Service are **indicative ex-showroom prices** taken from manufacturers' official sources on the date shown. On-road estimates are approximate and use sample tax rates. Specifications, features, colours and images are provided for information and may change without notice. Always confirm the final price, specifications and availability with the dealership before paying. See our [Disclaimer](/disclaimer).

## 4. Buying groups

- Joining a group is free and does not oblige you to buy.
- A group reaching its target does **not** guarantee a quotation, a discount, stock or a purchase. Dealerships decide whether and what to quote.
- Published quotations come from dealerships and are reviewed by us for completeness and consistency; they remain subject to the dealership's confirmation and validity date.
- We may verify members (for example by mobile number) and remove duplicate, inactive or ineligible memberships so group sizes reflect real buyers.

## 5. Enquiries and dealerships

When you send an enquiry or request a call-back, you agree that we may share the details in that request with the relevant dealership or partner so they can contact you about it. Dealerships are independent businesses responsible for their own offers, quotations, vehicles, documentation and conduct.

## 6. Fees and commission

The Service is free for buyers. Dealerships may pay ${name} a commission after a verified completed sale under a written agreement. This never adds to the price a dealership quotes you.

## 7. Acceptable use

You agree not to:

- submit false, misleading or someone else's information, or create fake or multiple accounts;
- scrape, copy or republish content or data from the Service in bulk, or interfere with its security or operation;
- use the Service to send spam, harass anyone or break any law;
- reverse-engineer, overload or attempt unauthorised access to the Service.

We may suspend or close accounts that break these Terms.

## 8. Intellectual property

The ${name} name, logo, design, text, compilation of data and software belong to ${name} or its licensors. Manufacturer names, logos and vehicle images belong to their respective owners and are used for identification and information only. You may view and share pages for personal, non-commercial use.

## 9. Limitation of liability

The Service is provided "as is". To the fullest extent permitted by law, ${name} is not liable for: the acts, omissions, offers or vehicles of dealerships, lenders or insurers; any difference between information on the Service and the final price or specification; or indirect or consequential losses arising from your use of the Service or your purchase decisions. Nothing in these Terms limits liability that cannot be limited under Indian law.

## 10. Indemnity

You agree to indemnify ${name} against claims arising from your breach of these Terms or misuse of the Service.

## 11. Changes and termination

We may change the Service or these Terms. Material changes will be announced on the website, and continued use after they take effect means you accept them. You may close your account at any time.

## 12. Governing law and disputes

These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts at Surat, Gujarat. Before going to court, please contact us at ${siteConfig.contact.email} so we can try to resolve the issue.`,
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    summary: "Important limitations on prices, specifications, images, EMI estimates, quotations and savings shown on the website.",
    requiresLegalReview: false,
    body: `The information on ${name} is published in good faith to help you research and compare new vehicles. Please read the points below before relying on it.

## Prices

- **Ex-showroom prices are indicative.** They are collected from manufacturers' official websites and price lists, shown with the date we last checked them, and can change at any time. They are not offers to sell.
- **On-road prices are estimates.** They add sample road tax, registration, insurance and handling charges. Actual road tax and registration charges differ by state, city, vehicle type and owner, and insurance premiums depend on the insurer and add-ons chosen.
- The dealership confirms the final on-road price, offers, discounts and availability.

## Specifications, features and colours

Specifications, mileage or range figures, features and colours come from manufacturers' published information. Claimed mileage and range are test-cycle figures; real-world results vary with driving conditions, load and maintenance. Manufacturers may revise specifications without notice — confirm the details of the exact variant with the dealership before booking.

## Images

Vehicle images are for illustration. They may show optional accessories, different variants or colours, or markets other than India. Where no approved photograph is available, a labelled illustration is shown instead.

## EMI and loan estimates

EMI figures use the default down payment, interest rate and tenure stated beside them. They are not loan offers. Your lender decides eligibility, rate, fees and tenure.

## Quotations and savings

- Quotations are provided by independent dealerships. ${name} reviews them before publishing but does not guarantee them.
- Joining a group does not guarantee a discount, a quotation or a purchase. Any saving shown is an estimate and depends on the vehicle, the dealership and how many buyers join.

## Third-party websites and trademarks

Links to manufacturer, dealership, lender or other websites are provided for convenience; we are not responsible for their content. Brand names, logos and trademarks belong to their respective owners and are used only to identify their products. ${name} is not affiliated with or endorsed by any manufacturer unless stated.

## Report an error

Spotted an incorrect price or specification? Email ${siteConfig.contact.email} and we will check and correct it.`,
  },
};
