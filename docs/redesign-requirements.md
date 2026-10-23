# Redesign requirements (collecting — do not execute yet)

The user is listing requirements one by one and will say when to start.
Reference site: drivebloc.com (screenshots supplied by the user). Match its
look and flow; do not copy its name, logo or wording.

## 1. Home page hero (reference: DriveBloc home screenshot)

- **Header (white bar):**
  - Brand wordmark on the left, in red.
  - Nav: Home, Group Deals, New Cars, Buying Guides, Compare, News.
  - Right side: a Search box with a `/` keyboard-shortcut hint, a dark/light theme toggle, a language selector (English, …), and a red "Login" button with a user icon.
- **Full-width hero with a dark car photo background:**
  - A dark overlay over the photo; the hero fills most of the first screen.
  - A pill badge at the top: green dot + "Group buying for new cars in <region>".
  - A very large bold white headline, centred: "Buy Your New Car as a Group".
  - A green glowing pill with a percent-badge icon: "Save up to ₹20,000 – ₹60,000*".
  - A short red divider line.
  - A centred subheading: "Join other buyers who want the same car in your city. We take the group to authorised dealers and bring back their best offer."
- **Tabbed action card (white, centred, rounded):**
  - Tabs: GROUP DEALS / NEW CARS / COMPARE.
  - Group Deals tab: "Join a group for the car you want. More buyers, better dealer offer." and "Free to join. You decide whether to buy.", with a big red "See Open Groups" button.
  - The New Cars and Compare tabs need their own content (to be defined; likely a brand/model search and a two-car compare picker).
- **Trust row under the card:** green check icons for "Free to join", "You decide whether to buy" and "Buy direct from the dealer".
- **Footnote:** "*Estimated saving per car; the actual amount depends on the car, the dealer and how many buyers join."
- **Scroll-down chevron** at the bottom of the hero.
- **Colour direction:** red primary (buttons, brand, accents) with green for savings and checks, on dark and white backgrounds. This replaces the current green/navy theme.

### Open points to confirm before building

- **Hero photo:** the user must supply a licensed car photo (or approve a stock source). Photos can't be taken from DriveBloc, CarDekho or Cars24.
- **"Save up to ₹20,000–₹60,000" claim:** the current site only shows savings against a verified reference price. A fixed "save up to" figure needs a factual basis (or a clear "estimated" label, as in the reference) — confirm wording and source.
- **New pages implied by the nav:** Buying Guides, Compare and News don't exist yet. New Cars can map to the current vehicles page.
- **Extra header controls:** a language selector (which languages — Gujarati, Hindi?) and a dark mode.
- **Region text:** the reference says Maharashtra; the current launch city is Surat, Gujarat.
- **Two-wheelers:** the reference is cars-only. Keep the two-wheeler support and the brand-logo section that's already built?

## 2. "New Cars" listing page (reference: DriveBloc New Cars screenshot)

A full catalogue page listing every car, with filters. It's reached from "New Cars" in the header.

- **Header card:**
  - Breadcrumb (Home / New Cars).
  - Title "New Cars in India" and a count ("Showing 12+ new cars").
  - Right side: a "Search brand or model…" box and a City box.
- **Brand chip row:** logo + name pills (Honda, Hyundai, Kia, MG, Mahindra, Maruti Suzuki, Tata, Toyota, …). Clicking one filters by that brand.
- **Quick-filter chip row:** SUV, Hatchback, Sedan, 7-seater MUV, Under ₹5 Lakh, ₹5–10 Lakh, ₹10–15 Lakh, Automatic, CNG, Diesel, Electric, Hybrid.
- **Left sidebar "Filters" panel** with "Clear All". Checkbox groups (multi-select):
  - **Brand**
  - **Budget:** Under ₹5 L, ₹5–10 L, ₹10–15 L, ₹15–20 L, ₹20–30 L, Above ₹30 L
  - **Body type:** Sedan, SUV, Hatchback, MUV, Coupe, Convertible, Pickup, Minivan
  - **Fuel type:** Petrol, Diesel, Electric, Hybrid, CNG
  - **Transmission:** Manual, Automatic
  - On mobile, the sidebar becomes a slide-out filter drawer.
- **Results area:** "Sort by" dropdown (Popularity, Price low→high, Price high→low, Newest, Mileage).
- **Car cards (3 per row on desktop):**
  - A real car photo.
  - Wishlist (heart) and compare icons in the top-right corner.
  - Brand name in small caps, model name in bold.
  - Starting price in red: "₹7.50 Lakh ONWARDS".
  - A spec grid: fuel type, transmission, engine cc, mileage (kmpl).
  - Footer: "EMI from ₹12,310/mo" and a "View Details >" link.
  - Hover: the card lifts and the photo zooms.
- **Data has to be real and correct** for every car:
  - photos;
  - ex-showroom and on-road price;
  - variants, specifications and features;
  - mileage and EMI.
  - The user suggests pulling these from online sources (CarDekho, Cars24, maker sites).
