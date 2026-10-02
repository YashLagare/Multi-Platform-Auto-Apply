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
   │   ├── 4. Experience Limit? (4+, 5+, 2-5 yrs, 3-5 yrs, 4-8 yrs) ─► ❌ SKIP: EXPERIENCE_EXCEEDS_LIMIT
   │   ├── 5. Location Fit? (P1/P2/P3 city OR Remote India) ─────────► ❌ SKIP: NON_PRIORITY_ONSITE_LOCATION
   │   └── 6. Full Stack Check (Must contain React/Next/MERN in JD) ──► ❌ SKIP: FULLSTACK_MISSING_REACT_STACK
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
- ✅ **Allowed:** `0–1 yrs`, `0–2 yrs`, `1–3 yrs`, `Entry Level`, `Associate`, `Junior`.
- ❌ **Hard Rejected:** `4+ yrs`, `5+ yrs`, and senior ranges like `2–5 years`, `3–5 years`, `3–6 years`, `4–8 years`.

### 4. Search-Level Pre-Filtering (High Yield)
Search URLs automatically include experience bounds to pre-filter job portal feeds before browser page load:
- **Naukri Feeds:** `?experience=0&experience=1&experience=2&experience=3`
- **Foundit Feeds:** `&experienceRanges=0~3`
- **Hirist Feeds:** `?exp=0-3`
- **LinkedIn Feeds:** `&f_AL=true&f_E=2,3`

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

---

## 📊 Analytics & Reporting

View your live application summary and platform breakdown anytime:
```powershell
npm run stats
```

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

Written By Yash
