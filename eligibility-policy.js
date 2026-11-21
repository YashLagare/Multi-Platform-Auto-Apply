const POLICY = {
  targetRolePatterns: [
    "\\breact(?:\\.js|js)?\\b",
    "\\bnext(?:\\.js|js)?\\b",
    "\\bfrontend\\b|\\bfront-end\\b|\\bfront\\s+end\\b",
    "\\bjavascript\\b|\\bjs\\s+developer\\b|\\btypescript\\b|\\bts\\s+developer\\b",
    "\\bmern(?:\\s+stack)?\\b",
    "\\bfull\\s*stack\\b|\\bfullstack\\b",
    "\\bsoftware\\s+engineer\\b|\\bsoftware\\s+developer\\b|\\bsde\\b",
    "\\bweb\\s+developer\\b",
    "\\bjunior\\s+software\\s+developer\\b",
    "\\bassociate\\s+software\\s+engineer\\b",
    "\\bsoftware\\s+engineer\\s+i\\b",
  ],
  excludedTitlePatterns: [
    "\\b(?:technical\\s+)?co-?founder\\b",
    "\\bcto\\b|\\bchief\\s+technology\\s+officer\\b",
    "\\bfounder\\b",
    "\\bhead\\s+of\\b",
    "\\bdirector\\b",
    "\\bvp\\b|\\bvice\\s+president\\b",
    "\\b(?:engineering|product|project|tech|general|program)\\s+manager\\b",
    "\\bmid[- ]level\\b",
    "\\bsenior\\b|\\bsr\\.?\\b",
    "\\blead\\b",
    "\\bprincipal\\b",
    "\\bstaff\\b",
    "\\barchitect\\b",
    "\\bintern\\b|\\binternship\\b",
    "\\bdesigner\\b|\\bui\\s*\\/\\s*ux\\b",
    "\\bproduct\\s+manager\\b",
    "\\bqa\\b|\\btester\\b|\\btest\\s+engineer\\b|\\bquality\\s+assurance\\b",
    "\\bdevops\\b|\\bsre\\b|\\binfrastructure\\b",
    "\\bdata\\s+engineer\\b|\\bdata\\s+scientist\\b|\\bdata\\s+analyst\\b",
    "\\bsales\\b|\\bmarketing\\b|\\bbdr\\b|\\bsdr\\b",
    "\\btutor\\b|\\bteacher\\b|\\btrainer\\b|\\binstructor\\b|\\bcoach\\b",
    "\\breact\\s*native\\b",
    "\\bjava\\b(?!\\s*script)",
    "\\bspring(?:\\s*boot)?\\b",
    "\\b\\.net\\b|\\bc#\\b",
    "\\bphp\\b|\\blaravel\\b",
    "\\bruby(?:\\s+on\\s+rails)?\\b|\\brails\\b",
    "\\bgolang\\b|\\bgo\\s+developer\\b",
    "\\brust\\b",
    "\\bflutter\\b",
    "\\bswift\\b|\\bios\\b",
    "\\bandroid(?:\\s+native)?\\b",
    "\\bsalesforce\\b|\\bsap\\b",
    "\\bc\\+\\+\\b",
  ],
  maxExperienceYears: 2,
  locations: {
    priority1Pattern: "\\bbengaluru\\b|\\bbangalore\\b|\\bpune\\b|\\bhyderabad\\b",
    priority2Pattern: "\\bremote\\b|\\bmumbai\\b|\\bchennai\\b|\\bgurgaon\\b|\\bgurugram\\b|\\bnoida\\b",
    priority3Pattern: "\\bahmedabad\\b",
    remotePattern: "\\bremote\\b|\\bwork\\s*from\\s*home\\b|\\bwfh\\b|\\banywhere\\b",
    foreignRestrictionPattern:
      "\\b(?:must\\s+reside\\s+in\\s+the\\s+u\\.?s\\.?|us\\s+citizens\\s+only|us\\s+only|uk\\s+only|eu\\s+only|north\\s+america\\s+only)\\b",
  },
  salary: {
    currency: "INR",
    minimumLpa: 3,
    targetRangeLpa: [4, 6],
      enforceWhenDisclosed: false,
  },
  scoreThresholds: {
    wellfound: 55,
    instahyre: 55,
    foundit: 65,
    naukri: 65,
    cutshort: 55,
    hirist: 65,
    yc: 55,
    indeed: 65,
    linkedin: 65,
  },
  highScoreThreshold: 75,
  searchRoles: [
    "react developer",
    "frontend developer",
    "frontend engineer",
    "next.js developer",
    "full stack developer",
    "full stack engineer",
    "mern stack developer",
    "associate software engineer",
    "software engineer i",
    "junior software developer",
    "web developer",
    "typescript developer",
  ],
  searchLocations: [
    "India",
    "Remote India",
    "Bengaluru",
    "Pune",
    "Hyderabad",
    "Mumbai",
    "Chennai",
    "Gurgaon",
    "Noida",
    "Ahmedabad",
  ],
};

function checkTitle(title, policy = POLICY) {
  const text = title || "";
  const exclusion = policy.excludedTitlePatterns.find((pattern) =>
    new RegExp(pattern, "i").test(text),
  );
  if (exclusion) {
    return { pass: false, reason: `HARD_TITLE_EXCLUSION (${exclusion})` };
  }
  if (
    !policy.targetRolePatterns.some((pattern) =>
      new RegExp(pattern, "i").test(text),
    )
  ) {
    return { pass: false, reason: "NOT_A_TARGET_ROLE" };
  }
  return { pass: true };
}

function checkExperience(text, policy = POLICY) {
  const value = text || "";
  const maxYears = policy.maxExperienceYears;
  const rangePattern =
    /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\b/gi;
  let match;
  while ((match = rangePattern.exec(value))) {
    if (Number(match[2]) > maxYears) {
      return {
        pass: false,
        reason: `EXPERIENCE_EXCEEDS_LIMIT (${match[0]})`,
      };
    }
  }

  const yearPattern = /\b(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\b/gi;
  while ((match = yearPattern.exec(value))) {
    if (Number(match[1]) > maxYears) {
      return {
        pass: false,
        reason: `EXPERIENCE_EXCEEDS_LIMIT (${match[0]})`,
      };
    }
  }

  return { pass: true };
}

function checkLocation(text, policy = POLICY) {
  const value = text || "";
  const locations = policy.locations;
  if (new RegExp(locations.foreignRestrictionPattern, "i").test(value)) {
    return { pass: false, reason: "FOREIGN_LOCATION_RESTRICTION" };
  }
  if (
    new RegExp(locations.priority1Pattern, "i").test(value) ||
    new RegExp(locations.priority2Pattern, "i").test(value) ||
    new RegExp(locations.priority3Pattern, "i").test(value) ||
    new RegExp(locations.remotePattern, "i").test(value)
  ) {
    return { pass: true };
  }
  return { pass: false, reason: "NON_PRIORITY_ONSITE_LOCATION" };
}

const browserHelpers = { checkTitle, checkExperience, checkLocation };

function browserHelperSource() {
  return Object.entries(browserHelpers)
    .map(([name, fn]) => `${name}: ${fn.toString()}`)
    .join(",");
}

module.exports = {
  POLICY,
  checkTitle,
  checkExperience,
  checkLocation,
  browserHelperSource,
};
