const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "applications.csv");
const VALID_STATUSES = [
  "applied",
  "viewed",
  "phone-screen",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function csvRow(values) {
  return (
    values
      .map(
        (value) =>
          '"' +
          String(value ?? "")
            .replace(/"/g, '""')
            .replace(/\r?\n/g, " ")
            .trim() +
          '"',
      )
      .join(",") + "\n"
  );
}

function updateOutcome(jobLink, status, note = "") {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status "${status}". Use: ${VALID_STATUSES.join(", ")}`,
    );
  }
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error("applications.csv not found.");
  }

  const lines = fs
    .readFileSync(CSV_PATH, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) throw new Error("applications.csv has no records.");

  const header = parseCsvLine(lines[0]);
  const linkIndex = header.indexOf("Job Link");
  const outcomeIndex = header.indexOf("Outcome");
  const outcomeDateIndex = header.indexOf("Outcome Date");
  const outcomeNoteIndex = header.indexOf("Outcome Note");

  if (
    linkIndex === -1 ||
    outcomeIndex === -1 ||
    outcomeDateIndex === -1 ||
    outcomeNoteIndex === -1
  ) {
    throw new Error(
      "applications.csv is missing the outcome columns. Run one live application before updating outcomes.",
    );
  }

  let updated = false;
  const normalizedLink = jobLink.trim();
  const output = [lines[0]];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    if (cells[linkIndex] === normalizedLink) {
      cells[outcomeIndex] = status;
      cells[outcomeDateIndex] = new Date().toLocaleString();
      cells[outcomeNoteIndex] = note;
      output.push(csvRow(cells).trimEnd());
      updated = true;
    } else {
      output.push(line);
    }
  }

  if (!updated) {
    throw new Error(`No application found for job link: ${normalizedLink}`);
  }

  fs.writeFileSync(CSV_PATH, "\uFEFF" + output.join("\n") + "\n");
  return { jobLink: normalizedLink, status, note };
}

function migrateCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error("applications.csv not found.");
  }

  const lines = fs
    .readFileSync(CSV_PATH, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (!lines.length) throw new Error("applications.csv is empty.");

  const header = parseCsvLine(lines[0]);
  if (header.includes("Outcome")) {
    return { migrated: false, records: Math.max(0, lines.length - 1) };
  }

  lines[0] = csvRow(
    [
      ...header,
      "Outcome",
      "Outcome Date",
      "Outcome Note",
    ],
  ).trimEnd();
  for (let i = 1; i < lines.length; i++) {
    lines[i] = csvRow([...parseCsvLine(lines[i]), "applied", "", ""]).trimEnd();
  }

  fs.writeFileSync(CSV_PATH, "\uFEFF" + lines.join("\n") + "\n");
  return { migrated: true, records: lines.length - 1 };
}

if (require.main === module) {
  const [, , jobLink, status, ...noteParts] = process.argv;
  if (jobLink === "--migrate") {
    try {
      const result = migrateCsv();
      console.log(
        result.migrated
          ? `Migrated ${result.records} application records for outcome tracking.`
          : `Outcome columns already exist for ${result.records} application records.`,
      );
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
    return;
  }
  if (!jobLink || !status) {
    console.log(
      "Usage: npm run update-status -- \"<job-link>\" \"<status>\" \"<optional note>\"",
    );
    console.log(`Statuses: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }
  try {
    const result = updateOutcome(jobLink, status, noteParts.join(" "));
    console.log(
      `Updated ${result.jobLink}: ${result.status}${result.note ? ` (${result.note})` : ""}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { VALID_STATUSES, parseCsvLine, updateOutcome, migrateCsv };
