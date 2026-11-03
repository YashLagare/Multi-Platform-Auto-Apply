const ROLE_VARIANTS = [
  "react developer",
  "react js developer",
  "frontend engineer",
  "frontend developer",
  "full stack developer",
  "full-stack engineer",
  "mern stack developer",
  "software engineer",
  "web developer",
  "ui engineer",
  "associate frontend developer",
  "product development engineer frontend",
  "next.js developer",
  "nextjs developer",
  "javascript developer",
  "react node developer",
  "react typescript developer",
];

const LOCATION_VARIANTS = [
  "India",
  "Remote India",
  "Remote",
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Mumbai",
  "Chennai",
  "Gurgaon",
  "Noida",
  "Delhi NCR",
];

function dedupeList(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function buildAdvancedSearches(siteKey) {
  const siteRoles = {
    foundit: ROLE_VARIANTS,
    naukri: ROLE_VARIANTS,
    indeed: ROLE_VARIANTS,
    linkedin: ROLE_VARIANTS,
    wellfound: [
      "react",
      "react developer",
      "frontend",
      "frontend engineer",
      "full stack",
      "full stack engineer",
      "next.js",
      "mern",
      "javascript",
      "typescript",
      "web developer",
    ],
    instahyre: [
      "react developer",
      "react engineer",
      "frontend developer",
      "frontend engineer",
      "full stack developer",
      "full stack engineer",
      "next.js developer",
      "javascript developer",
      "typescript developer",
    ],
    cutshort: [
      "react jobs",
      "frontend developer jobs",
      "full stack jobs",
      "javascript jobs",
      "nextjs jobs",
    ],
    hirist: [
      "react js jobs",
      "frontend developer jobs",
      "full stack development jobs",
      "javascript jobs",
      "node js jobs",
    ],
    yc: [
      "frontend engineer",
      "full stack engineer",
      "react engineer",
      "software engineer",
    ],
  };

  const searches = [];
  const titles = siteRoles[siteKey] || ROLE_VARIANTS;

  for (const role of titles) {
    if (siteKey === "foundit") {
      for (const location of LOCATION_VARIANTS) {
        searches.push(
          `https://www.foundit.in/srp/results?query=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&experienceRanges=0~3&sort=1`,
        );
      }
    } else if (siteKey === "naukri") {
      const shortRole = role.replace(/\s+/g, "-").replace(/\./g, "");
      searches.push(
        `https://www.naukri.com/${shortRole}-jobs?experience=0&experience=1&experience=2&experience=3`,
      );
    } else if (siteKey === "indeed") {
      for (const location of [
        "India",
        "Remote",
        "Bengaluru",
        "Pune",
        "Hyderabad",
      ]) {
        searches.push(
          `https://in.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}&sc=0kf%3Aattr%28DS3S6%29%3B&sort=date&fromage=7`,
        );
      }
    } else if (siteKey === "linkedin") {
      for (const location of [
        "India",
        "Remote India",
        "Bengaluru",
        "Pune",
        "Hyderabad",
      ]) {
        searches.push(
          `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_AL=true&f_E=2%2C3&sortBy=DD&f_TPR=r604800`,
        );
      }
    } else if (siteKey === "wellfound") {
      searches.push(
        `https://wellfound.com/jobs?query=${encodeURIComponent(role)}`,
      );
    } else if (siteKey === "instahyre") {
      searches.push(
        `https://www.instahyre.com/candidate/opportunities/?q=${encodeURIComponent(role)}`,
      );
    } else if (siteKey === "cutshort") {
      searches.push(
        `https://cutshort.io/jobs/${encodeURIComponent(role.replace(/\s+/g, "-"))}`,
      );
    } else if (siteKey === "hirist") {
      searches.push(
        `https://www.hirist.tech/c/${encodeURIComponent(role.replace(/\s+/g, "-").replace(/-\+|\+/g, ""))}-jobs`,
      );
    } else if (siteKey === "yc") {
      searches.push(
        `https://www.workatastartup.com/jobs?roles=frontend,fullstack&role=${encodeURIComponent(role)}`,
      );
    }
  }

  return dedupeList(searches);
}

function rotateSearches(searches, startIndex = 0) {
  if (!searches.length) return [];
  const start =
    ((startIndex % searches.length) + searches.length) % searches.length;
  return searches.map((url, offset) => ({
    index: (start + offset) % searches.length,
    url: searches[(start + offset) % searches.length],
  }));
}

function describeSearch(searchUrl) {
  try {
    const url = new URL(searchUrl);
    const params = url.searchParams;
    return {
      query:
        params.get("q") ||
        params.get("query") ||
        params.get("keywords") ||
        params.get("role") ||
        url.pathname,
      location: params.get("l") || params.get("location") || "",
    };
  } catch {
    return { query: searchUrl, location: "" };
  }
}

function recordSearchActivity(
  state,
  searchUrl,
  activity,
  timestamp = new Date().toISOString(),
  jobId = "",
) {
  const metric = state.searches[searchUrl] || {
    ...describeSearch(searchUrl),
    visits: 0,
    evaluatedJobs: 0,
    eligibleJobs: 0,
    confirmedApplications: 0,
    evaluatedJobIds: {},
    eligibleJobIds: {},
  };

  if (activity === "visit") metric.visits++;
  else if (activity === "evaluated" || activity === "eligible") {
    const countField =
      activity === "evaluated" ? "evaluatedJobs" : "eligibleJobs";
    const idsField =
      activity === "evaluated" ? "evaluatedJobIds" : "eligibleJobIds";
    metric[idsField] = metric[idsField] || {};
    if (!jobId || !metric[idsField][jobId]) {
      metric[countField]++;
      if (jobId) metric[idsField][jobId] = true;
    }
  } else if (activity === "confirmed") metric.confirmedApplications++;
  else throw new Error(`Unknown search activity: ${activity}`);

  metric.lastActivityAt = timestamp;
  state.searches[searchUrl] = metric;
  return metric;
}

module.exports = {
  buildAdvancedSearches,
  rotateSearches,
  describeSearch,
  recordSearchActivity,
};
