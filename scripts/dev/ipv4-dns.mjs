// Local development helper: resolve hostnames over IPv4 only.
// Some networks let IPv6 (AAAA) DNS queries time out, which makes Node's fetch
// to Supabase fail with UND_ERR_CONNECT_TIMEOUT about half the time.
// Loaded by `npm run dev` (Next passes the --import flag on to its worker processes).
// Development only: `npm run build` / `npm start` do not load it.
import dns from "node:dns";

const original = dns.lookup;
dns.lookup = function lookup(hostname, options, callback) {
  if (typeof options === "function") return original.call(dns, hostname, { family: 4 }, options);
  if (typeof options === "number") return original.call(dns, hostname, { family: 4 }, callback);
  return original.call(dns, hostname, { ...options, family: 4 }, callback);
};

