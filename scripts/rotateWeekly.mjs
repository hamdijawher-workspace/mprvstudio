#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Rotate weekly picks in data/weekly-config.json.
 *
 * Usage:
 * node scripts/rotateWeekly.mjs --week=2026-02-17 --featured=id1,id2,...,id12
 *
 * Optional flags:
 * --hard-archive-prev=true  -> move previous weekly picks to hardArchivedProductIds
 */

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg) => {
    if (!arg.startsWith("--")) {
      return;
    }
    const [key, value = ""] = arg.slice(2).split("=");
    args[key] = value;
  });
  return args;
}

function unique(values) {
  return Array.from(new Set(values));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const featured = (args.featured || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const nextWeek = args.week?.trim();
  const hardArchivePrev = args["hard-archive-prev"] === "true";

  if (!nextWeek) {
    throw new Error("Missing --week=YYYY-MM-DD");
  }
  if (featured.length !== 12) {
    throw new Error(`Weekly rotation requires exactly 12 featured IDs. Received ${featured.length}.`);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const weeklyConfigPath = path.join(__dirname, "..", "data", "weekly-config.json");
  const raw = await readFile(weeklyConfigPath, "utf8");
  const config = JSON.parse(raw);

  const previousWeek = config.currentWeekLabel;
  const previousFeatured = config.featuredProductIds || [];

  config.archiveByWeek = config.archiveByWeek || {};
  config.archiveByWeek[previousWeek] = unique([...(config.archiveByWeek[previousWeek] || []), ...previousFeatured]);

  if (hardArchivePrev) {
    config.hardArchivedProductIds = unique([...(config.hardArchivedProductIds || []), ...previousFeatured]);
  }

  config.currentWeekLabel = nextWeek;
  config.featuredProductIds = featured;

  await writeFile(weeklyConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  console.log("Weekly rotation complete.");
  console.log(`Previous week: ${previousWeek}`);
  console.log(`New week: ${nextWeek}`);
  console.log(`Featured IDs: ${featured.join(", ")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
