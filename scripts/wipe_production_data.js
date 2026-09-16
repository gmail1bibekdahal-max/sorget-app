/**
 * Sorget — Production-Safe Supabase Data Wipe CLI
 * File: scripts/wipe_production_data.js
 *
 * Description:
 * Connects to live Supabase using the service role key and audits or deletes
 * all application data and Auth users in strict topological foreign-key order.
 *
 * USAGE:
 * 1. Audit / Dry-Run (safe, no data modified):
 *    node scripts/wipe_production_data.js --dry-run
 *
 * 2. Execute Data Wipe (irreversible, requires explicit --confirm flag):
 *    node scripts/wipe_production_data.js --confirm
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vvpgkijytjxqmydkyrzt.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from .env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Strict topological deletion order (leaf tables first -> root tables last)
const TABLES_IN_DELETION_ORDER = [
  "webhook_deliveries",
  "crm_sync_log",
  "invoices",
  "early_access",
  "workspace_invitations",
  "leads",
  "webhooks",
  "crm_connections",
  "subscriptions",
  "websites",
  "projects",
  "workspace_members",
  "workspaces",
];

async function getTableCount(table) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        return { exists: false, count: 0 };
      }
      return { exists: true, error: error.message };
    }
    return { exists: true, count: count ?? 0 };
  } catch (err) {
    return { exists: false, count: 0, error: err.message };
  }
}

async function getAuthUsers() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users || [];
}

async function runAudit() {
  console.log("\n=======================================================");
  console.log("  Sorget — Supabase Live Database Audit");
  console.log("  Supabase Project:", supabaseUrl);
  console.log("=======================================================\n");

  let totalAppRows = 0;

  console.log("--- APPLICATION TABLES ---");
  for (const table of TABLES_IN_DELETION_ORDER) {
    const res = await getTableCount(table);
    if (!res.exists) {
      console.log(`  [Table Not Created Yet] ${table}`);
    } else if (res.error) {
      console.log(`  [Error] ${table}: ${res.error}`);
    } else {
      console.log(`  ${table.padEnd(25)} : ${res.count} rows`);
      totalAppRows += res.count;
    }
  }

  console.log("\n--- SUPABASE AUTH ---");
  const users = await getAuthUsers();
  console.log(`  Total Auth Users           : ${users.length} users`);

  console.log("\n-------------------------------------------------------");
  console.log(`  TOTAL DATA TO BE WIPED   : ${totalAppRows} application rows + ${users.length} auth users`);
  console.log("-------------------------------------------------------\n");
}

async function executeWipe() {
  console.log("\n=======================================================");
  console.log("  EXECUTING PRODUCTION-SAFE DATA WIPE");
  console.log("=======================================================\n");

  for (const table of TABLES_IN_DELETION_ORDER) {
    const res = await getTableCount(table);
    if (!res.exists) {
      console.log(`  - Skipping ${table} (table does not exist)`);
      continue;
    }
    if (res.count === 0) {
      console.log(`  - Skipping ${table} (already empty)`);
      continue;
    }

    // Delete all records in table using neq on id
    const { error: delErr } = await supabase
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (delErr) {
      console.error(`  [FAILED] Deleting from ${table}: ${delErr.message}`);
    } else {
      console.log(`  [CLEARED] ${table} (${res.count} rows deleted)`);
    }
  }

  // Delete all Auth Users
  console.log("\n--- DELETING SUPABASE AUTH USERS ---");
  const users = await getAuthUsers();
  let deletedUsers = 0;
  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`  [FAILED] Deleting user ${user.id} (${user.email}): ${error.message}`);
    } else {
      deletedUsers++;
      console.log(`  [DELETED] Auth User: ${user.email} (${user.id})`);
    }
  }
  console.log(`\nDeleted ${deletedUsers} of ${users.length} auth users.`);

  console.log("\n=======================================================");
  console.log("  DATA WIPE COMPLETED SUCCESSFULLY.");
  console.log("  All tables, schema, columns, RLS, and functions preserved.");
  console.log("=======================================================\n");
}

async function main() {
  const isConfirm = process.argv.includes("--confirm");

  if (!isConfirm) {
    await runAudit();
    console.log("Notice: This was a DRY-RUN audit only. No data was modified.");
    console.log("To execute the wipe, run:");
    console.log("  node scripts/wipe_production_data.js --confirm");
    console.log("OR run scripts/wipe_production_data.sql in the Supabase SQL Editor.\n");
  } else {
    await executeWipe();
    await runAudit();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
