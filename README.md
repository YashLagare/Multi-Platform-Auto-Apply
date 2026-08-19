# Multi-Platform Auto-Apply Suite (Wellfound + Instahyre)

A unified, precision-first automated job application suite for **Wellfound** (formerly AngelList Talent) and **Instahyre** (`instahyre.com`).
Built with **Node.js, Playwright Stealth, and Google Gemini AI**, it features an intelligent **Two-Layer Decision Pipeline** that evaluates full job requirements, enforces strict hard exclusions, prevents duplicate applications permanently across sessions, and calculates a multi-factor match score (0–100) before applying.

---

## 🏛 Supported Platforms & Architecture

| Platform | Domain | Flow Supported | Chrome Session Profile |
|---|---|---|---|
| **Wellfound** | `wellfound.com` | Feed Infinite Scroll + Custom Cover Letters + Screening Q&A | `.wellfound-chrome-profile/` |
| **Instahyre** | `instahyre.com` | Opportunities Feed + 1-Click Apply + Questionnaire/Note Modals | `.instahyre-chrome-profile/` |

```text
[Candidate Opportunity Found]
   │
   ▼
[Extract Unique Job/Opportunity ID]
   │
   ├── Layer 1: Absolute Hard Filters (Score NEVER overrides a Hard Filter)
   │   ├── 1. Already Applied? (Check applied-jobs.json & CSV) ──────► ❌ SKIP: ALREADY_APPLIED
   │   ├── 2. Title Hard Exclusion? (Co-Founder, CTO, Senior, etc.) ──► ❌ SKIP: HARD_TITLE_EXCLUSION
   │   ├── 3. Experience Limit? (4+, 5+, 2-5 yrs, 3-5 yrs in JD) ────► ❌ SKIP: EXPERIENCE_EXCEEDS_LIMIT
   │   ├── 4. Location Fit? (P1/P2/P3 city OR Remote India) ─────────► ❌ SKIP: NON_PRIORITY_ONSITE_LOCATION
   │   └── 5. Full Stack Check (Must contain React/Next/MERN in JD) ──► ❌ SKIP: FULLSTACK_MISSING_REACT_STACK
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
- ❌ **Hard Rejected:** `4+ yrs`, `5+ yrs`, and senior ranges like `2–5 years`, `3–5 years`, `4–7 years`.

### 4. Location Hierarchy
- **Priority 1:** Bengaluru, Pune, Hyderabad *(Remote, Hybrid, On-site)*
- **Priority 2:** Remote (India), Mumbai, Chennai, Gurgaon / Gurugram, Noida / Delhi NCR *(Remote, Hybrid, On-site)*
- **Priority 3:** Ahmedabad *(Remote, Hybrid, On-site)*
- **Other Cities:** **MUST be Remote only** (e.g. Jaipur On-site is automatically skipped).

---

## 🚀 Quick Start & Usage Commands

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Your Profile in `.env`
Fill in your details in `.env` once. Both Wellfound and Instahyre use the exact same configuration!

---

### 3. Running Wellfound

```powershell
# Step 1: One-time login to save your session
npm run login:wellfound

# Step 2: Safe dry run (evaluates scores, simulates apply without submitting)
npm run dry-run:wellfound

# Step 3: Apply live for real
npm run apply:wellfound
```

---

### 4. Running Instahyre

```powershell
# Step 1: One-time login to save your session
npm run login:instahyre

# Step 2: Safe dry run (evaluates opportunities, fills questionnaires, simulates apply)
npm run dry-run:instahyre

# Step 3: Apply live for real
npm run apply:instahyre
```

---

## 🧪 Testing & Verification

Run the built-in diagnostic test suites anytime:
```powershell
# Run Instahyre pipeline test suite
node test-instahyre-pipeline.js

# Run Wellfound pipeline test suite
node test-decision-pipeline.js
```

---

## ⚙️ Customizing for Senior Developers (4+ Years Exp)

If you are a **Senior Engineer, Tech Lead, Staff/Principal Engineer, or Architect (4+ years)**:
1. **Remove Senior Titles from Hard Exclusions:**
   In `wellfound-auto-apply.js` and `instahyre-auto-apply.js`, remove `/\bsenior\b/`, `/\blead\b/`, `/\bprincipal\b/`, and `/\bstaff\b/` from `TITLE_HARD_EXCLUSIONS`.
2. **Add Senior Roles to Target List:**
   Add `/\bsenior\s+frontend\b/`, `/\blead\s+engineer\b/` to `TARGET_ROLE_PATTERNS`.
3. **Invert Experience Filtering:**
   In `checkExperienceExclusion()`, remove the 4+ yr rejection (and optionally skip junior 0-1 yr roles).
4. **Update Profile in `.env`:**
   Set `CURRENT_ROLE=Senior Frontend Engineer at TechCorp`, `YEARS_EXPERIENCE=5+ years...`.

---

## 📁 Key Project Files

| File | Description |
|---|---|
| [`instahyre-auto-apply.js`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/instahyre-auto-apply.js) | Core Instahyre engine: Two-layer pipeline, 1-click & modal automation, and Gemini AI. |
| [`wellfound-auto-apply.js`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/wellfound-auto-apply.js) | Core Wellfound engine: Two-layer pipeline, JD scraping, and cover letter generator. |
| [`auto-apply-runner.js`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/auto-apply-runner.js) | Playwright Stealth supervisor managing multi-platform sessions, daily caps, and tracking. |
| [`applied-jobs-wellfound.json`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/applied-jobs-wellfound.json) | Anti-duplicate database for Wellfound. |
| [`applied-jobs-instahyre.json`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/applied-jobs-instahyre.json) | Anti-duplicate database for Instahyre. |
| [`applications.csv`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/applications.csv) | Unified application history log across all platforms with Match Scores. |
| [`.env`](file:///d:/MY-PROJECTS/Wellfound_AutoApply_WorkFlow/.env) | Shared CV context, credentials, and Gemini API key. |

---

Written By Yash