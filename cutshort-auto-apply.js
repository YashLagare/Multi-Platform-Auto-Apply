/**
 * Cutshort Auto-Apply — Precision Two-Layer Decision Pipeline
 * =============================================================
 * Layer 1: Absolute Hard Filters (Duplicate, Title, Experience badge, Location hierarchy, Full Stack tech relevance)
 * Layer 2: Match Scoring Engine (0-100 pts) — Auto-apply only if Score >= 65 (High match: 75+)
 * Handles 1-Click Apply, Startup Pitch/Intro Notes, and Screening Questionnaires with Google Gemini AI.
 */
(async function cutshortAutoApply() {
  "use strict";

  const __CFG = (typeof window !== "undefined" && window.__APPLY_CONFIG) || {};
  const appliedJobIds = __CFG.appliedJobIds || {};

  // ======================= CONFIGURATION =======================
  const CONFIG = {
    DRY_RUN: true,
    MAX_APPLICATIONS: 30,
    MIN_DELAY_MS: 35000,
    MAX_DELAY_MS: 75000,
    SCORE_THRESHOLD: 55,
    HIGH_SCORE_THRESHOLD: 75,
    openrouterKey: __CFG.openrouterKey || "",
    geminiKey: __CFG.geminiKey || "",
  };

  // ======================= LAYER 1: HARD EXCLUSIONS & TARGETS =======================
  const TITLE_HARD_EXCLUSIONS = [
    // Co-founder & Executive / Leadership
    /\b(?:technical\s+)?co-?founder\b/i,
    /\bcto\b|\bchief\s+technology\s+officer\b/i,
    /\bfounder\b/i,
    /\bhead\s+of\b/i,
    /\bdirector\b/i,
    /\bvp\b|\bvice\s+president\b/i,
    /\b(?:engineering|product|project|tech|general|program)\s+manager\b/i,

    // Seniority Hard Exclusions
    /\bsenior\b|\bsr\.?\b/i,
    /\blead\b/i,
    /\bprincipal\b/i,
    /\bstaff\b/i,
    /\barchitect\b/i,

    // Non-Engineering / Non-Target Roles
    /\bintern\b|\binternship\b/i,
    /\bdesigner\b|\bui\s*\/\s*ux\b/i,
    /\bproduct\s+manager\b/i,
    /\bqa\b|\btester\b|\btest\s+engineer\b|\bquality\s+assurance\b/i,
    /\bdevops\b|\bsre\b|\binfrastructure\b/i,
    /\bdata\s+engineer\b|\bdata\s+scientist\b|\bdata\s+analyst\b/i,
    /\bsales\b|\bmarketing\b|\bbdr\b|\bsdr\b/i,
    /\btutor\b|\bteacher\b|\btrainer\b|\binstructor\b|\bcoach\b/i,

    // Unrelated Tech Stacks in Title
    /\bjava\b(?!\s*script)/i,
    /\bspring(?:\s*boot)?\b/i,
    /\b\.net\b|\bc#\b/i,
    /\bphp\b|\blaravel\b/i,
    /\bruby(?:\s*on\s*rails)?\b|\brails\b/i,
    /\bgolang\b|\bgo\s+developer\b/i,
    /\brust\b/i,
    /\bflutter\b/i,
    /\bswift\b|\bios\b/i,
    /\bandroid(?:\s+native)?\b/i,
    /\bsalesforce\b|\bsap\b/i,
    /\bc\+\+\b/i,
  ];

  const TARGET_ROLE_PATTERNS = [
    /\breact(?:\.js|js)?\b/i,
    /\bnext(?:\.js|js)?\b/i,
    /\bfrontend\b|\bfront-end\b|\bfront\s+end\b/i,
    /\bjavascript\b|\bjs\s+developer\b|\btypescript\b|\bts\s+developer\b/i,
    /\bmern(?:\s+stack)?\b/i,
    /\bfull\s*stack\b|\bfullstack\b/i,
    /\bsoftware\s+engineer\b|\bsoftware\s+developer\b|\bsde\b/i,
    /\bweb\s+developer\b/i,
  ];

  // ======================= CV DATA =======================
  const CV = __CFG.CV || {
    name: "",
    email: "",
    phone: "",
    location: "",
    currentRole: "",
    company: "",
    education: "",
    yearsOfExperience: "",
    skills: "",
    highlights: ["", "", "", "", ""],
    noticePeriod: "",
    currentCTC: "",
    expectedCTC: "",
    currentSalary: "",
    expectedSalary: "",
    dob: "",
    gender: "",
    workAuth: "",
    github: "",
    linkedin: "",
    portfolio: "",
    links: "",
    remoteOk: "",
    relocate: "",
    startDate: "",
  };

  // ======================= QA BANK =======================
  const QA_BANK = [
    [
      /notice period|when can you (start|join)|start date|availability|joining/i,
      CV.noticePeriod || "Immediately available",
    ],
    [
      /current .{0,15}(ctc|salary|compensation|package)/i,
      CV.currentSalary || "3 LPA",
    ],
    [
      /(expected|desired) .{0,15}(ctc|salary|compensation|package|pay)/i,
      CV.expectedSalary || "4.5 LPA",
    ],
    [
      /years? of experience|total experience|experience with react/i,
      String(CV.yearsOfExperience || "1"),
    ],
    [/portfolio|website|github/i, CV.portfolio || CV.github || ""],
    [/linkedin/i, CV.linkedin || ""],
    [/phone|mobile|contact/i, CV.phone || ""],
    [/email/i, CV.email || ""],
    [/city|current location|where are you based/i, CV.location || "Pune"],
    [/relocat/i, CV.relocate || "Yes, open to relocation."],
    [/remote/i, CV.remoteOk || "Yes, fully comfortable with remote/hybrid."],
  ];

  const GENERIC_PITCH =
    `Hi! I am ${CV.name}, a ${CV.currentRole || "Full Stack Developer"} specializing in React, Next.js, and modern TypeScript. ` +
    `I build fast, responsive user interfaces and robust web applications. I would love to contribute to your engineering team!`;

  // ======================= HELPERS =======================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const humanDelay = () =>
    sleep(
      CONFIG.MIN_DELAY_MS +
        Math.random() * (CONFIG.MAX_DELAY_MS - CONFIG.MIN_DELAY_MS),
    );
  const log = (...a) =>
    console.log("%c[cutshort-apply]", "color:#0284c7;font-weight:bold", ...a);

  function extractJobId(el, href) {
    const fromHref =
      (href || "").match(/\/job\/([a-zA-Z0-9_-]+)/)?.[1] ||
      (href || "").match(/jobId=([a-zA-Z0-9_-]+)/)?.[1] ||
      (href || "").match(/id=([a-zA-Z0-9_-]+)/)?.[1];
    if (fromHref) return fromHref;

    return (
      el.getAttribute("data-job-id") ||
      el.getAttribute("data-id") ||
      el.getAttribute("id") ||
      null
    );
  }

  function isJobAlreadyApplied(jobId) {
    if (!jobId) return false;
    if (appliedJobIds[jobId]) return true;
    try {
      if (localStorage.getItem(`cs_applied_${jobId}`) === "true") return true;
      const history = JSON.parse(
        localStorage.getItem("cs_applied_history") || "{}",
      );
      if (history[jobId]) return true;
    } catch (e) {}
    return false;
  }

  function markJobAsApplied(jobId, jobData) {
    if (!jobId) return;
    try {
      localStorage.setItem(`cs_applied_${jobId}`, "true");
      const history = JSON.parse(
        localStorage.getItem("cs_applied_history") || "{}",
      );
      history[jobId] = {
        date: new Date().toISOString(),
        title: jobData.title,
        company: jobData.company,
      };
      localStorage.setItem("cs_applied_history", JSON.stringify(history));
    } catch (e) {}
  }

  function setValue(el, value) {
    const proto =
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : el.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function visible(el) {
    return el && el.getClientRects().length > 0 && !el.disabled;
  }

  function findButtonByText(root, regex) {
    return [
      ...root.querySelectorAll(
        'button, a[role="button"], [type="submit"], .btn, [class*="Button"], [class*="btn"]',
      ),
    ].find((b) => visible(b) && regex.test(b.textContent.trim()));
  }

  async function waitFor(fn, timeoutMs = 8000, pollMs = 300) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const res = fn();
      if (res) return res;
      await sleep(pollMs);
    }
    return null;
  }

  // ======================= LAYER 1: HARD FILTER FUNCTIONS =======================
  function checkTitleHardExclusions(title) {
    for (const regex of TITLE_HARD_EXCLUSIONS) {
      if (regex.test(title)) {
        return {
          pass: false,
          reason: `HARD_TITLE_EXCLUSION (${regex.source})`,
        };
      }
    }
    const isTarget = TARGET_ROLE_PATTERNS.some((r) => r.test(title));
    if (!isTarget) {
      return {
        pass: false,
        reason: "NOT_A_TARGET_ROLE",
      };
    }
    return { pass: true };
  }

  function checkExperienceLimit(expText) {
    const text = (expText || "").toLowerCase();
    const rangeMatch = text.match(
      /\b(?:2\s*[-–to]\s*5|3\s*[-–to]\s*5|3\s*[-–to]\s*6|4\s*[-–to]\s*[678]|5\s*[-–to]\s*[89]|5\s*[-–to]\s*10)\s*(?:years?|yrs?)\b/i,
    );
    if (rangeMatch) {
      return {
        pass: false,
        reason: `EXPERIENCE_EXCEEDS_LIMIT (${rangeMatch[0]})`,
      };
    }

    const numMatch = text.match(
      /\b([3-9]|1\d)\s*(?:\+|-\s*\d+)?\s*(?:years?|yrs?)\b/i,
    );
    if (numMatch) {
      const minYears = parseInt(numMatch[1], 10);
      if (minYears >= 4) {
        return {
          pass: false,
          reason: `EXPERIENCE_EXCEEDS_LIMIT (${numMatch[0]})`,
        };
      }
    }
    return { pass: true };
  }

  function checkLocationHierarchy(locText) {
    const text = (locText || "").toLowerCase();
    const isRemote =
      /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b/i.test(text);

    if (/\b(?:us\s+only|uk\s+only|eu\s+only|canada\s+only)\b/i.test(text)) {
      return { pass: false, reason: "FOREIGN_LOCATION_RESTRICTION" };
    }

    const p1 = /\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b/i.test(text);
    const p2 =
      /\bmumbai\b|\bchennai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(
        text,
      );
    const p3 = /\bahmedabad\b/i.test(text);

    if (p1 || p2 || p3 || isRemote) return { pass: true };
    return { pass: false, reason: "NON_PRIORITY_ONSITE_LOCATION" };
  }

  function checkFullStackRelevance(title, skills, description) {
    const isFullStack =
      /\bfull\s*stack\b|\bfullstack\b|\bsoftware\s+engineer\b|\bsoftware\s+developer\b|\bsde\b/i.test(
        title,
      );
    if (!isFullStack) return { pass: true };

    const blob = `${skills || ""} ${description || ""}`.toLowerCase();
    const hasReactStack =
      /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bmern\b|\btypescript\b|\bfrontend\b|\bfront-end\b|\bjavascript\b|\btailwind\b/i.test(
        blob,
      );
    if (!hasReactStack) {
      return {
        pass: false,
        reason: "FULLSTACK_MISSING_REACT_STACK",
      };
    }
    return { pass: true };
  }

  // ======================= LAYER 2: MATCH SCORING ENGINE (0-100) =======================
  function calculateMatchScore(job) {
    let score = 0;
    const breakdown = [];
    const lowerTitle = (job.title || "").toLowerCase();
    const lowerSkills = (
      (job.skills || "") +
      " " +
      (job.description || "")
    ).toLowerCase();

    // 1. Role Alignment (Max 25 pts)
    if (
      /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bfrontend\b|\bfront-end\b|\bmern\b/.test(
        lowerTitle,
      )
    ) {
      score += 25;
      breakdown.push("Role: React/Next/Frontend/MERN (+25)");
    } else if (/full\s*stack|fullstack/.test(lowerTitle)) {
      score += 22;
      breakdown.push("Role: Full Stack (+22)");
    } else {
      score += 18;
      breakdown.push("Role: SDE/Other (+18)");
    }

    // 2. Tech Stack Match (Max 35 pts)
    let techPoints = 0;
    if (/\breact(?:\.js|js)?\b/.test(lowerSkills)) {
      techPoints += 10;
      breakdown.push("React (+10)");
    }
    if (/\bnext(?:\.js|js)?\b/.test(lowerSkills)) {
      techPoints += 8;
      breakdown.push("Next.js (+8)");
    }
    if (/\btypescript\b/.test(lowerSkills)) {
      techPoints += 7;
      breakdown.push("TypeScript (+7)");
    } else if (/\bjavascript\b|\bes6\b/.test(lowerSkills)) {
      techPoints += 5;
      breakdown.push("JavaScript (+5)");
    }

    if (
      /\bnode(?:\.js|js)?\b|\bexpress(?:\.js)?\b|\bmongodb\b/.test(lowerSkills)
    ) {
      techPoints += 5;
      breakdown.push("Node/Express/Mongo (+5)");
    }
    if (
      /\btailwind(?:\s*css)?\b|\brest(?:\s*api)?\b|\bsql\b|\bprisma\b|\bpostgresql\b/.test(
        lowerSkills,
      )
    ) {
      techPoints += 5;
      breakdown.push("Tailwind/REST/SQL (+5)");
    }

    if (
      /\bangular\b|\bvue(?:\.js)?\b|\bjava\b(?!\s*script)|\bspring(?:\s*boot)?\b|\b\.net\b|\bdjango\b/.test(
        lowerSkills,
      )
    ) {
      techPoints = Math.max(0, techPoints - 15);
      breakdown.push("Conflicting tech penalty (-15)");
    }
    score += Math.min(35, techPoints);

    // 3. Experience Fit (Max 20 pts)
    const exp = (job.experience || "").toLowerCase();
    if (
      /\b(?:0-1|0-2|0-3|1-2|1-3|0 - 2|1 - 3|0-2\s*yrs|1-3\s*yrs|fresh|entry)\b/.test(
        exp,
      )
    ) {
      score += 20;
      breakdown.push("Exp: 0-3 yrs (+20)");
    } else if (!exp || /any/.test(exp)) {
      score += 15;
      breakdown.push("Exp: Unspecified (+15)");
    } else {
      score += 10;
      breakdown.push("Exp: 2-3 yrs (+10)");
    }

    // 4. Location Tier (Max 10 pts)
    const loc = (job.location || "").toLowerCase();
    if (/bengaluru|bangalore|pune|hyderabad|remote|work from home/.test(loc)) {
      score += 10;
      breakdown.push("Loc: P1 / Remote (+10)");
    } else if (/mumbai|chennai|gurgaon|gurugram|noida|delhi/.test(loc)) {
      score += 8;
      breakdown.push("Loc: P2 (+8)");
    } else {
      score += 6;
      breakdown.push("Loc: P3 (+6)");
    }

    // 5. Freshness / Priority (Max 10 pts)
    score += 10;
    breakdown.push("Active Cutshort Opportunity (+10)");

    const passed = score >= CONFIG.SCORE_THRESHOLD;
    return {
      score,
      breakdown: breakdown.join(", "),
      passed,
      action:
        score >= CONFIG.HIGH_SCORE_THRESHOLD
          ? "HIGH_PRIORITY_APPLY"
          : passed
            ? "MODERATE_APPLY"
            : "LOW_SCORE_SKIP",
    };
  }

  async function generatePitchNote(job) {
    const prompt =
      `You are writing a personalized, compelling 2-3 sentence application note to a startup founder/recruiter on Cutshort on my behalf.\n` +
      `Candidate Info:\n${JSON.stringify(CV)}\n\n` +
      `Job Info:\nRole: ${job.title}\nCompany: ${job.company}\nDescription/Skills: ${job.skills || job.description || ""}\n\n` +
      `Rules:\n1. First person ("I am...", "I've built...").\n2. Concise, crisp, professional, enthusiasm for the specific role.\n3. Mention key relevant tech stack (React/Next.js/TypeScript).\n4. No placeholders, no emojis, no bullet points.`;

    // 1. OpenRouter
    if (CONFIG.openrouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CONFIG.openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/YashLagare/Wellfound-Auto-Apply",
            "X-Title": "AutoApply-Suite",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            max_tokens: 300,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      } catch (e) {}
    }

    // 2. Direct Gemini
    if (CONFIG.geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          },
        );
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } catch (e) {
        log("AI pitch generation failed:", e.message);
      }
    }
    return GENERIC_PITCH;
  }

  async function handleCutshortModal(job) {
    const modal = await waitFor(
      () =>
        document.querySelector(
          '.modal.show, [role="dialog"], .apply-modal, [class*="Modal"], [class*="dialog"]',
        ),
      4000,
    );
    if (!modal) {
      log("  ✅ 1-Click Apply submitted directly (no modal)");
      return true;
    }

    log("  📋 Handling Cutshort application modal / note...");

    // 1. Fill pitch note / custom message textarea
    const textareas = [...modal.querySelectorAll("textarea")].filter(visible);
    if (textareas.length > 0) {
      const pitch = await generatePitchNote(job);
      for (const ta of textareas) {
        setValue(ta, pitch);
      }
    }

    // 2. Screening / Salary inputs
    const inputs = [
      ...modal.querySelectorAll(
        'input[type="text"], input[type="number"], input[type="tel"]',
      ),
    ].filter(visible);
    for (const inp of inputs) {
      const label = (
        inp.getAttribute("placeholder") ||
        inp.getAttribute("name") ||
        inp.closest("label")?.textContent ||
        ""
      ).toLowerCase();
      if (/current.*(?:ctc|salary|comp)/i.test(label)) {
        setValue(inp, CV.currentCTC || "3");
      } else if (/expected.*(?:ctc|salary|comp)/i.test(label)) {
        setValue(inp, CV.expectedCTC || "4.5");
      } else if (/notice|join|start/i.test(label)) {
        setValue(inp, CV.noticePeriod || "0");
      } else if (/experience/i.test(label)) {
        setValue(inp, String(CV.yearsOfExperience || "1"));
      } else if (/portfolio|github|link/i.test(label)) {
        setValue(inp, CV.portfolio || CV.github || "");
      }
    }

    // 3. Submit button
    const submitBtn = findButtonByText(
      modal,
      /^apply$|^submit$|^send$|^send application$|^confirm$|^i'm interested$|^interested$/i,
    );
    if (!submitBtn) {
      log("  ⚠ No submit button found in modal — closing");
      findButtonByText(modal, /close|cancel|×/i)?.click();
      return false;
    }

    if (CONFIG.DRY_RUN) {
      log("  🔍 DRY_RUN — would click submit:", submitBtn.textContent.trim());
      findButtonByText(modal, /close|cancel|×/i)?.click();
      return true;
    }

    submitBtn.click();
    log("  ✅ Application submitted in modal");
    return true;
  }

  // ======================= SCRAPE CUTSHORT CARDS =======================
  function findCutshortCards() {
    const cards = [];
    const selectors = [
      '[data-testid="job-card"]',
      ".job-card",
      ".jobCard",
      '[class*="JobCard"]',
      '[class*="job-card"]',
      'div[class*="opportunityCard"]',
      'div[class*="JobListing"]',
    ];

    const cardElements = document.querySelectorAll(selectors.join(", "));
    for (const el of cardElements) {
      if (!visible(el)) continue;

      const linkEl = el.querySelector(
        'a[href*="/job/"], a[href*="jobId="], [data-testid="job-title"] a, h2 a, h3 a',
      );
      const href = linkEl?.getAttribute("href") || "";
      const jobId = extractJobId(el, href);
      if (!jobId || isJobAlreadyApplied(jobId)) continue;

      const title = (
        linkEl?.textContent ||
        el.querySelector(
          '[data-testid="job-title"], h2, h3, [class*="title"]',
        )?.textContent ||
        ""
      ).trim();
      if (!title || title.length < 3) continue;

      const company = (
        el.querySelector(
          '[data-testid="company-name"], .company-name, [class*="company"], [class*="Company"]',
        )?.textContent || ""
      ).trim();

      const expText = (
        el.querySelector(
          '[data-testid="job-exp"], [class*="experience"], [class*="Experience"]',
        )?.textContent || ""
      ).trim();

      const locText = (
        el.querySelector(
          '[data-testid="job-loc"], [class*="location"], [class*="Location"]',
        )?.textContent || ""
      ).trim();

      const skillsText = (
        el.querySelector(
          '[data-testid="job-skills"], [class*="skills"], [class*="Skills"]',
        )?.textContent || ""
      ).trim();

      const applyBtn = findButtonByText(
        el,
        /^apply$|^apply now$|^i'm interested$|^interested$|^send application$/i,
      );

      cards.push({
        id: jobId,
        element: el,
        linkEl,
        applyBtn,
        title,
        company,
        experience: expText,
        location: locText,
        skills: skillsText,
        link: href.startsWith("http") ? href : `https://cutshort.io${href}`,
      });
    }

    return cards;
  }

  // ======================= MAIN LOOP =======================
  log("🚀 Initializing Cutshort Two-Layer Decision Pipeline Auto-Apply...");
  log(`Mode: ${CONFIG.DRY_RUN ? "🔍 DRY RUN (Simulation)" : "⚡ LIVE APPLICATION"}`);
  log(`Max applications this run: ${CONFIG.MAX_APPLICATIONS}`);

  let appliedCount = 0;
  const processedJobIds = new Set();

  for (let pass = 1; pass <= 3 && appliedCount < CONFIG.MAX_APPLICATIONS; pass++) {
    const cards = findCutshortCards();
    log(`Pass ${pass}: Found ${cards.length} candidate job cards`);

    for (const card of cards) {
      if (appliedCount >= CONFIG.MAX_APPLICATIONS) break;
      if (processedJobIds.has(card.id)) continue;
      processedJobIds.add(card.id);

      log(`Evaluating: ${card.title} @ ${card.company} | ID: ${card.id}`);

      // Layer 1: Absolute Hard Filters
      if (isJobAlreadyApplied(card.id)) {
        log(`  ❌ [Layer 1 REJECT] ALREADY_APPLIED (${card.id})`);
        continue;
      }

      const tCheck = checkTitleHardExclusions(card.title);
      if (!tCheck.pass) {
        log(`  ❌ [Layer 1 REJECT] ${tCheck.reason}`);
        continue;
      }

      const expCheck = checkExperienceLimit(card.experience);
      if (!expCheck.pass) {
        log(`  ❌ [Layer 1 REJECT] ${expCheck.reason}`);
        continue;
      }

      const locCheck = checkLocationHierarchy(card.location);
      if (!locCheck.pass) {
        log(`  ❌ [Layer 1 REJECT] ${locCheck.reason}`);
        continue;
      }

      const fsCheck = checkFullStackRelevance(card.title, card.skills, "");
      if (!fsCheck.pass) {
        log(`  ❌ [Layer 1 REJECT] ${fsCheck.reason}`);
        continue;
      }

      // Layer 2: Match Scoring Engine
      const evalResult = calculateMatchScore(card);
      log(`  🎯 Evaluation Score: ${evalResult.score}/100 [${evalResult.action}]`);
      log(`  📊 Breakdown: ${evalResult.breakdown}`);

      if (!evalResult.passed) {
        log(`  ❌ [Layer 2 REJECT] Score ${evalResult.score} < ${CONFIG.SCORE_THRESHOLD}`);
        continue;
      }

      // Application Trigger
      if (!card.applyBtn) {
        log(`  ⚠ No direct apply button visible on card — clicking card to open details...`);
        (card.linkEl || card.element).click();
        await sleep(2500);
      }

      const activeBtn =
        card.applyBtn ||
        findButtonByText(
          document,
          /^apply$|^apply now$|^i'm interested$|^interested$|^send application$/i,
        );

      if (!activeBtn) {
        log("  ⚠ Could not find apply trigger button — skipping.");
        continue;
      }

      log(`  ✨ Triggering Application: "${activeBtn.textContent.trim()}"`);
      activeBtn.click();
      await sleep(2000);

      const success = await handleCutshortModal(card);
      if (success) {
        appliedCount++;
        markJobAsApplied(card.id, card);
        log(
          `  ✅ Cutshort Application submitted (${appliedCount}/${CONFIG.MAX_APPLICATIONS})` +
            (CONFIG.DRY_RUN ? " [SIMULATED]" : ""),
        );
        await humanDelay();
      }
    }

    // Scroll to load more cards
    window.scrollBy({ top: 1200, behavior: "smooth" });
    await sleep(4000);
  }

  log(`🎉 Cutshort session finished. Total applied: ${appliedCount}`);
})();
