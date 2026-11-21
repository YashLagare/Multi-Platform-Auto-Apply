const assert = require("assert");
const { VALID_STATUSES, parseCsvLine } = require("./outcome");

assert(
  VALID_STATUSES.includes("applied") &&
    VALID_STATUSES.includes("interview") &&
    VALID_STATUSES.includes("rejected"),
);

assert.deepStrictEqual(
  parseCsvLine(
    '"21/11/2026","instahyre","Developer","Example, Inc.","","","65/100","https://example.com/job","Description","interview","21/11/2026","Recruiter call"',
  ),
  [
    "21/11/2026",
    "instahyre",
    "Developer",
    "Example, Inc.",
    "",
    "",
    "65/100",
    "https://example.com/job",
    "Description",
    "interview",
    "21/11/2026",
    "Recruiter call",
  ],
);

console.log("Outcome tracking CSV tests passed.");
