const fs = require("fs");
const path = require("path");

console.log("🔍 === ENVIRONMENT DEBUGGING ===");

// Check if .env file exists
const envPath = path.resolve(__dirname, ".env");
console.log("1. .env file path:", envPath);
console.log("2. .env file exists:", fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  // Read the raw contents
  const rawContent = fs.readFileSync(envPath, "utf8");
  console.log("3. .env file size:", rawContent.length, "characters");
  console.log("4. .env file content (first 200 chars):");
  console.log("---START---");
  console.log(rawContent.substring(0, 200));
  console.log("---END---");

  // Check for common issues
  const lines = rawContent.split("\n");
  console.log("5. Number of lines:", lines.length);

  // Look for Supabase variables
  const supabaseLines = lines.filter((line) => line.includes("SUPABASE"));
  console.log("6. Lines containing 'SUPABASE':", supabaseLines.length);
  supabaseLines.forEach((line, i) => {
    console.log(`   Line ${i + 1}: "${line}"`);
  });

  // Check for hidden characters
  const hasHiddenChars = /[\u0000-\u001F\u007F-\u009F]/.test(rawContent);
  console.log("7. Contains hidden characters:", hasHiddenChars);
}

// Now try to load with dotenv
console.log("\n8. === DOTENV LOADING ===");
require("dotenv").config();

// Check what was loaded
const allEnvVars = Object.keys(process.env);
const supabaseVars = allEnvVars.filter((key) => key.includes("SUPABASE"));
console.log("9. Total environment variables:", allEnvVars.length);
console.log("10. Supabase variables found:", supabaseVars);
console.log("11. SUPABASE_URL:", process.env.SUPABASE_URL ? "SET" : "NOT SET");
console.log("12. SUPABASE_KEY:", process.env.SUPABASE_KEY ? "SET" : "NOT SET");