- **"View Details" opens a car detail page** with full variant-wise prices (ex-showroom + on-road breakdown), specifications, features, a photo gallery and a "Join group" link for that car.

### Open points to confirm before building

- **Internet access:** this session's network blocks CarDekho, Cars24 and the maker websites, so nothing can be fetched yet. Two options:
  - the user allows those domains in the environment's network settings;
  - the user supplies the data (for example a spreadsheet of models, variants and prices).
- **Photos are copyrighted:** CarDekho/Cars24 images can't be copied onto the site. Licensed sources are:
  - maker press/media kits;
  - dealer-supplied photos;
  - the user's own photos;
  - a licensed stock service.
  Specs and ex-showroom prices are facts and can be used. Record the source and date for each price.
- **On-road price** depends on city (RTO tax, insurance, charges). Confirm it's for Surat only (or which cities) and who keeps prices updated (the admin panel already supports per-city prices).
- **EMI assumptions:** interest rate, tenure and down payment for "EMI from ₹…/mo" need to be fixed and shown as an estimate.
- **Wishlist and Compare icons:** they need a wishlist (saved cars, login required) and a Compare page (ties in with requirement #1's Compare tab).
- **Scope of the catalogue:** all cars sold in India, or a starting set (e.g. the top 30–50 models)? Two-wheelers too, with a matching "New Bikes" page?

## 3. Car detail ("product") page (reference: DriveBloc Bolero Neo screenshot)

Clicking any car card opens its own page (e.g. `/cars/mahindra-bolero-neo`).

- **Sticky section tab bar at the top:** Photos, Colours, Price/variants, On-road price, Specifications, Warranty, EMI, Questions. Clicking a tab scrolls to that section, and the active tab highlights while scrolling.
- **Main column (left, wide):**
  1. **Photo gallery:**
     - A large main image with left/right arrows, an "All photos (n)" button that opens a full-screen lightbox, and an image counter (e.g. 1/24).
     - A thumbnail strip below (exterior, interior, etc.), with a small "images are for illustration" note.
  2. **Colours:** "<Model> Colours (n)" with a large car image in the selected colour and the colour name. Round colour swatches switch the image; prev/next arrows.
  3. **One-line summary:** e.g. "The Mahindra Bolero Neo is a 7-seat body-on-frame SUV with a 1.5 mHawk100 diesel and a 5-speed manual."
  4. **Key highlights:** an icon grid of engine (cc), power (bhp), fuel, transmission, body type and seating.
  5. **Price list table:** every variant, with variant name, fuel, transmission, mileage, power and ex-showroom price ("Ex-showroom, check on-road"). The cheapest or recommended variant is highlighted. Clicking a row selects that variant for the sections below. A note says prices are indicative and the source/date are shown.
  6. **"Best price for <variant> in <city> this month" callout:** a red-bordered box with a "Check my price" button. This leads to joining the group or a lead form.
  7. **Specifications for the selected variant:** a two-column table:
     - ex-showroom price, fuel, engine, max power, max torque;
     - length, width, height, wheelbase, fuel tank;
     - body type, transmission, seating.
  8. **Features of the selected variant**, grouped into collapsible categories (Comfort, Exterior, Safety, Infotainment, …) with ticks.
  9. **Also implied by the tab bar:** an on-road price breakdown (ex-showroom + RTO + insurance + other charges, for the chosen city), warranty details, an EMI calculator (loan amount, rate and tenure sliders) and a Questions/FAQ section.
- **Right column (sticky sidebar):**
  - **Group deal card** (green), e.g. "Mahindra group deal open in <city> — n of 20 buyers joined…", with a progress bar and a green "Join the Group" button. It connects to the existing batch/join logic.
  - **"Interested in <model>?" lead card:**
    - "Tell us your details to get the best price in your city";
    - a red "Get On-Road Price" button, a "Book Test Drive" button and a "Call Me Back" button;
    - small "Car Loan" and "Insurance" links.
    - Each button opens a lead form (name, phone, city), which is stored and visible in the admin panel (and to dealers where relevant).
- **Mobile:** the sidebar moves below the gallery, or becomes a sticky bottom bar with "Join Group" / "Get Price".

### Open points to confirm before building

- **Data per car:** the gallery, colour images (one per colour), full variant price lists, specs, features and warranty all need real data and licensed images. See the access and copyright notes in #2.
- **Lead buttons:** "Get On-Road Price", "Book Test Drive", "Call Me Back", "Car Loan" and "Insurance" need a decision on who receives these leads (admin only, or forwarded to dealers) and how (dashboard, email, WhatsApp?).
- **Questions section:** fixed FAQs written by admin, or user-submitted Q&A with moderation?
- **Page URL scheme:** `/cars/<brand>-<model>` alongside the existing `/vehicles/<slug>`. The plan is to merge them into one.

## 4. …
(next requirement goes here)
