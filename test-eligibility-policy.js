const assert = require("assert");
const vm = require("vm");
const {
  POLICY,
  checkTitle,
  checkExperience,
  checkLocation,
  checkJobQuality,
  applyQualityAdjustment,
  clickApplyButton,
  browserHelperSource,
} = require("./eligibility-policy");

assert.strictEqual(checkTitle("Junior Software Developer").pass, true);
assert.strictEqual(checkTitle("Associate Software Engineer").pass, true);
assert.strictEqual(checkTitle("Senior React Developer").pass, false);
assert.strictEqual(checkTitle("Technical Support Engineer").pass, false);
assert.strictEqual(checkTitle("Sales Manager").pass, false);
assert.strictEqual(checkTitle("React Native Developer").pass, false);

assert.strictEqual(checkExperience("0-2 years").pass, true);
assert.strictEqual(checkExperience("1 year of experience").pass, true);
assert.strictEqual(checkExperience("1-3 years").pass, false);
assert.strictEqual(checkExperience("3+ years").pass, false);
assert.strictEqual(checkExperience("Experience not specified").pass, true);
assert.strictEqual(checkExperience("Not specified").pass, true);

assert.strictEqual(checkLocation("Bengaluru, India").pass, true);
assert.strictEqual(checkLocation("Remote, India").pass, true);
assert.strictEqual(checkLocation("Mumbai").pass, true);
assert.strictEqual(checkLocation("Ahmedabad").pass, true);
assert.strictEqual(checkLocation("Jaipur, onsite").pass, false);
assert.strictEqual(checkLocation("Remote, US only").pass, false);

assert.strictEqual(
  checkJobQuality({
    title: "React Developer",
    employmentType: "Full-time",
    company: "Acme",
    description: "Build React applications with our product team.",
  }).pass,
  true,
);
assert.strictEqual(
  checkJobQuality({
    title: "React Developer - Contract",
    description: "Build React applications with our product team.",
  }).reason,
  "NON_FULL_TIME_ROLE",
);
assert.strictEqual(
  checkJobQuality({
    title: "React Developer",
    employmentType: "Internship",
  }).reason,
  "NON_FULL_TIME_ROLE",
);
assert.strictEqual(
  checkJobQuality(
    { title: "Frontend Engineer", company: "Acme, Inc." },
    { ...POLICY, companyBlocklist: ["Acme Inc"] },
  ).reason,
  "COMPANY_BLOCKLIST",
);
assert.strictEqual(
  checkJobQuality({
    title: "Frontend Engineer",
    description: "Must have 3 years of experience with Angular.",
  }).reason,
  "UNRELATED_REQUIRED_STACK",
);
assert.strictEqual(
  checkJobQuality({
    title: "Frontend Engineer",
    description: "Must have experience with React and Angular.",
  }).pass,
  true,
);
const shortDescriptionCheck = checkJobQuality({
  title: "React Developer",
  description: "Urgent hiring for a React developer.",
});
assert.strictEqual(shortDescriptionCheck.pass, true);
assert.strictEqual(shortDescriptionCheck.penalty, 5);
assert(shortDescriptionCheck.warnings.includes("URGENT_HIRING_LANGUAGE"));
const urgentHiringCheck = checkJobQuality({
  title: "React Developer",
  description: `Urgent hiring. ${"Build React products. ".repeat(8)}`,
});
assert.strictEqual(urgentHiringCheck.penalty, 0);
assert(urgentHiringCheck.warnings.includes("URGENT_HIRING_LANGUAGE"));
assert.deepStrictEqual(
  checkJobQuality({ title: "React Developer" }).warnings,
  ["DESCRIPTION_UNAVAILABLE"],
);
const repeatedParagraph =
  "Build and maintain customer-facing React features. ".repeat(3);
const repetitiveDescriptionCheck = checkJobQuality({
  title: "React Developer",
  description: `${repeatedParagraph}\n${repeatedParagraph}\n${repeatedParagraph}`,
});
assert(repetitiveDescriptionCheck.warnings.includes("REPETITIVE_DESCRIPTION"));
assert.strictEqual(repetitiveDescriptionCheck.penalty, 10);

const adjustedResult = applyQualityAdjustment(
  {
    score: 60,
    breakdown: "Role: React (+25)",
    passed: true,
    action: "MODERATE_APPLY",
  },
  shortDescriptionCheck,
  55,
  75,
);
assert.strictEqual(adjustedResult.score, 55);
assert.strictEqual(adjustedResult.passed, true);
const rejectedBorderlineResult = applyQualityAdjustment(
  {
    score: 59,
    breakdown: "Role: React (+25)",
    passed: true,
    action: "MODERATE_APPLY",
  },
  shortDescriptionCheck,
  55,
  75,
);
assert.strictEqual(rejectedBorderlineResult.score, 54);
assert.strictEqual(rejectedBorderlineResult.passed, false);
assert.strictEqual(rejectedBorderlineResult.action, "LOW_SCORE_SKIP");

let clickCount = 0;
const fakeApplyButton = { click: () => clickCount++ };
assert.strictEqual(clickApplyButton(fakeApplyButton, false), false);
assert.strictEqual(clickApplyButton(fakeApplyButton, undefined), false);
assert.strictEqual(clickApplyButton(null, true), false);
assert.strictEqual(clickCount, 0);
assert.strictEqual(clickApplyButton(fakeApplyButton, true), true);
assert.strictEqual(clickCount, 1);

assert.strictEqual(POLICY.salary.minimumLpa, 3);
assert.deepStrictEqual(POLICY.salary.targetRangeLpa, [4, 6]);
assert.strictEqual(POLICY.maxExperienceYears, 2);
assert.strictEqual(POLICY.highScoreThreshold, 75);
assert.strictEqual(Object.keys(POLICY.scoreThresholds).length, 9);

const browserContext = { window: {} };
vm.runInNewContext(
  `window.__APPLY_POLICY_HELPERS = {${browserHelperSource()}};`,
  browserContext,
);
assert.strictEqual(
  browserContext.window.__APPLY_POLICY_HELPERS.checkExperience(
    "1-3 years",
    POLICY,
  ).pass,
  false,
);
assert.strictEqual(
  browserContext.window.__APPLY_POLICY_HELPERS.checkLocation(
    "Pune",
    POLICY,
  ).pass,
  true,
);
assert.strictEqual(
  browserContext.window.__APPLY_POLICY_HELPERS.checkJobQuality(
    { title: "React Developer - Part-time" },
    POLICY,
  ).pass,
  false,
);
const browserAdjustedResult =
  browserContext.window.__APPLY_POLICY_HELPERS.applyQualityAdjustment(
    {
      score: 60,
      breakdown: "Role: React (+25)",
      passed: true,
      action: "MODERATE_APPLY",
    },
    shortDescriptionCheck,
    55,
    75,
  );
assert.strictEqual(browserAdjustedResult.score, 55);
const browserFakeButton = { clicked: false, click() { this.clicked = true; } };
assert.strictEqual(
  browserContext.window.__APPLY_POLICY_HELPERS.clickApplyButton(
    browserFakeButton,
    false,
  ),
  false,
);
assert.strictEqual(browserFakeButton.clicked, false);

console.log("Shared eligibility policy tests passed.");
