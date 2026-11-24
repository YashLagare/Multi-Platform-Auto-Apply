# Multi-Platform Auto-Apply Suite (Wellfound + Instahyre + Foundit + Naukri + Cutshort + Hirist + YC + Indeed + LinkedIn)

A unified, precision-first automated job application suite for **Wellfound**, **Instahyre**, **Foundit**, **Naukri**, **Cutshort**, **Hirist**, **YC Work at a Startup**, **Indeed India**, and **LinkedIn Easy Apply**.
Built with **Node.js, Playwright Stealth, and Google Gemini AI**, it features an intelligent **Two-Layer Decision Pipeline** that evaluates full job requirements, enforces strict hard exclusions, prevents duplicate applications permanently across sessions, and calculates a multi-factor match score (0–100) before applying.

---

## 🏛 Supported Platforms & Architecture

| Platform | Domain | Flow Supported | Chrome Session Profile |
|---|---|---|---|
| **Wellfound** | `wellfound.com` | Feed Infinite Scroll + Custom Cover Letters + Screening Q&A | `.wellfound-chrome-profile/` |
| **Instahyre** | `instahyre.com` | Opportunities Feed + 1-Click Apply + Questionnaire/Note Modals | `.instahyre-chrome-profile/` |
| **Foundit** | `foundit.in` | Pre-filtered SRP Search + Quick Apply + Screening Questionnaires | `.foundit-chrome-profile/` |
| **Naukri** | `naukri.com` | Pre-filtered Search Tuples + Direct 1-Click Apply + Chatbot Modals | `.naukri-chrome-profile/` |
| **Cutshort** | `cutshort.io` | Discover Feed + 1-Click Apply + Startup Pitch Notes & Salary Modals | `.cutshort-chrome-profile/` |
| **Hirist** | `hirist.tech` | Tech-exclusive Feeds + 1-Click Quick Apply + Screening Popups | `.hirist-chrome-profile/` |
| **YC Work at a Startup** | `workatastartup.com` | YC Startup Feed + Direct Founder Pitch Generator | `.yc-chrome-profile/` |
| **Indeed India** | `in.indeed.com` | "Easily Apply" Multi-step Form & Review Automation | `.indeed-chrome-profile/` |
| **LinkedIn** | `linkedin.com` | "Easy Apply" Multi-step Dialogs with Stealth Throttling | `.linkedin-chrome-profile/` |

```text
[Job / Candidate Opportunity Found]
   │
   ▼
[Extract Unique Job/Opportunity ID]
   │
   ├── Layer 1: Absolute Hard Filters (Score NEVER overrides a Hard Filter)
   │   ├── 1. Already Applied? (Check applied-jobs-*.json & CSV) ────► ❌ SKIP: ALREADY_APPLIED
   │   ├── 2. External Redirect? (Skip non-Quick Apply ATS links) ──► ❌ SKIP: EXTERNAL_ATS_REDIRECT
   │   ├── 3. Title Hard Exclusion? (Co-Founder, CTO, Senior, etc.) ──► ❌ SKIP: HARD_TITLE_EXCLUSION
   │   ├── 4. Job Quality? (Employment type, required stack, optional company exclusions)
   │   ├── 5. Experience Limit? (4+, 5+, 2-5 yrs, 3-5 yrs, 4-8 yrs) ─► ❌ SKIP: EXPERIENCE_EXCEEDS_LIMIT
   │   ├── 6. Location Fit? (P1/P2/P3 city OR Remote India) ─────────► ❌ SKIP: NON_PRIORITY_ONSITE_LOCATION
   │   └── 7. Full Stack Check (Must contain React/Next/MERN in JD) ──► ❌ SKIP: FULLSTACK_MISSING_REACT_STACK
   │
   └── Layer 2: Match Scoring Engine (0–100 Points)
       ├── Role Alignment (Max 25 pts)
       ├── Tech Stack Match (Max 35 pts)
       ├── Experience Fit (Max 20 pts)
       ├── Location Tier (Max 10 pts)
       └── Freshness & Opportunity Rank (Max 10 pts)
           │
           ├── Score < 65  ──────► ❌ SKIP: LOW_MATCH_SCORE
           ├── Score 65–74 ──────► 🟡 APPLY (Moderate match with tailored pitch)
           └── Score 75+   ──────► 🟢 AUTO APPLY (High-priority target role)
```

---

## 🎯 Target Specifications & Filtering Rules

