// Test script: boot the test profile and list discovered skills.
// Usage: node test-discovery.mjs [profileName]
import { runProfile } from "/home/ai/.local/lib/node_modules/@deepseek-ai/dsh/lib/profile-boot.js";
import { createLaunchEnvironmentSnapshot } from "/home/ai/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-launch-environment/lib/index.js";

const profileName = process.argv[2] ?? "test-scrapling";

try {
  const result = await runProfile({
    profile: profileName,
    patchFiles: [],
    fromDefaultProfile: undefined,
    resolvedProfile: undefined,
    environment: createLaunchEnvironmentSnapshot([{ source: "process", values: { ...process.env } }]),
    args: [],
  });

  const ctx = result.ctx ?? result;
  // Give the loader a moment to settle
  await new Promise((r) => setTimeout(() => r(), 3000));

  const skills = ctx.get("skills");
  if (!skills) {
    console.log("NO skills service found");
    process.exit(1);
  }

  // Try to list skills
  const catalog = await skills.list({ cwd: process.cwd() });
  const skillList = Array.isArray(catalog) ? catalog : catalog.candidates ?? [];
  console.log(`Discovered ${skillList.length} skills:`);
  for (const s of skillList) {
    console.log(`  - ${s.name} (source: ${s.source}, rank: ${s.rank})`);
  }
  // Diagnostics: dump the raw catalog shape and any provider info
  if (skillList.length === 0) {
    console.log("\n[diag] raw catalog type:", typeof catalog, Array.isArray(catalog) ? "array" : Object.keys(catalog ?? {}));
    if (catalog && !Array.isArray(catalog)) {
      console.log("[diag] catalog keys:", JSON.stringify(catalog, (k, v) => k === "content" ? "<body>" : v, 2).slice(0, 2000));
    }
    // Check the skill-filesystem provider's bundledSkillDir via the entry
    const loader = ctx.get("loader");
    if (loader) {
      try {
      for (const entry of loader.entries()) {
        if (entry.options?.name === "@deepseek-ai/dsh-skill-filesystem") {
          console.log("[diag] skill-filesystem entry id:", entry.id, "disabled:", entry.options.disabled, "config:", JSON.stringify(entry.options.config));
        }
      }
      } catch (e) { console.log("[diag] loader.entries error:", e.message); }
    }
  }

  // Specifically check for the scrapling skill
  const scrapling = skillList.find((s) => s.name === "scrapling-official");
  if (scrapling) {
    console.log("\n✅ SCRAPLING SKILL DISCOVERED");
    console.log(`   name: ${scrapling.name}`);
    console.log(`   source: ${scrapling.source}`);
    console.log(`   rank: ${scrapling.rank}`);
    console.log(`   path: ${scrapling.path}`);
    if (scrapling.resourceBase) console.log(`   resourceBase: ${scrapling.resourceBase.path}`);
  } else {
    console.log("\n❌ SCRAPLING SKILL NOT DISCOVERED");
  }

  // For a test, just exit (a full fiber dispose can hang on web plugins).
  process.exit(scrapling ? 0 : 1);
} catch (err) {
  console.error("Error:", err.message);
  let cause = err.cause;
  let depth = 0;
  while (cause && depth < 5) {
    console.error(`  cause[${depth}]:`, cause.message ?? String(cause));
    if (cause.stack) console.error(cause.stack.split("\n").slice(0, 8).join("\n"));
    cause = cause.cause;
    depth++;
  }
  process.exit(1);
}
