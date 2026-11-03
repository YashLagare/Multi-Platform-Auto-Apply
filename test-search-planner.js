const assert = require("assert");
const {
  buildAdvancedSearches,
  rotateSearches,
  describeSearch,
  recordSearchActivity,
} = require("./search-planner");

const searches = ["first", "second", "third"];
const indeedSearches = buildAdvancedSearches("indeed");
assert(indeedSearches.some((url) => url.includes("l=Bengaluru")));
assert(indeedSearches.some((url) => url.includes("l=Remote")));
assert(indeedSearches.every((url) => url.includes("sort=date&fromage=7")));

const linkedInSearches = buildAdvancedSearches("linkedin");
assert(linkedInSearches.every((url) => url.includes("f_TPR=r604800")));
assert(linkedInSearches.every((url) => url.includes("sortBy=DD")));

assert(buildAdvancedSearches("wellfound").length > 6);
assert(buildAdvancedSearches("instahyre").length > 4);

assert.deepStrictEqual(
  rotateSearches(searches, 1),
  [
    { index: 1, url: "second" },
    { index: 2, url: "third" },
    { index: 0, url: "first" },
  ],
);
assert.deepStrictEqual(rotateSearches(searches, 3), rotateSearches(searches, 0));
assert.deepStrictEqual(rotateSearches([], 0), []);

assert.deepStrictEqual(
  describeSearch("https://example.com/jobs?q=frontend&l=India"),
  { query: "frontend", location: "India" },
);

const state = { searches: {} };
recordSearchActivity(state, searches[0], "visit", "2026-01-01T00:00:00.000Z");
recordSearchActivity(state, searches[0], "evaluated", undefined, "job-1");
recordSearchActivity(state, searches[0], "evaluated", undefined, "job-1");
recordSearchActivity(state, searches[0], "eligible", undefined, "job-1");
recordSearchActivity(state, searches[0], "eligible", undefined, "job-1");
recordSearchActivity(state, searches[0], "confirmed");
assert.deepStrictEqual(
  {
    visits: state.searches.first.visits,
    evaluatedJobs: state.searches.first.evaluatedJobs,
    eligibleJobs: state.searches.first.eligibleJobs,
    confirmedApplications: state.searches.first.confirmedApplications,
  },
  { visits: 1, evaluatedJobs: 1, eligibleJobs: 1, confirmedApplications: 1 },
);

console.log("Search rotation and performance tracking tests passed.");
