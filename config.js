/**
 * Loads all personal data + credentials from .env so nothing sensitive lives in code.
 * Tiny hand-rolled parser — no dependency needed for a flat KEY=value file.
 */
const fs = require("fs");
const path = require("path");
const { POLICY } = require("./eligibility-policy");

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs
    .readFileSync(file, "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const E = loadEnv(path.join(__dirname, ".env"));
const g = (k, d = "") =>
  E[k] != null && E[k] !== "" ? E[k] : process.env[k] || d;
const eligibilityPolicy = {
  ...POLICY,
  companyBlocklist: g("EXCLUDED_COMPANIES")
    .split("||")
    .map((company) => company.trim())
    .filter(Boolean),
};
const noticePeriod = g("NOTICE_PERIOD");

const profileHeadline = g(
  "PROFILE_HEADLINE",
  "Frontend-focused Full Stack Developer | React.js, Next.js, TypeScript, Node.js",
);
const profileSummary = g(
  "PROFILE_SUMMARY",
  "Frontend-focused Full Stack Developer with about 11 months of professional internship experience delivering 15+ client-facing applications. Strong in React, Next.js, TypeScript, Tailwind CSS, REST API integration, and frontend performance, with hands-on full-stack SaaS projects using Node.js, Express, MongoDB, PostgreSQL, authentication, AI integrations, and payments.",
);
const defaultHighlights = [
  "Delivered responsive production React and Next.js applications across 15+ client-facing projects during an 11-month internship.",
  "Built reusable React and Next.js component libraries and integrated REST APIs across 30+ data workflows.",
  "Built FlowForge, a workflow automation SaaS with a React Flow editor, durable Trigger.dev execution, Liveblocks collaboration, Clerk organizations, and PostgreSQL.",
  "Built Docsy, a multi-tenant AI document workspace with streamed answers and source references, Stripe billing, Better Auth, and PostgreSQL.",
  "Built QuickBite, a multi-role ordering platform with Socket.IO order tracking, Razorpay payments, and MongoDB geospatial discovery.",
];
const configuredHighlights = g("HIGHLIGHTS")
  .split("||")
  .map((s) => s.trim())
  .filter(Boolean);

if (!g("NAME") || !g("EMAIL")) {
  console.warn(
    "[config] .env missing or empty — copy .env.example to .env and fill it in.",
  );
}

const CV = {
  name: g("NAME"),
  email: g("EMAIL"),
  phone: g("PHONE"),
  location: g("LOCATION"),
  profileHeadline,
  profileSummary,
  currentRole: g("CURRENT_ROLE", profileHeadline),
  company:
    g("COMPANY") || (g("CURRENT_ROLE").split(" at ")[1] || "").split(" (")[0],
  education: g("EDUCATION"),
  experienceYears: g("EXPERIENCE_YEARS_NUMERIC", "1"),
  experienceSummary: g(
    "EXPERIENCE_SUMMARY",
    g(
      "YEARS_EXPERIENCE",
      "About 11 months of professional internship experience, plus hands-on full-stack SaaS project work.",
    ),
  ),
  yearsOfExperience: g(
    "EXPERIENCE_SUMMARY",
    g(
      "YEARS_EXPERIENCE",
      "About 11 months of professional internship experience, plus hands-on full-stack SaaS project work.",
    ),
  ),
  skills: g(
    "SKILLS",
    "React.js, Next.js, JavaScript, TypeScript, Tailwind CSS, Node.js, Express.js, REST APIs, MongoDB, PostgreSQL, Prisma, Drizzle ORM, Clerk, Better Auth, Redux Toolkit, Zustand, OpenAI API, Google Gemini API, Git, GitHub",
  ),
  highlights: configuredHighlights.length
    ? configuredHighlights
    : defaultHighlights,
  // application answers
  noticePeriod,
  currentCTC: g("CURRENT_CTC")
    .replace(/\s*lpa$/i, "")
    .trim(), // bare number for chatbots, e.g. "3"
  expectedCTC: g("EXPECTED_CTC")
    .replace(/\s*lpa$/i, "")
    .trim(), // e.g. "4.5"
  currentSalary: g("CURRENT_CTC")
    .replace(/\s*lpa$/i, "")
    .trim()
    ? g("CURRENT_CTC")
        .replace(/\s*lpa$/i, "")
        .trim() + " LPA"
    : "",
  expectedSalary: g("EXPECTED_CTC")
    .replace(/\s*lpa$/i, "")
    .trim()
    ? g("EXPECTED_CTC")
        .replace(/\s*lpa$/i, "")
        .trim() + " LPA"
    : "",
  dob: g("DOB"),
  gender: g("GENDER"),
  workAuth: g("WORK_AUTH"),
  // links
  github: g("GITHUB_URL"),
  linkedin: g("LINKEDIN_URL"),
  portfolio: g("PORTFOLIO_URL"),
  links: `GitHub: ${g("GITHUB_URL")} | LinkedIn: ${g("LINKEDIN_URL")} | Portfolio: ${g("PORTFOLIO_URL")}`,
  // derived sentences
  remoteOk: g("REMOTE_WORK_PREFERENCE"),
  relocate: g("RELOCATION_PREFERENCE"),
  startDate: noticePeriod
    ? noticePeriod.toLowerCase().startsWith("immediat")
      ? "I am available to join immediately."
      : `I can start within ${noticePeriod}.`
    : "",
};

CV.aiProfile = {
  headline: CV.profileHeadline,
  summary: CV.profileSummary,
  experience: CV.experienceSummary,
  skills: CV.skills,
  education: CV.education,
  highlights: CV.highlights,
};

const openrouterKey = g("OPENROUTER_KEY");
const geminiKey = g("GEMINI_KEY");

module.exports = {
  CV,
  openrouterKey,
  geminiKey,
  aiKey: openrouterKey || geminiKey,
  eligibilityPolicy,
};

