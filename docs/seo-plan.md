# GroupDrive SEO plan (all-India)

## Done in the site (on-page + technical)

| Page | URL pattern | Title pattern | H1 |
|---|---|---|---|
| Home | `/` | GroupDrive: New Car & Bike Prices in India, Specs, Mileage & Group Deals | First hero slide |
| New cars | `/cars` | New Cars in India 2026 — Prices, Mileage, Specs & Images | New Cars in India |
| Brand | `/cars/{brand}` e.g. `/cars/maruti-suzuki` | {Brand} Cars Price List 2026 in India — New Models, Mileage & Specs | {Brand} Cars |
| Car model | `/cars/{brand}-{model}` e.g. `/cars/maruti-suzuki-brezza` | {Model} Price 2026, Mileage, Specs, Images & Variants | {Brand} {Model} |
| Bikes & scooters | `/vehicles?category=two_wheeler` | Bikes, Scooters & Cars in India — Prices, Mileage & Specs | New Bikes & Scooters in India |
| Bike/scooter model | `/vehicles/{brand}-{model}` | {Model} Price 2026, Mileage, Specs, Images & Variants | {Brand} {Model} |

- Meta descriptions are generated from live data (price range, number of variants, fuel types).
- Breadcrumbs are visible and also sent as BreadcrumbList structured data: Home › New Cars › {Brand} Cars › {Model}.
- Structured data: Organization and WebSite (sitelinks search box) on every page; Car or Product with AggregateOffer on model pages; ItemList on brand pages; FAQPage on home, brand, model and FAQ pages.
- Canonical URLs on every page; `sitemap.xml` covers models, brand pages and content pages; `robots.txt` blocks the dashboard, admin, dealer, API and auth routes.
- No page says the service is Surat-only. On-road estimates say they use Gujarat road-tax rates and that these differ by state.

## Next on-page work (highest value first)

1. **Real model photos.** Image search drives a large share of car traffic. Use photos you own or are licensed to use (for example, your Maruti Suzuki folder), with alt text like "Maruti Suzuki Brezza front three-quarter view".
2. **City price pages** such as `/cars/maruti-suzuki-brezza/on-road-price-in-mumbai`, for the top 20–30 cities. Each needs that state's real road-tax rates. Don't publish thin copies with only the city name changed, because Google treats those as doorway pages.
3. **Budget and body-type hubs** such as "Cars under 10 lakh", "Best SUVs under 15 lakh", "Electric cars in India" and "Best mileage bikes".
4. **Comparison pages** such as `/compare/maruti-suzuki-brezza-vs-hyundai-venue`, for the most-searched pairs.
5. **Original content**: buying guides, EMI and insurance explainers, and launch news. Ex-showroom prices alone can't beat CarDekho or CarWale; original content can.
6. **Two-wheeler URLs**: move to `/bikes/{brand}-{model}` and `/scooters/...` with 301 redirects from `/vehicles/...`. This is planned but not done yet.

## Off-page

- **Google Search Console and Bing Webmaster Tools**: verify the domain, submit `/sitemap.xml` and watch coverage. This should be done on the final custom domain, not the hostingersite.com preview domain.
- **Google Business Profile** for the registered office, with consistent name, address and phone (NAP) everywhere.
- **Citations**: JustDial, Sulekha, IndiaMART, Crunchbase, LinkedIn company page, and startup directories (YourStory, Inc42 listings).
- **Digital PR**: data stories from your own catalogue, for example "How much do group buyers save?" or "EV vs petrol cost of ownership by city". Pitch them to auto and finance journalists.
- **Community**: helpful answers on Team-BHP, Reddit (r/CarsIndia, r/IndianBikes) and Quora that link to useful pages, not the homepage.
- **YouTube and Instagram**: short videos on price breakdowns and group deals, with links back to the model pages.
- **Partnerships**: dealers, banks and NBFCs (EMI pages), and insurance partners. Each partner page linking back is a quality backlink.
- **Avoid** paid link schemes and PBNs. A penalty would cost far more than they gain.

## Measure

Track monthly: impressions and clicks by page type (Search Console), indexed pages, top 50 model keywords such as "{model} price" and "{model} on road price", referring domains, and leads per landing page.
