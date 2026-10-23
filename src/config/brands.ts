/**
 * Brands shown on the home page. `logo` points at a file in public/brands;
 * brands without one render as a coloured wordmark. Links search the vehicle
 * catalogue by brand name, so they keep working as listings are added.
 */
export type Brand = {
  name: string;
  /** Search term used on /vehicles (matches manufacturer names in the catalogue). */
  query: string;
  logo?: string;
  /** Wordmark colour when there is no logo file. */
  color: string;
  /** Wordmark text when there is no logo file; defaults to the first word of the name. */
  wordmark?: string;
};

export const CAR_BRANDS: Brand[] = [
  { name: "Maruti Suzuki", query: "Maruti", logo: "/brands/suzuki.svg", color: "#E30613" },
  { name: "Hyundai", query: "Hyundai", logo: "/brands/hyundai.svg", color: "#002C5E" },
  { name: "Tata Motors", query: "Tata", logo: "/brands/tata.svg", color: "#486AAE" },
  { name: "Mahindra", query: "Mahindra", logo: "/brands/mahindra.svg", color: "#DD052B" },
  { name: "Toyota", query: "Toyota", logo: "/brands/toyota.svg", color: "#EB0A1E" },
  { name: "Kia", query: "Kia", logo: "/brands/kia.svg", color: "#05141F" },
  { name: "Honda Cars", query: "Honda", logo: "/brands/honda.svg", color: "#E40521" },
  { name: "MG Motor", query: "MG", logo: "/brands/mg.svg", color: "#FF0000" },
  { name: "Renault", query: "Renault", logo: "/brands/renault.svg", color: "#000000" },
  { name: "Nissan", query: "Nissan", logo: "/brands/nissan.svg", color: "#C3002F" },
  { name: "Volkswagen", query: "Volkswagen", logo: "/brands/volkswagen.svg", color: "#151F5D" },
  { name: "Skoda", query: "Skoda", logo: "/brands/skoda.svg", color: "#0E3A2F" },
  { name: "Citroën", query: "Citroen", logo: "/brands/citroen.svg", color: "#DA291C" },
  { name: "Jeep", query: "Jeep", logo: "/brands/jeep.svg", color: "#000000" },
  { name: "BYD", query: "BYD", color: "#C8102E" },
  { name: "Mercedes-Benz", query: "Mercedes", color: "#1F1F1F", wordmark: "Mercedes" },
  { name: "BMW", query: "BMW", logo: "/brands/bmw.svg", color: "#0066B1" },
  { name: "Audi", query: "Audi", logo: "/brands/audi.svg", color: "#BB0A30" },
  { name: "Volvo", query: "Volvo", logo: "/brands/volvo.svg", color: "#003057" },
  { name: "Porsche", query: "Porsche", logo: "/brands/porsche.svg", color: "#B12B28" },
  { name: "MINI", query: "MINI", logo: "/brands/mini.svg", color: "#000000" },
];

export const TWO_WHEELER_BRANDS: Brand[] = [
  { name: "Hero MotoCorp", query: "Hero", color: "#E2231A" },
  { name: "Honda", query: "Honda", logo: "/brands/honda.svg", color: "#E40521" },
  { name: "TVS Motor", query: "TVS", color: "#1C3F94" },
  { name: "Bajaj Auto", query: "Bajaj", color: "#0055A5" },
  { name: "Royal Enfield", query: "Royal Enfield", color: "#8C1D18", wordmark: "Royal Enfield" },
  { name: "Suzuki", query: "Suzuki", logo: "/brands/suzuki.svg", color: "#E30613" },
  { name: "Yamaha", query: "Yamaha", logo: "/brands/yamaha.svg", color: "#E60012" },
  { name: "Ola Electric", query: "Ola", color: "#111111" },
  { name: "Ather", query: "Ather", color: "#00A651" },
  { name: "KTM", query: "KTM", logo: "/brands/ktm.svg", color: "#FF6600" },
  { name: "Jawa", query: "Jawa", color: "#7A1F1F" },
  { name: "Kawasaki", query: "Kawasaki", color: "#4C9A2A" },
  { name: "Vespa", query: "Vespa", logo: "/brands/vespa.svg", color: "#5E8C7A" },
  { name: "Ducati", query: "Ducati", logo: "/brands/ducati.svg", color: "#CC0000" },
];
