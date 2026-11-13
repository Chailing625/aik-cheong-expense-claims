// Creates (or promotes) the one Super Admin account.
// Run it yourself in a terminal:   npm run create-superadmin
// It asks for your email and a password, and never prints or stores the password.
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase settings in .env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const ask = (q) => new Promise((r) => rl.question(q, r));
const askHidden = (q) =>
  new Promise((resolve) => {
    process.stdout.write(q);
    const stdin = process.stdin;
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode?.(false);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });

const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "superadmin");
if (count && count > 0) {
  console.log("A Super Admin already exists. Use the Staff Accounts page in the app to manage people.");
  process.exit(0);
}

const fullName = (await ask("Your name: ")).trim();
const email = (await ask("Your email: ")).trim().toLowerCase();
rl.pause();
const password = await askHidden("Choose a password (at least 8 characters): ");
const again = await askHidden("Type it again: ");
if (password.length < 8 || password !== again) {
  console.error("Passwords must match and be at least 8 characters. Nothing was created.");
  process.exit(1);
}

const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
if (created.error) {
  console.error("Could not create the account:", created.error.message);
  process.exit(1);
}
const { error } = await admin.from("profiles").update({ role: "superadmin", full_name: fullName, active: true }).eq("id", created.data.user.id);
if (error) {
  console.error("Account created but the role could not be set:", error.message);
  process.exit(1);
}
console.log(`\nDone. Sign in at http://localhost:3000/login with ${email}`);
process.exit(0);
