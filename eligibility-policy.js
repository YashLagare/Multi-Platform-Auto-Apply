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
  jobQuality: {
    minDescriptionCharacters: 120,
    urgentHiringPattern:
      "\\burgent(?:ly)?\\s+hir(?:e|ing)\\b|\\bhiring\\s+immediately\\b|\\bimmediate\\s+joiner\\b|\\bjoin\\s+immediately\\b",
    preferredStackPattern:
      "\\breact(?:\\.js|js)?\\b|\\bnext(?:\\.js|js)?\\b|\\bjavascript\\b|\\btypescript\\b|\\bnode(?:\\.js|js)?\\b|\\bexpress(?:\\.js|js)?\\b|\\bmern\\b|\\bmongodb\\b|\\bpostgres(?:ql)?\\b|\\btailwind\\b|\\bprisma\\b|\\bdrizzle\\b|\\bredux\\b|\\bzustand\\b",
    unrelatedStackPattern:
      "\\bangular\\b|\\bvue(?:\\.js|js)?\\b|\\bsvelte\\b|\\bjava(?!script)\\b|\\bspring(?:\\s*boot)?\\b|\\bpython\\b|\\bdjango\\b|\\bflask\\b|\\bc#\\b|\\.net\\b|\\bphp\\b|\\blaravel\\b|\\bruby\\b|\\brails\\b|\\bgolang\\b|\\brust\\b|\\bflutter\\b|\\bswift\\b|\\bios\\b|\\bandroid\\b",
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

function checkJobQuality(job, policy = POLICY) {
  const value = job || {};
  const title = String(value.title || "");
  const description = String(value.description || "");
  const employmentType = String(value.employmentType || "");
  const skills = String(value.skills || "");
  const company = String(value.company || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const companyBlocklist = (policy.companyBlocklist || []).map((name) =>
    String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
  );

  if (company && companyBlocklist.includes(company)) {
    return {
      pass: false,
      reason: "COMPANY_BLOCKLIST",
      warnings: [],
      penalty: 0,
    };
  }

  const titleOrTypePattern =
    /\bintern(?:ship)?\b|\bpart[- ]time\b|\bfreelance(?:r)?\b|\btemporary\b|\bseasonal\b|\bcontract\b/i;
  const descriptionEmploymentPattern =
    /\bcontract[- ]to[- ]hire\b|\b(?:fixed[- ]term|contract)\s+(?:role|position|job|employment)\b|\b\d+\s*[- ]month(?:s)?\s+contract\b|\b(?:employment|job|role)\s+type\s*[:=-]\s*(?:contract|intern(?:ship)?|part[- ]time|temporary|freelance)\b|\binternship\s+(?:role|position|opportunity)\b/i;
  if (
    titleOrTypePattern.test(`${title}\n${employmentType}`) ||
    descriptionEmploymentPattern.test(description)
  ) {
    return {
      pass: false,
      reason: "NON_FULL_TIME_ROLE",
      warnings: [],
      penalty: 0,
    };
  }

  const quality = policy.jobQuality || POLICY.jobQuality;
  const requirementPattern =
    /\b(?:must|required|mandatory|proficient|expertise|strong experience|experience with|hands-on experience with|minimum qualifications)\b/i;
  const preferredStackPattern = new RegExp(
    quality.preferredStackPattern,
    "i",
  );
  const unrelatedStackPattern = new RegExp(
    quality.unrelatedStackPattern,
    "i",
  );
  const requirementClauses = `${title}\n${skills}\n${description}`.split(
    /[\n.;!?]+/,
  );
  const hasUnrelatedRequiredStack = requirementClauses.some(
    (clause) =>
      requirementPattern.test(clause) &&
      unrelatedStackPattern.test(clause) &&
      !preferredStackPattern.test(clause),
  );
  if (hasUnrelatedRequiredStack) {
    return {
      pass: false,
      reason: "UNRELATED_REQUIRED_STACK",
      warnings: [],
      penalty: 0,
    };
  }

  const warnings = [];
  let penalty = 0;
  if (!description.trim()) {
    warnings.push("DESCRIPTION_UNAVAILABLE");
  } else if (description.trim().length < quality.minDescriptionCharacters) {
    warnings.push("DESCRIPTION_TOO_SHORT");
    penalty = 5;
  } else {
    const paragraphs = description
      .split(/\r?\n/)
      .map((paragraph) => paragraph.toLowerCase().replace(/\s+/g, " ").trim())
      .filter((paragraph) => paragraph.length >= 80);
    const uniqueParagraphs = new Set(paragraphs);
    if (
      paragraphs.length >= 3 &&
      uniqueParagraphs.size <= paragraphs.length / 2
    ) {
      warnings.push("REPETITIVE_DESCRIPTION");
      penalty = 10;
    }
  }

  if (new RegExp(quality.urgentHiringPattern, "i").test(description)) {
    warnings.push("URGENT_HIRING_LANGUAGE");
  }

  return { pass: true, warnings, penalty };
}

function applyQualityAdjustment(
  result,
  qualityCheck,
  scoreThreshold,
  highScoreThreshold,
) {
  if (!qualityCheck.penalty) return result;

  result.score = Math.max(0, result.score - qualityCheck.penalty);
  result.breakdown +=
    `, Job quality: -${qualityCheck.penalty} (${qualityCheck.warnings.join(", ")})`;
  result.passed = result.score >= scoreThreshold;
  result.action =
    result.score >= highScoreThreshold
      ? "HIGH_PRIORITY_APPLY"
      : result.passed
        ? "MODERATE_APPLY"
        : "LOW_SCORE_SKIP";
  return result;
}

const browserHelpers = {
  checkTitle,
  checkExperience,
  checkLocation,
  checkJobQuality,
  applyQualityAdjustment,
};

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
  checkJobQuality,
  applyQualityAdjustment,
  browserHelperSource,
};
