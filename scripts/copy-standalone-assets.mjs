// A standalone Next.js build (which Hostinger's Node.js builder produces) does
// not include `public/` or `.next/static/`; without them the server returns 404
// for every stylesheet, script and image. Copy them in when standalone output exists.
import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";

if (existsSync(standalone)) {
  cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
  if (existsSync("public")) cpSync("public", `${standalone}/public`, { recursive: true });
  console.log("Copied static assets into standalone output.");
}
