# Wellfound Auto-Apply (Precision Two-Layer Engine)

An automated, precision-first job application tool for [Wellfound](https://wellfound.com) (formerly AngelList Talent).
Built with **Node.js, Playwright Stealth, and Google Gemini AI**, it features a **Two-Layer Decision Pipeline** that evaluates full job descriptions (JDs), enforces strict hard exclusions, prevents duplicate applications across sessions, and calculates a multi-factor match score (0–100) before submitting.

---

## 🏛 Two-Layer Decision Architecture

```text
[Job Card Found]
   │
   ▼
[Extract Job ID]
   │
   ├── Layer 1: Absolute Hard Filters (Score NEVER overrides a Hard Filter)
   │   ├── 1. Already Applied? (Check applied-jobs.json & CSV) ──────► ❌ SKIP: ALREADY_APPLIED
   │   ├── 2. Title Hard Exclusion? (Co-Founder, CTO, Senior, etc.) ──► ❌ SKIP: HARD_TITLE_EXCLUSION
   │   ├── 3. Scrape Full JD & Quality Check (< 80 chars?) ───────────► ❌ SKIP: INSUFFICIENT_JD_DATA
   │   ├── 4. Experience Limit? (4+, 5+, 2-5 yrs, 3-5 yrs in JD) ────► ❌ SKIP: EXPERIENCE_EXCEEDS_LIMIT
   │   ├── 5. Location Fit? (P1/P2/P3 city OR Remote India) ─────────► ❌ SKIP: NON_PRIORITY_ONSITE_LOCATION
   │   └── 6. Full Stack Check (Must contain React/Next/MERN in JD) ──► ❌ SKIP: FULLSTACK_MISSING_REACT_STACK
   │
   └── Layer 2: Match Scoring Engine (0–100 Points)
       ├── Role Alignment (Max 25 pts)
       ├── Tech Stack Match (Max 35 pts)
       ├── Experience Fit (Max 20 pts)
       ├── Location Tier (Max 10 pts)
       └── Freshness (Max 10 pts)
           │
           ├── Score < 65  ──────► ❌ SKIP: LOW_MATCH_SCORE
           ├── Score 65–74 ──────► 🟡 APPLY (Moderate match with tailored highlights)
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
- ✅ **Allowed:** `0–1 yrs`, `0–2 yrs`, `1–3 yrs`, `Entry Level`, `Associate`, `Junior`.
- ❌ **Hard Rejected:** `4+ yrs`, `5+ yrs`, and senior ranges like `2–5 years`, `3–5 years`, `4–6 years`.

### 4. Location Hierarchy
- **Priority 1:** Bengaluru, Pune, Hyderabad *(Remote, Hybrid, On-site)*
- **Priority 2:** Remote (India), Mumbai, Chennai, Gurgaon / Gurugram, Noida / Delhi NCR *(Remote, Hybrid, On-site)*
- **Priority 3:** Ahmedabad *(Remote, Hybrid, On-site)*
- **Other Cities:** **MUST be Remote only** (e.g. Jaipur On-site is automatically skipped).

---

## 🚀 Setup & Usage

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Your Profile in `.env`
Ensure your details in `.env` are filled (Name, Email, Skills, Highlights, and optional `GEMINI_KEY`).

### 3. One-Time Login (Visible Chrome)
```powershell
npm run login
# or: node auto-apply-runner.js wellfound login
```
Log in to your Wellfound account, then close the browser window. Your session is saved to `.wellfound-chrome-profile/`.

### 4. Safe Dry Run (Test & Inspect Live Evaluations)
```powershell
npm run dry-run
# or: node auto-apply-runner.js wellfound
```
- Scans job feed, extracts full JDs, runs Layer 1 & Layer 2 checks.
- Displays match scores and evaluation breakdown in terminal.
- Simulates submission without clicking the final Send button.

### 5. Go Live (Submit Applications for Real)
```powershell
npm run apply
# or: node auto-apply-runner.js wellfound --live
```
- Submits applications up to your daily target (default: 50/day).
- Persists applied job IDs to `applied-jobs.json` to **guarantee 0 duplicates**.
- Appends submissions with Match Score to `applications.csv`.

---

## 🧪 Testing & Verification

Run the built-in diagnostic test suite anytime:
```powershell
node test-decision-pipeline.js
```
Runs 8 test cases verifying that Co-Founders, Wise-style 2–5 yr ranges, non-priority on-site jobs, and duplicates are 100% blocked while valid React/Frontend jobs achieve 90+ scores.

---

## 📁 Key Project Files

| File | Description |
|---|---|
| [`applied-jobs.json`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/applied-jobs.json) | Persistent database of all historically applied job IDs (prevents duplicates forever). |
| [`wellfound-auto-apply.js`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/wellfound-auto-apply.js) | Core in-page engine: Layer 1 Hard Filters, JD scraping, Layer 2 Scoring, and form automation. |
| [`auto-apply-runner.js`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/auto-apply-runner.js) | Playwright Stealth supervisor: session management, quota tracking, and CSV/JSON persistence. |
| [`test-decision-pipeline.js`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/test-decision-pipeline.js) | Unit test suite covering positive & negative decision criteria. |
| [`applications.csv`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/applications.csv) | Full audit log of submitted applications with Match Scores. |
| [`.env`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/.env) | Your personal CV context, credentials, and Gemini API key. |
