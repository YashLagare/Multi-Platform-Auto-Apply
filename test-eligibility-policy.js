const assert = require("assert");
const vm = require("vm");
const {
  POLICY,
  checkTitle,
  checkExperience,
  checkLocation,
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

console.log("Shared eligibility policy tests passed.");
