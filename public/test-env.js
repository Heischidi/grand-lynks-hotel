const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

console.log("🔍 Environment Variables Check:");
console.log(
  "All environment variables:",
  Object.keys(process.env).filter((key) => key.includes("SUPABASE"))
);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log(
  "SUPABASE_KEY:",
  process.env.SUPABASE_KEY
    ? process.env.SUPABASE_KEY.substring(0, 20) + "..."
    : "undefined"
);
console.log(
  "SUPABASE_URL length:",
  process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0
);
console.log(
  "SUPABASE_KEY length:",
  process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0
);