### 1. Target Roles
- `React Developer` / `React.js Developer`
- `Frontend Engineer` / `Frontend Developer`
- `JavaScript Developer`
- `Next.js Developer`
- `MERN Stack Developer`
- `Full Stack Developer` *(strictly required to have React/Next/MERN in JD)*
- `Software Engineer` / `Software Developer` / `SDE`

### 2. Hard Excluded Roles & Stacks
- **Leadership / Executive:** `Technical Co-Founder`, `Co-Founder`, `CTO`, `Founder`, `Head of`, `Director`, `VP`, `Manager`.
- **Seniority:** `Senior`, `Sr.`, `Lead`, `Principal`, `Staff`, `Architect`.
- **Non-Engineering:** `Intern`, `Designer`, `QA`, `Tester`, `DevOps`, `Data Engineer`, `Sales`, `Tutor`.
- **Unrelated Stacks:** `Java` (non-JS), `Spring Boot`, `.NET`, `C#`, `PHP`, `Ruby`, `Golang`, `Flutter`, `iOS`, `Android`.

### 3. Experience Limits
- ✅ **Allowed:** Requirements up to **2 years**, `Entry Level`, `Associate`, and `Junior`.
- ❌ **Hard Rejected:** Requirements above 2 years, including `1–3 years`, `2–5 years`, and `3+ years`.

The application profile keeps numeric experience separate from its narrative summary. Set `EXPERIENCE_YEARS_NUMERIC` for numeric form fields and `EXPERIENCE_SUMMARY` for free-text questions. Leave salary, availability, and work-authorization fields blank unless their values are accurate; the automation does not invent fallback answers.

The profile headline, summary, skills, education, and up to five evidence-based highlights feed generated pitches and screening answers. Review them in your ignored `.env` whenever your resume changes.

Application answers use configured salary and notice-period values only; unknown personal facts are left unanswered instead of guessed. Set `REMOTE_WORK_PREFERENCE` and `RELOCATION_PREFERENCE` in `.env` if you want those answers filled. Unconfigured salary, authorization, location, and other sensitive questions are not generated by AI. Required fields that remain unanswered are reported for manual review and block submission.

### 4. Search-Level Pre-Filtering (High Yield)
Search URLs automatically include experience bounds to pre-filter job portal feeds before browser page load:
- **Naukri Feeds:** `?experience=0&experience=1&experience=2&experience=3`
- **Foundit Feeds:** `&experienceRanges=0~3`
- **Hirist Feeds:** category search pages (canonical URLs; legacy `.html?exp=0-3` URLs redirect and drop the experience query)
- **LinkedIn Feeds:** `&f_AL=true&f_E=2,3`

The runner now expands the query matrix across multiple job-title variants and Indian/remote locations so it covers React, Frontend, Full Stack, MERN, Next.js, and startup-product-engineering titles instead of relying on a tiny fixed URL list.

Search URLs rotate across runs from a saved per-platform cursor instead of restarting at the first query. Indeed and LinkedIn searches request recent listings (last 7 days) and sort by date where supported. The runner records visits, unique evaluated/eligible jobs, and confirmed live applications per search in `search-performance-<platform>.json`; `npm run stats` shows the highest-yield searches. Dry runs count eligible jobs but never count submissions as confirmed applications.

Step 5 ranks search URLs for subsequent runs using eligible-job yield and confirmed application yield per visit. Previously unvisited searches are explored first, then searches with stronger measured yield are prioritized. `npm run stats` reports eligible and confirmed rates per visit instead of only raw totals. Dry runs count eligible jobs but never count submissions as confirmed applications.

The shared eligibility policy in `eligibility-policy.js` is the source of truth for target role titles, excluded titles/stacks, a 0–2 year experience limit, location priorities, search terms, and per-platform score thresholds. Salary preference is ₹3 LPA minimum (target ₹4–6 LPA); salary is informational only for now because platforms expose it inconsistently, so no listing is auto-rejected based on salary.

Job-quality checks skip clearly labeled internships, contract/freelance/part-time roles, and postings whose explicit required stack conflicts with the target JavaScript stack. Short or repetitive descriptions reduce the match score; urgent-hiring language is logged as a caution rather than treated as proof of a bad listing. To exclude companies based on your own research, set `EXCLUDED_COMPANIES` in `.env` to exact names separated by `||`. This is a manual exclusion list; the automation does not infer company reputation.

