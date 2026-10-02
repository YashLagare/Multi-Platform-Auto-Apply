/**
 * Unit Test Suite for Cutshort Two-Layer Decision Pipeline
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

function checkExperience(expText) {
  const t = (expText || "").toLowerCase();
  const rangeMatch = t.match(
    /\b(?:2\s*[-–to]\s*5|3\s*[-–to]\s*5|3\s*[-–to]\s*6|4\s*[-–to]\s*[678]|5\s*[-–to]\s*[89]|5\s*[-–to]\s*10)\s*(?:years?|yrs?)\b/i,
  );
  if (rangeMatch)
    return {
      pass: false,
      reason: `EXPERIENCE_EXCEEDS_LIMIT (${rangeMatch[0]})`,
    };

  const numMatch = t.match(
    /\b([3-9]|1\d)\s*(?:\+|-\s*\d+)?\s*(?:years?|yrs?)\b/i,
  );
  if (numMatch) {
    const minNum = parseInt(numMatch[1], 10);
    if (minNum >= 4)
      return {
        pass: false,
        reason: `EXPERIENCE_EXCEEDS_LIMIT (${numMatch[0]})`,
      };
  }
  return { pass: true };
}

function checkLocation(locText) {
  const t = (locText || "").toLowerCase();
  const isRemote =
    /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b/i.test(t);
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

function checkFullStack(title, skills, description) {
  const isFullStack =
    /\bfull\s*stack\b|\bfullstack\b|\bsoftware\s+engineer\b|\bsoftware\s+developer\b|\bsde\b/i.test(
      title,
    );
  if (!isFullStack) return { pass: true };
  const blob = `${skills || ""} ${description || ""}`.toLowerCase();
  const hasReact =
    /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bmern\b|\btypescript\b|\bfrontend\b|\bfront-end\b|\bjavascript\b|\btailwind\b/i.test(
      blob,
    );
  if (!hasReact)
    return { pass: false, reason: "FULLSTACK_MISSING_REACT_STACK" };
  return { pass: true };
}

function evaluateCutshortJob(job, appliedHistory = {}) {
  if (appliedHistory[job.id])
    return { pass: false, reason: `ALREADY_APPLIED (${job.id})` };

  const tCheck = checkTitle(job.title);
  if (!tCheck.pass) return { pass: false, reason: tCheck.reason };

  const expCheck = checkExperience(job.experience);
  if (!expCheck.pass) return { pass: false, reason: expCheck.reason };

  const locCheck = checkLocation(job.location);
  if (!locCheck.pass) return { pass: false, reason: locCheck.reason };

  const fsCheck = checkFullStack(job.title, job.skills, job.description);
  if (!fsCheck.pass) return { pass: false, reason: fsCheck.reason };

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
  if (
    /\bangular\b|\bvue(?:\.js)?\b|\bjava\b(?!\s*script)|\bspring(?:\s*boot)?\b|\b\.net\b|\bdjango\b/.test(
      lowerSkills,
    )
  ) {
    tech = Math.max(0, tech - 15);
    breakdown.push("Conflicting tech penalty (-15)");
  }
  score += Math.min(35, tech);

  // Exp
  if (
    /\b(?:0\s*-\s*2|1\s*-\s*3|0\s*-\s*1|0\s*-\s*3|0-1|0-2|0-3|1-3)\s*yrs?\b/i.test(
      job.experience,
    )
  ) {
    score += 20;
    breakdown.push("Exp: 0-3 yrs (+20)");
  } else {
    score += 10;
    breakdown.push("Exp: 2-3 yrs (+10)");
  }

  // Loc
  const loc = (job.location || "").toLowerCase();
  if (/bengaluru|bangalore|pune|hyderabad|remote|work from home/.test(loc)) {
    score += 10;
    breakdown.push("Loc: P1 / Remote (+10)");
  } else if (/mumbai|chennai|gurgaon|gurugram|noida|delhi/.test(loc)) {
    score += 8;
    breakdown.push("Loc: P2 (+8)");
  } else {
    score += 6;
    breakdown.push("Loc: P3 (+6)");
  }

  // Freshness
  score += 10;
  breakdown.push("Active Opportunity (+10)");

  const pass = score >= 65;
  return {
    pass,
    score,
    breakdown: breakdown.join(", "),
    reason: pass
      ? score >= 75
        ? "HIGH_PRIORITY_MATCH"
        : "MODERATE_MATCH"
      : `LOW_MATCH_SCORE (${score} < 65)`,
  };
}

// ======================= TESTS =======================
console.log("▶ Running Cutshort Pipeline Tests...\n");

// 1. Title Hard Exclusions
assert.strictEqual(
  checkTitle("Senior Frontend Engineer").pass,
  false,
  "Should reject Senior title",
);
assert.strictEqual(
  checkTitle("Technical Co-founder").pass,
  false,
  "Should reject Co-founder",
);
assert.strictEqual(
  checkTitle("Lead Full Stack Developer").pass,
  false,
  "Should reject Lead title",
);
assert.strictEqual(
  checkTitle("Java Spring Boot Developer").pass,
  false,
  "Should reject Java title",
);
assert.strictEqual(
  checkTitle("React Developer").pass,
  true,
  "Should pass React Developer",
);
assert.strictEqual(
  checkTitle("Frontend Developer").pass,
  true,
  "Should pass Frontend Developer",
);
console.log("  ✓ Title Hard Exclusions passed");

// 2. Experience Hard Exclusions
assert.strictEqual(
  checkExperience("5+ years").pass,
  false,
  "Should reject 5+ years",
);
assert.strictEqual(
  checkExperience("3 - 6 yrs").pass,
  false,
  "Should reject 3-6 yrs",
);
assert.strictEqual(
  checkExperience("0 - 2 yrs").pass,
  true,
  "Should pass 0-2 yrs",
);
assert.strictEqual(
  checkExperience("1 - 3 years").pass,
  true,
  "Should pass 1-3 yrs",
);
console.log("  ✓ Experience Limits passed");

// 3. Location Hierarchy
assert.strictEqual(
  checkLocation("Bengaluru").pass,
  true,
  "Should pass Bengaluru (P1)",
);
assert.strictEqual(
  checkLocation("Remote").pass,
  true,
  "Should pass Remote",
);
assert.strictEqual(
  checkLocation("Jaipur").pass,
  false,
  "Should reject Jaipur non-remote (P4)",
);
console.log("  ✓ Location Hierarchy passed");

// 4. Scoring Engine
const highMatch = evaluateCutshortJob({
  id: "cs-101",
  title: "React.js Developer",
  company: "Fintech Startup",
  experience: "1-3 yrs",
  location: "Pune",
  skills: "React, Next.js, TypeScript, Tailwind CSS, REST APIs",
  description: "Building modern scalable client web apps",
});
assert.strictEqual(highMatch.pass, true);
assert.ok(highMatch.score >= 75, `Expected score >= 75, got ${highMatch.score}`);
console.log(`  ✓ High Match Evaluation passed (Score: ${highMatch.score})`);

console.log("\n✅ All Cutshort pipeline tests passed successfully!");
