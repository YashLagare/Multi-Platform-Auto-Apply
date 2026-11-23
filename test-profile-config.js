const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { CV, eligibilityPolicy } = require("./config");
const { browserHelperSource } = require("./eligibility-policy");

assert(CV.profileHeadline);
assert(CV.profileSummary);
assert(CV.experienceSummary);
assert(CV.skills.includes("React"));
assert(CV.highlights.length >= 3);
assert(Number.isFinite(Number(CV.experienceYears)));
assert(Array.isArray(eligibilityPolicy.companyBlocklist));

assert.deepStrictEqual(Object.keys(CV.aiProfile), [
  "headline",
  "summary",
  "experience",
  "skills",
  "education",
  "highlights",
]);
assert.strictEqual(Object.prototype.hasOwnProperty.call(CV.aiProfile, "email"), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(CV.aiProfile, "phone"), false);
assert.strictEqual(Object.prototype.hasOwnProperty.call(CV.aiProfile, "dob"), false);

const scripts = [
  "wellfound-auto-apply.js",
  "instahyre-auto-apply.js",
  "foundit-auto-apply.js",
  "naukri-auto-apply.js",
  "cutshort-auto-apply.js",
  "hirist-auto-apply.js",
  "yc-auto-apply.js",
  "indeed-auto-apply.js",
  "linkedin-auto-apply.js",
];
for (const script of scripts) {
  const source = fs.readFileSync(path.join(__dirname, script), "utf8");
  assert(source.includes("getMissingRequiredFields"), script);
  assert(
    (source.match(/window\.__APPLY_POLICY_HELPERS\.clickApplyButton/g) || [])
      .length >= 1,
    script,
  );
  assert(source.includes("CONFIG.DRY_RUN !== false"), script);
  assert(!/CV\.currentCTC\s*\|\|\s*["']3/.test(source), script);
  assert(!/CV\.expectedCTC\s*\|\|\s*["']4\.5/.test(source), script);
  assert(!/setValue\(inp,\s*["']0["']\)/.test(source), script);
  if (
    [
      "wellfound-auto-apply.js",
      "instahyre-auto-apply.js",
      "foundit-auto-apply.js",
      "naukri-auto-apply.js",
    ].includes(script)
  ) {
    assert(source.includes("sanitizeAnswer(text)"), script);
    assert(source.includes("isSensitiveApplicationQuestion"), script);
  }
  const injected = `(async () => {
    window.__APPLY_CONFIG = ${JSON.stringify({
      CV,
      eligibilityPolicy,
      platform: "wellfound",
    })};
    window.__APPLY_POLICY_HELPERS = {${browserHelperSource()}};
    try { await ${source} } finally {}
  })()`;
  assert.doesNotThrow(() => new vm.Script(injected), script);
}

console.log("Profile configuration tests passed.");
