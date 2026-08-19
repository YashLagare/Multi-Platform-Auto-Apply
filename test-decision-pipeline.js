/**
 * Standalone Unit / Diagnostic Test for the Two-Layer Decision Pipeline
 */
const assert = require('assert');

// 1. Layer 1 Title Exclusions
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
  /\bmember\s+of\s+technical\s+staff\b/i,
];

function checkTitle(title) {
  for (const regex of TITLE_HARD_EXCLUSIONS) {
    if (regex.test(title)) {
      return { pass: false, reason: `HARD_TITLE_EXCLUSION (${regex.source})` };
    }
  }
  const isTarget = TARGET_ROLE_PATTERNS.some((r) => r.test(title));
  if (!isTarget) {
    return { pass: false, reason: 'NOT_A_TARGET_ROLE' };
  }
  return { pass: true };
}

function checkExperienceExclusion(jdText) {
  const t = jdText.toLowerCase();
  
  // Check senior ranges: 2-5, 3-5, 4-6, 5-8, etc.
  const rangeMatch = t.match(/\b(?:2\s*[-–to]\s*5|3\s*[-–to]\s*5|3\s*[-–to]\s*6|4\s*[-–to]\s*[678]|5\s*[-–to]\s*[89]|5\s*[-–to]\s*10)\s*(?:years?|yrs?)\b/i);
  if (rangeMatch) return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${rangeMatch[0]})` };

  // Check 4+, 5+, 6+ years
  const plusMatch = t.match(/\b(?:[4-9]|1\d)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience|\s+experience)?\b/i);
  if (plusMatch && !/\b(?:0-2|0-3|1-3|1-2)\b/.test(plusMatch[0])) {
    const num = parseInt(plusMatch[0], 10);
    if (num >= 4) return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${plusMatch[0]})` };
  }

  // Check minimum 4/5 years
  const minMatch = t.match(/\b(?:min(?:imum)?|at\s*least)\s*of?\s*([4-9]|1\d)\s*(?:years?|yrs?)\b/i);
  if (minMatch) return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${minMatch[0]})` };

  return { pass: true };
}

function checkLocationFit(cardLoc, jdText) {
  const combined = ((cardLoc || '') + ' ' + (jdText || '')).toLowerCase();
  const isRemote = /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b/i.test(combined);

  // Foreign residency restriction check
  if (/\b(?:must\s+reside\s+in\s+the\s+u\.?s\.?|us\s+citizens\s+only|us\s+only|uk\s+only|eu\s+only|north\s+america\s+only)\b/i.test(combined)) {
    return { pass: false, reason: 'FOREIGN_LOCATION_RESTRICTION' };
  }

  const p1 = /\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b/i.test(combined);
  const p2 = /\bmumbai\b|\bchennai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(combined);
  const p3 = /\bahmedabad\b/i.test(combined);

  if (p1 || p2 || p3 || isRemote) return { pass: true };

  return { pass: false, reason: 'NON_PRIORITY_ONSITE_LOCATION' };
}

function checkFullStackRelevance(title, jdText) {
  const isFullStackOrSDE = /\bfull\s*stack\b|\bfullstack\b|\bsoftware\s+engineer\b|\bsde\b/i.test(title);
  if (!isFullStackOrSDE) return { pass: true };

  const hasReactOrFrontend = /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bmern\b|\btypescript\b|\bfrontend\b|\bfront-end\b|\bjavascript\b|\btailwind\b/i.test(jdText);
  if (!hasReactOrFrontend) {
    return { pass: false, reason: 'FULLSTACK_MISSING_REACT_STACK' };
  }
  return { pass: true };
}

function evaluateJob(job, appliedIds = {}) {
  // Layer 1: Check 1 - Duplicate
  if (appliedIds[job.id]) {
    return { pass: false, layer: 1, reason: `ALREADY_APPLIED (Job ID: ${job.id})` };
  }

  // Layer 1: Check 2 - Title
  const titleCheck = checkTitle(job.title);
  if (!titleCheck.pass) {
    return { pass: false, layer: 1, reason: titleCheck.reason };
  }

  // Layer 1: Check 3 - JD Quality
  if (!job.jd || job.jd.trim().length < 80) {
    return { pass: false, layer: 1, reason: 'INSUFFICIENT_JD_DATA' };
  }

  // Layer 1: Check 4 - Experience
  const expCheck = checkExperienceExclusion(job.jd);
  if (!expCheck.pass) {
    return { pass: false, layer: 1, reason: expCheck.reason };
  }

  // Layer 1: Check 5 - Location
  const locCheck = checkLocationFit(job.location, job.jd);
  if (!locCheck.pass) {
    return { pass: false, layer: 1, reason: locCheck.reason };
  }

  // Layer 1: Check 6 - Full Stack Relevance
  const fsCheck = checkFullStackRelevance(job.title, job.jd);
  if (!fsCheck.pass) {
    return { pass: false, layer: 1, reason: fsCheck.reason };
  }

  // Layer 2: Match Scoring
  let score = 0;
  const breakdown = [];
  const lowerJD = job.jd.toLowerCase();
  const lowerTitle = job.title.toLowerCase();

  // Role
  if (/\breact\b|\bnext(?:\.js|js)?\b|\bfrontend\b|\bfront-end\b|\bmern\b/.test(lowerTitle)) {
    score += 25; breakdown.push('Role: React/Next/Frontend/MERN (+25)');
  } else if (/full\s*stack|fullstack/.test(lowerTitle)) {
    score += 22; breakdown.push('Role: Full Stack (+22)');
  } else {
    score += 18; breakdown.push('Role: SDE/Other (+18)');
  }

  // Tech Stack
  let techPoints = 0;
  if (/\breact(?:\.js|js)?\b/.test(lowerJD)) { techPoints += 10; breakdown.push('React (+10)'); }
  if (/\bnext(?:\.js|js)?\b/.test(lowerJD)) { techPoints += 8; breakdown.push('Next.js (+8)'); }
  if (/\btypescript\b/.test(lowerJD)) { techPoints += 7; breakdown.push('TypeScript (+7)'); }
  else if (/\bjavascript\b|\bes6\b/.test(lowerJD)) { techPoints += 5; breakdown.push('JavaScript (+5)'); }
  if (/\bnode(?:\.js|js)?\b|\bexpress(?:\.js)?\b|\bmongodb\b/.test(lowerJD)) { techPoints += 5; breakdown.push('Node/Express/Mongo (+5)'); }
  if (/\btailwind(?:\s*css)?\b|\brest(?:\s*api)?\b|\bsql\b|\bprisma\b|\bpostgresql\b/.test(lowerJD)) { techPoints += 5; breakdown.push('Tailwind/REST/SQL (+5)'); }
  
  if (/\bangular\b|\bvue(?:\.js)?\b|\bjava\b(?!\s*script)|\bspring(?:\s*boot)?\b|\b\.net\b|\bdjango\b/.test(lowerJD)) {
    techPoints = Math.max(0, techPoints - 15);
    breakdown.push('Conflicting tech (-15)');
  }
  score += Math.min(35, techPoints);

  // Exp
  if (/\b(?:0-1|0-2|0-3|1-2|1-3|fresh|fresher|entry\s*level|associate|junior)\b/.test(lowerJD)) {
    score += 20; breakdown.push('Exp: 0-3 yrs / Entry / Associate (+20)');
  } else if (!/\b\d+\+?\s*(?:years?|yrs?)\b/.test(lowerJD)) {
    score += 15; breakdown.push('Exp: Unspecified (+15)');
  } else {
    score += 10; breakdown.push('Exp: 2-3 yrs (+10)');
  }

  // Location
  const loc = ((job.location || '') + ' ' + (job.jd || '')).toLowerCase();
  if (/bengaluru|bangalore|pune|hyderabad/.test(loc) || /remote|work from home/.test(loc)) {
    score += 10; breakdown.push('Loc: P1 / Remote (+10)');
  } else if (/mumbai|chennai|gurgaon|gurugram|noida|delhi/.test(loc)) {
    score += 8; breakdown.push('Loc: P2 (+8)');
  } else if (/ahmedabad/.test(loc)) {
    score += 6; breakdown.push('Loc: P3 (+6)');
  } else {
    score += 5; breakdown.push('Loc: Other Remote (+5)');
  }

  // Freshness
  if (job.postedHours != null && job.postedHours <= 24) {
    score += 10; breakdown.push('Freshness: <24h (+10)');
  } else {
    score += 5; breakdown.push('Freshness: 1-3d (+5)');
  }

  const passed = score >= 65;
  return {
    pass: passed,
    layer: 2,
    score,
    breakdown: breakdown.join(', '),
    reason: passed ? (score >= 75 ? 'HIGH_PRIORITY_MATCH' : 'MODERATE_MATCH') : 'LOW_MATCH_SCORE',
  };
}

// =================== RUN TESTS ===================
console.log('=== RUNNING TWO-LAYER DECISION PIPELINE TESTS ===\n');

const appliedHistory = { '3721620': true };

const testCases = [
  {
    name: '1. Negative Test: Technical Co-Founder @ evos',
    job: { id: '4560693', title: 'Technical Co-Founder', location: 'Remote', jd: 'Looking for a technical co-founder with React, Node.js, 1-2 years experience.' },
    expectedPass: false,
    expectedReasonPrefix: 'HARD_TITLE_EXCLUSION',
  },
  {
    name: '2. Negative Test: Full Stack Developer @ Jaipur (On-site)',
    job: { id: '9999001', title: 'Full Stack Developer', location: 'Jaipur, Rajasthan', jd: 'Looking for Full Stack Developer in Jaipur office. Must work on-site in Jaipur. React, Node.js, 1-3 years experience.' },
    expectedPass: false,
    expectedReasonPrefix: 'NON_PRIORITY_ONSITE_LOCATION',
  },
  {
    name: '3. Negative Test: Frontend Developer (Wise 2-5 years experience)',
    job: { id: '9999002', title: 'Frontend Developer', location: 'Bengaluru', jd: 'We are looking for Frontend Engineer with 2-5 years of experience building modern web apps with React and TypeScript.' },
    expectedPass: false,
    expectedReasonPrefix: 'EXPERIENCE_EXCEEDS_LIMIT',
  },
  {
    name: '4. Negative Test: Full Stack Developer (Java + Spring Boot only in JD)',
    job: { id: '9999003', title: 'Full Stack Developer', location: 'Bengaluru', jd: 'Looking for Full Stack Engineer with Java, Spring Boot, Hibernate, Oracle DB, and Angular.' },
    expectedPass: false,
    expectedReasonPrefix: 'FULLSTACK_MISSING_REACT_STACK',
  },
  {
    name: '4b. Negative Test: Java Full Stack Developer (Java in title)',
    job: { id: '9999003b', title: 'Java Full Stack Developer', location: 'Bengaluru', jd: 'Looking for Full Stack Engineer with React, Node.js, 1-3 years experience.' },
    expectedPass: false,
    expectedReasonPrefix: 'HARD_TITLE_EXCLUSION',
  },
  {
    name: '5. Negative Test: Duplicate Job ID 3721620 (WeKnow)',
    job: { id: '3721620', title: 'Full Stack Developer', location: 'Bengaluru', jd: 'Full Stack Developer with React, Node.js, 1-3 years experience.' },
    expectedPass: false,
    expectedReasonPrefix: 'ALREADY_APPLIED',
  },
  {
    name: '6. Positive Test: React Developer @ Bengaluru (1-2 yrs, React, Next, TS, Tailwind)',
    job: { id: '9999004', title: 'React Developer', location: 'Bengaluru', jd: 'We are hiring a React Developer with 1-2 years experience. Tech stack: React.js, Next.js, TypeScript, Tailwind CSS, REST APIs, Git.', postedHours: 4 },
    expectedPass: true,
    minScore: 85,
  },
  {
    name: '7. Positive Test: Frontend Engineer @ Remote India (0-2 yrs, Next.js, React, Node)',
    job: { id: '9999005', title: 'Frontend Engineer', location: 'Remote, India', jd: 'Fast-growing startup looking for Frontend Engineer (0-2 years). Build features with Next.js, React, Node.js, Tailwind CSS.', postedHours: 12 },
    expectedPass: true,
    minScore: 85,
  },
];

let allPassed = true;

for (const tc of testCases) {
  const result = evaluateJob(tc.job, appliedHistory);
  console.log(`Test: ${tc.name}`);
  console.log(`  -> Passed: ${result.pass} | Layer: ${result.layer} | Score: ${result.score || 'N/A'}`);
  console.log(`  -> Reason: ${result.reason}`);
  if (result.breakdown) console.log(`  -> Breakdown: ${result.breakdown}`);

  if (tc.expectedPass) {
    if (!result.pass || (tc.minScore && result.score < tc.minScore)) {
      console.error(`  ❌ FAILED: Expected pass with score >= ${tc.minScore}, got ${result.pass} (${result.score})`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASSED\n`);
    }
  } else {
    if (result.pass || !result.reason.startsWith(tc.expectedReasonPrefix)) {
      console.error(`  ❌ FAILED: Expected fail with ${tc.expectedReasonPrefix}, got ${result.reason}`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASSED\n`);
    }
  }
}

if (allPassed) {
  console.log('🎉 ALL 7 UNIT TESTS PASSED WITH 100% ACCURACY!');
} else {
  console.error('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  process.exit(1);
}