### 5. Location Hierarchy
- **Priority 1:** Bengaluru, Pune, Hyderabad *(Remote, Hybrid, On-site)*
- **Priority 2:** Remote (India/Global), Mumbai, Chennai, Gurgaon / Gurugram, Noida / Delhi NCR *(Remote, Hybrid, On-site)*
- **Priority 3:** Ahmedabad *(Remote, Hybrid, On-site)*
- **Other Cities:** **MUST be Remote only** (e.g. Jaipur On-site is automatically skipped).

---

## 🚀 Quick Start & Usage Commands

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Your Profile in `.env`
Fill in your details in `.env` once. All 9 platforms share the exact same configuration!

---

### 3. Platform Commands

| Platform | Step 1: One-Time Login | Step 2: Safe Dry Run | Step 3: Apply Live |
|---|---|---|---|
| **Wellfound** | `npm run login:wellfound` | `npm run dry-run:wellfound` | `npm run apply:wellfound` |
| **Instahyre** | `npm run login:instahyre` | `npm run dry-run:instahyre` | `npm run apply:instahyre` |
| **Foundit** | `npm run login:foundit` | `npm run dry-run:foundit` | `npm run apply:foundit` |
| **Naukri** | `npm run login:naukri` | `npm run dry-run:naukri` | `npm run apply:naukri` |
| **Cutshort** | `npm run login:cutshort` | `npm run dry-run:cutshort` | `npm run apply:cutshort` |
| **Hirist** | `npm run login:hirist` | `npm run dry-run:hirist` | `npm run apply:hirist` |
| **YC Startups** | `npm run login:yc` | `npm run dry-run:yc` | `npm run apply:yc` |
| **Indeed India** | `npm run login:indeed` | `npm run dry-run:indeed` | `npm run apply:indeed` |
| **LinkedIn** | `npm run login:linkedin` | `npm run dry-run:linkedin` | `npm run apply:linkedin` |

Dry-run mode never clicks an Apply or final Submit button and does not add jobs to local applied history. It can still open job details and report eligible applications it would attempt. Live clicks require the runner to explicitly set live mode through the `npm run apply:<platform>` command.

### Hirist troubleshooting

Hirist runs report the final page URL, HTTP response, page title, detected job-link count, and login/verification/no-results indicators before scraping. A 403 from Hirist's chat-service permission endpoint is reported separately from a likely job-feed 403; it does not by itself prove the job feed was denied. Empty search categories are skipped instead of polled for several minutes. If every category has zero job links, verify that the search feed loads in the saved Chrome profile. A live application is only recorded after the page shows an application confirmation; dry runs do not submit or mark jobs as applied.

## 🩺 System Health Check

Run the diagnostic doctor to verify `.env` parameters, AI connectivity, Chrome profile data, and tracking integrity:
```powershell
npm run check
```

The runner also performs platform-specific startup checks and inspects each search page for login redirects, CAPTCHA/human verification, unexpected domains, HTTP errors, and missing results. It stops rather than trying to bypass login or verification checks. Browser navigation is retried once, and application runs write a structured, query-redacted JSON report to the ignored `run-reports/` folder. Reports include counters and diagnostic/error events, but not profile values.

---

## 📊 Analytics & Reporting

View your live application summary and platform breakdown anytime:
```powershell
npm run stats
```

Record an application outcome with the exact job link from `applications.csv`:
```powershell
npm run update-status -- "https://example.com/job/123" "interview" "Recruiter scheduled a call"
```

If upgrading an existing CSV, migrate its history once:
```powershell
npm run migrate-outcomes
```

Valid statuses: `applied`, `viewed`, `phone-screen`, `assessment`, `interview`, `offer`, `rejected`, `withdrawn`.

The CSV now tracks the default outcome `applied`, outcome date, and optional outcome note. Existing CSV rows remain compatible and are treated as applied unless updated.

---

## 🧪 Testing & Verification

Run the built-in diagnostic test suites across all 9 platforms anytime:
```powershell
# Run all 9 test suites together (45+ unit tests):
npm test

# Or individually:
node test-decision-pipeline.js   # Wellfound
node test-instahyre-pipeline.js  # Instahyre
node test-foundit-pipeline.js    # Foundit
node test-naukri-pipeline.js     # Naukri
node test-cutshort-pipeline.js   # Cutshort
node test-hirist-pipeline.js     # Hirist
node test-yc-pipeline.js         # YC Work at a Startup
node test-indeed-pipeline.js     # Indeed India
node test-linkedin-pipeline.js   # LinkedIn Easy Apply
```

---

Written By Yash Lagare.
