/**
 * System Diagnostic Doctor & Health Check
 * ========================================
 * Verifies .env configuration, Gemini AI connectivity, Chrome login profiles,
 * application databases, and system readiness across all 9 platforms.
 *
 * Usage: npm run check  OR  node doctor.js
 */
const fs = require("fs");
const path = require("path");
const { CV, openrouterKey, geminiKey, aiKey } = require("./config");

const PLATFORMS = [
  { key: "wellfound", name: "Wellfound", profile: ".wellfound-chrome-profile" },
  { key: "instahyre", name: "Instahyre", profile: ".instahyre-chrome-profile" },
  { key: "foundit", name: "Foundit", profile: ".foundit-chrome-profile" },
  { key: "naukri", name: "Naukri", profile: ".naukri-chrome-profile" },
  { key: "cutshort", name: "Cutshort", profile: ".cutshort-chrome-profile" },
  { key: "hirist", name: "Hirist", profile: ".hirist-chrome-profile" },
  { key: "yc", name: "YC Startups", profile: ".yc-chrome-profile" },
  { key: "indeed", name: "Indeed India", profile: ".indeed-chrome-profile" },
  { key: "linkedin", name: "LinkedIn", profile: ".linkedin-chrome-profile" },
];

async function checkAI() {
  // 1. Try OpenRouter Key
  if (openrouterKey) {
    const models = ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct"];
    for (const model of models) {
      const start = Date.now();
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/YashLagare/Wellfound-Auto-Apply",
            "X-Title": "AutoApply-Suite",
          },
          body: JSON.stringify({
            model,
            max_tokens: 200,
            messages: [{ role: "user", content: "Say READY" }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply) {
            return {
              ok: true,
              provider: "OpenRouter",
              model,
              reply,
              latency: Date.now() - start,
            };
          }
        }
      } catch (e) {}
    }
  }

  // 2. Fallback to Gemini Key
  if (geminiKey) {
    const models = ["gemini-1.5-flash", "gemini-2.5-flash"];
    for (const model of models) {
      const start = Date.now();
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Respond with: READY" }] }],
            }),
          },
        );
        if (res.ok) {
          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          return {
            ok: true,
            provider: "Google Gemini (Direct)",
            model,
            reply,
            latency: Date.now() - start,
          };
        }
      } catch (e) {}
    }
  }

  return {
    ok: false,
    reason: "No active AI key found or provider quota exceeded",
  };
}

function hasSessionData(profileDir) {
  const fullPath = path.join(__dirname, profileDir);
  if (!fs.existsSync(fullPath)) return false;
  try {
    const files = fs.readdirSync(fullPath);
    // Profile is considered active if Default folder or Cookie files exist
    return files.length > 3 || fs.existsSync(path.join(fullPath, "Default"));
  } catch (e) {
    return false;
  }
}

(async () => {
  console.log("\n===============================================================");
  console.log("🩺 AUTO-APPLY SUITE SYSTEM DIAGNOSTIC DOCTOR");
  console.log("===============================================================\n");

  let totalWarnings = 0;

  // 1. Profile / .env Audit
  console.log("📋 [1/4] Candidate Profile & .env Configuration:");
  const envFile = path.join(__dirname, ".env");
  if (!fs.existsSync(envFile)) {
    console.log("  ❌ .env file NOT found. Copy .env.example to .env!");
    totalWarnings++;
  } else {
    console.log("  ✅ .env file loaded");
  }

  const checks = [
    { field: "Name", val: CV.name },
    { field: "Email", val: CV.email },
    { field: "Phone", val: CV.phone },
    { field: "Location", val: CV.location },
    { field: "Current Role", val: CV.currentRole },
    { field: "Experience", val: CV.yearsOfExperience },
    { field: "Skills", val: CV.skills },
    { field: "Notice Period", val: CV.noticePeriod },
    { field: "Current CTC", val: CV.currentCTC ? `${CV.currentCTC} LPA` : "" },
    { field: "Expected CTC", val: CV.expectedCTC ? `${CV.expectedCTC} LPA` : "" },
  ];

  for (const c of checks) {
    if (c.val) {
      console.log(`  ✅ ${c.field.padEnd(16)}: ${c.val}`);
    } else {
      console.log(`  ⚠  ${c.field.padEnd(16)}: [NOT SET in .env]`);
      totalWarnings++;
    }
  }

  // 2. AI Connectivity Check
  console.log("\n🤖 [2/4] AI Engine Connectivity (OpenRouter / Gemini):");
  const aiStatus = await checkAI();
  if (aiStatus.ok) {
    console.log(`  ✅ Provider : ${aiStatus.provider} (${aiStatus.model})`);
    console.log(`  ✅ Status   : Connected & Operational (${aiStatus.latency}ms latency)`);
  } else {
    console.log(`  ⚠  AI Notice: ${aiStatus.reason}`);
    console.log("     (Fallbacks to QA bank will be used if AI key is unavailable)");
    totalWarnings++;
  }

  // 3. Chrome Profiles & Session Readiness
  console.log("\n🏛 [3/4] Platform Chrome Session Profiles:");
  let loggedInCount = 0;
  for (const p of PLATFORMS) {
    const ready = hasSessionData(p.profile);
    if (ready) {
      loggedInCount++;
      console.log(`  ✅ ${p.name.padEnd(20)}: Profile Active (${p.profile})`);
    } else {
      console.log(`  ⚪ ${p.name.padEnd(20)}: Not logged in yet -> run 'npm run login:${p.key}'`);
    }
  }
  console.log(`  📊 Session Readiness: ${loggedInCount}/${PLATFORMS.length} platforms initialized.`);

  // 4. Persistence & Database Integrity
  console.log("\n💾 [4/4] Applications Database & CSV Logs:");
  const csvFile = path.join(__dirname, "applications.csv");
  if (fs.existsSync(csvFile)) {
    const lines = fs.readFileSync(csvFile, "utf8").trim().split("\n");
    const count = Math.max(0, lines.length - 1);
    console.log(`  ✅ applications.csv: Present (${count} applications logged)`);
  } else {
    console.log("  ℹ  applications.csv: Will be created on first live application");
  }

  let totalAppliedTracked = 0;
  for (const p of PLATFORMS) {
    const dbFile = path.join(__dirname, `applied-jobs-${p.key}.json`);
    if (fs.existsSync(dbFile)) {
      try {
        const db = JSON.parse(fs.readFileSync(dbFile, "utf8").replace(/^\uFEFF/, ""));
        const keys = Object.keys(db.appliedIds || {});
        totalAppliedTracked += keys.length;
      } catch (e) {}
    }
  }
  console.log(`  ✅ Deduplication History: ${totalAppliedTracked} unique job IDs permanently remembered across portals.`);

  // Summary
  console.log("\n===============================================================");
  if (totalWarnings === 0 && loggedInCount > 0) {
    console.log("🚀 ALL SYSTEMS GO! Your Auto-Apply Suite is primed for 100% precision.");
  } else {
    console.log(`💡 STATUS: Ready with ${totalWarnings} recommendation(s).`);
  }
  console.log("===============================================================\n");
})();
