/**
 * Unit Test Suite for YC Work at a Startup Decision Pipeline
 */
const assert = require("assert");

const TITLE_HARD_EXCLUSIONS = [
  /\b(?:technical\s+)?co-?founder\b/i,
  /\bcto\b|\bchief\s+technology\s+officer\b/i,
  /\bfounder\b/i,
  /\bhead\s+of\b/i,
  /\bdirector\b/i,
  /\bvp\b|\bvice\s+president\b/i,
  /\b(?:engineering|product|project|tech|general|program)\s+manager\b/i,
  /\bsenior\b|\bsr\.?\b/i,
  /\blead\b/i,
  /\bprincipal\b/i,
  /\bstaff\b/i,
  /\barchitect\b/i,
  /\bintern\b|\binternship\b/i,
  /\bdesigner\b|\bui\s*\/\s*ux\b/i,
  /\bqa\b|\btester\b|\btest\s+engineer\b|\bquality\s+assurance\b/i,
  /\bdevops\b|\bsre\b|\binfrastructure\b/i,
  /\bdata\s+engineer\b|\bdata\s+scientist\b|\bdata\s+analyst\b/i,
  /\bsales\b|\bmarketing\b|\bbdr\b|\bsdr\b/i,
  /\btutor\b|\bteacher\b|\btrainer\b|\binstructor\b|\bcoach\b/i,
  /\bjava\b(?!\s*script)/i,
  /\bspring(?:\s*boot)?\b/i,
  /\b\.net\b|\bc#\b/i,
  /\bphp\b|\blaravel\b/i,
  /\bruby(?:\s*on\s*rails)?\b|\brails\b/i,
  /\bgolang\b|\bgo\s+developer\b/i,
  /\brust\b/i,
  /\bflutter\b/i,
  /\bswift\b|\bios\b/i,
  /\bandroid(?:\s+native)?\b/i,
  /\bsalesforce\b|\bsap\b/i,
  /\bc\+\+\b/i,
];

const TARGET_ROLE_PATTERNS = [
  /\breact(?:\.js|js)?\b/i,
  /\bnext(?:\.js|js)?\b/i,
  /\bfrontend\b|\bfront-end\b|\bfront\s+end\b/i,
  /\bjavascript\b|\bjs\s+developer\b|\btypescript\b|\bts\s+developer\b/i,
  /\bmern(?:\s+stack)?\b/i,
  /\bfull\s*stack\b|\bfullstack\b/i,
  /\bsoftware\s+engineer\b|\bsoftware\s+developer\b|\bsde\b/i,
  /\bweb\s+developer\b/i,
];

function checkTitle(title) {
  for (const regex of TITLE_HARD_EXCLUSIONS) {
    if (regex.test(title))
      return { pass: false, reason: `HARD_TITLE_EXCLUSION (${regex.source})` };
  }
  const isTarget = TARGET_ROLE_PATTERNS.some((r) => r.test(title));
  if (!isTarget) return { pass: false, reason: "NOT_A_TARGET_ROLE" };
  return { pass: true };
}

function checkLocation(locText) {
  const t = (locText || "").toLowerCase();
  const isRemote =
    /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b|\bglobal\b/i.test(t);
  if (/\b(?:us\s+only|uk\s+only|eu\s+only|canada\s+only)\b/i.test(t))
    return { pass: false, reason: "FOREIGN_LOCATION_RESTRICTION" };

  const p1 = /\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b/i.test(t);
  const p2 =
    /\bmumbai\b|\bchennai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(
      t,
    );
  const p3 = /\bahmedabad\b/i.test(t);

  if (p1 || p2 || p3 || isRemote) return { pass: true };
  return { pass: false, reason: "NON_PRIORITY_ONSITE_LOCATION" };
}

function evaluateYCJob(job, appliedHistory = {}) {
  if (appliedHistory[job.id])
    return { pass: false, reason: `ALREADY_APPLIED (${job.id})` };

  const tCheck = checkTitle(job.title);
  if (!tCheck.pass) return { pass: false, reason: tCheck.reason };

  const locCheck = checkLocation(job.location);
  if (!locCheck.pass) return { pass: false, reason: locCheck.reason };

  let score = 0;
  const breakdown = [];
  const lowerTitle = job.title.toLowerCase();
  const lowerSkills = (
    (job.skills || "") +
    " " +
    (job.description || "")
  ).toLowerCase();

  // Role
  if (
    /\breact\b|\bnext(?:\.js|js)?\b|\bfrontend\b|\bfront-end\b|\bmern\b/.test(
      lowerTitle,
    )
  ) {
    score += 25;
    breakdown.push("Role: React/Next/Frontend/MERN (+25)");
  } else if (/full\s*stack|fullstack/.test(lowerTitle)) {
    score += 22;
    breakdown.push("Role: Full Stack (+22)");
  } else {
    score += 18;
    breakdown.push("Role: SDE/Other (+18)");
  }

  // Skills
  let tech = 0;
  if (/\breact(?:\.js|js)?\b/.test(lowerSkills)) {
    tech += 10;
    breakdown.push("React (+10)");
  }
  if (/\bnext(?:\.js|js)?\b/.test(lowerSkills)) {
    tech += 8;
    breakdown.push("Next.js (+8)");
  }
  if (/\btypescript\b/.test(lowerSkills)) {
    tech += 7;
    breakdown.push("TypeScript (+7)");
  } else if (/\bjavascript\b/.test(lowerSkills)) {
    tech += 5;
    breakdown.push("JavaScript (+5)");
  }
  if (/\bnode(?:\.js|js)?\b|\bmongodb\b/.test(lowerSkills)) {
    tech += 5;
    breakdown.push("Node/Mongo (+5)");
  }
  if (/\btailwind(?:\s*css)?\b|\brest\b/.test(lowerSkills)) {
    tech += 5;
    breakdown.push("Tailwind/REST (+5)");
  }
  score += Math.min(35, tech);

  // Exp & Loc
  score += 20; // 0-3 yrs startup baseline
  score += 10; // Remote / Global
  score += 10; // YC freshness

  const pass = score >= 65;
  return {
    pass,
    score,
    breakdown: breakdown.join(", "),
  };
}

// ======================= TESTS =======================
console.log("▶ Running YC Work at a Startup Pipeline Tests...\n");

assert.strictEqual(
  checkTitle("Technical Co-Founder (Equity only)").pass,
  false,
  "Should reject Co-Founder",
);
assert.strictEqual(
  checkTitle("Frontend Engineer (React/TypeScript)").pass,
  true,
  "Should pass Frontend Engineer",
);
assert.strictEqual(
  checkLocation("Remote (Global)").pass,
  true,
  "Should pass Remote (Global)",
);

const res = evaluateYCJob({
  id: "yc-404",
  title: "Full Stack Engineer",
  company: "HyperGrowth YC S25",
  location: "Remote",
  skills: "React, Next.js, Node.js, TypeScript, Tailwind",
  description: "Join as early engineer to build real-time collaboration UI",
});
assert.strictEqual(res.pass, true);
assert.ok(res.score >= 80, `Expected score >= 80, got ${res.score}`);
console.log(`  ✓ YC Match Test passed (Score: ${res.score})`);

console.log("\n✅ All YC pipeline tests passed successfully!");
