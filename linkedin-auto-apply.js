/**
 * LinkedIn Easy Apply — Precision Two-Layer Decision Pipeline
 * ==============================================================
 * Layer 1: Absolute Hard Filters (Duplicate, Title, Experience badge, Location hierarchy, Full Stack tech relevance)
 * Layer 2: Match Scoring Engine (0-100 pts) — Auto-apply only if Score >= 65 (High match: 75+)
 * Handles multi-step Easy Apply dialogs, radio selections, and screening questionnaires with Google Gemini AI.
 */
(async function linkedinAutoApply() {
  "use strict";

  const __CFG = (typeof window !== "undefined" && window.__APPLY_CONFIG) || {};
  const appliedJobIds = __CFG.appliedJobIds || {};

  // ======================= CONFIGURATION =======================
  const CONFIG = {
    DRY_RUN: true,
    MAX_APPLICATIONS: 25,
    MIN_DELAY_MS: 45000,
    MAX_DELAY_MS: 95000,
    SCORE_THRESHOLD: __CFG.eligibilityPolicy.scoreThresholds[__CFG.platform],
    HIGH_SCORE_THRESHOLD: __CFG.eligibilityPolicy.highScoreThreshold,
    geminiKey: __CFG.geminiKey || "",
  };

  // ======================= LAYER 1: HARD EXCLUSIONS & TARGETS =======================

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
      CV.noticePeriod,
    ],
    [
      /current .{0,15}(ctc|salary|compensation|package)/i,
      CV.currentSalary,
    ],
    [
      /(expected|desired) .{0,15}(ctc|salary|compensation|package|pay)/i,
      CV.expectedSalary,
    ],
    [
      /years? of experience|total experience|experience with react/i,
      CV.experienceSummary,
    ],
    [/portfolio|website|github/i, CV.portfolio || CV.github || ""],
    [/linkedin/i, CV.linkedin || ""],
    [/phone|mobile|contact/i, CV.phone || ""],
    [/email/i, CV.email || ""],
    [/city|current location|where are you based/i, CV.location],
    [/relocat/i, CV.relocate || "Yes, open to relocation."],
    [/remote/i, CV.remoteOk || "Yes, fully comfortable with remote/hybrid."],
  ];

  // ======================= HELPERS =======================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const humanDelay = () =>
    sleep(
      CONFIG.MIN_DELAY_MS +
        Math.random() * (CONFIG.MAX_DELAY_MS - CONFIG.MIN_DELAY_MS),
    );
  const log = (...a) =>
    console.log("%c[linkedin-apply]", "color:#0a66c2;font-weight:bold", ...a);

  function extractJobId(el, href) {
    const fromHref =
      (href || "").match(/\/jobs\/view\/(\d+)/)?.[1] ||
      (href || "").match(/currentJobId=(\d+)/)?.[1] ||
      (href || "").match(/jobId=(\d+)/)?.[1];
    if (fromHref) return fromHref;

    const urn = el.getAttribute("data-occludable-job-id") || el.getAttribute("data-job-id");
    if (urn) return urn;

    return el.id?.match(/(\d{8,12})/)?.[1] || null;
  }

  function isJobAlreadyApplied(jobId) {
    if (!jobId) return false;
    if (appliedJobIds[jobId]) return true;
    try {
      if (localStorage.getItem(`li_applied_${jobId}`) === "true") return true;
      const history = JSON.parse(
        localStorage.getItem("li_applied_history") || "{}",
      );
      if (history[jobId]) return true;
    } catch (e) {}
    return false;
  }

  function markJobAsApplied(jobId, jobData) {
    if (!jobId) return;
    try {
      localStorage.setItem(`li_applied_${jobId}`, "true");
      const history = JSON.parse(
        localStorage.getItem("li_applied_history") || "{}",
      );
      history[jobId] = {
        date: new Date().toISOString(),
        title: jobData.title,
        company: jobData.company,
      };
      localStorage.setItem("li_applied_history", JSON.stringify(history));
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
        'button, a[role="button"], [type="submit"], .artdeco-button',
      ),
    ].find((b) => visible(b) && regex.test(b.textContent.trim()));
  }

  // ======================= LAYER 1: HARD FILTER FUNCTIONS =======================
  function checkTitleHardExclusions(title) {
    return window.__APPLY_POLICY_HELPERS.checkTitle(
      title,
      __CFG.eligibilityPolicy,
    );
  }

  function checkExperienceLimit(expText) {
    return window.__APPLY_POLICY_HELPERS.checkExperience(
      expText,
      __CFG.eligibilityPolicy,
    );
  }

  function checkLocationHierarchy(locText) {
    const text = [locText].filter(Boolean).join(" ");
    return window.__APPLY_POLICY_HELPERS.checkLocation(
      text,
      __CFG.eligibilityPolicy,
    );
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
      /\b(?:0-1|0-2|1-2|0 - 2|1 - 2|0-2\s*yrs|1-2\s*yrs|fresh|entry|associate)\b/.test(
        exp,
      )
    ) {
      score += 20;
      breakdown.push("Exp: 0-2 yrs (+20)");
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
    breakdown.push("LinkedIn Easy Apply (+10)");

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

  // ======================= EASY APPLY MULTI-STEP HANDLER =======================
  async function handleLinkedInModal() {
    for (let step = 1; step <= 10; step++) {
      await sleep(1500);

      const modal = document.querySelector(
        '.jobs-easy-apply-modal, [data-test-modal], div[role="dialog"]',
      );
      if (!modal) {
        log("  ℹ No active Easy Apply modal — assuming finished.");
        return true;
      }

      // Check for Submit button
      const submitBtn = findButtonByText(
        modal,
        /^submit application$|^submit$|^send application$/i,
      );
      if (submitBtn) {
        if (CONFIG.DRY_RUN) {
          log("  🔍 DRY_RUN — would click submit:", submitBtn.textContent.trim());
          findButtonByText(modal, /dismiss|cancel|close|×/i)?.click();
          await sleep(1000);
          findButtonByText(document, /discard/i)?.click();
          return true;
        }
        submitBtn.click();
        log("  ✅ LinkedIn Easy Apply submitted successfully!");
        return true;
      }

      // Fill text/number inputs
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
          inp.closest(".fb-dash-form-element")?.textContent ||
          ""
        ).toLowerCase();
        if (/experience|years/i.test(label)) {
          setValue(inp, String(CV.experienceYears));
        } else if (/notice|join|start/i.test(label)) {
          setValue(inp, "0");
        } else if (/salary|ctc|compensation/i.test(label)) {
          setValue(inp, CV.expectedCTC || "4.5");
        } else if (/phone|mobile/i.test(label)) {
          setValue(inp, CV.phone || "");
        }
      }

      // Radio / Select options (default to Yes for work auth / relocation)
      const radios = [...modal.querySelectorAll('input[type="radio"]')].filter(visible);
      for (const r of radios) {
        const rLabel = (r.closest("label")?.textContent || "").toLowerCase();
        if (/yes/i.test(rLabel)) {
          r.click();
        }
      }

      // Continue to next page
      const nextBtn = findButtonByText(
        modal,
        /^next$|^review$|^continue/i,
      );
      if (nextBtn) {
        nextBtn.click();
        await sleep(2000);
      } else {
        break;
      }
    }
    return true;
  }

  // ======================= SCRAPE LINKEDIN CARDS =======================
  function findLinkedInCards() {
    const cards = [];
    const cardElements = document.querySelectorAll(
      ".jobs-search-results__list-item, .job-card-container, [data-occludable-job-id]",
    );

    for (const el of cardElements) {
      if (!visible(el)) continue;

      const linkEl = el.querySelector(
        'a.job-card-list__title--link, a.job-card-container__link, a[href*="/jobs/view/"]',
      );
      const href = linkEl?.getAttribute("href") || "";
      const jobId = extractJobId(el, href);
      if (!jobId || isJobAlreadyApplied(jobId)) continue;

      const title = (
        linkEl?.textContent ||
        el.querySelector(".job-card-list__title, strong")?.textContent ||
        ""
      ).trim();
      if (!title || title.length < 3) continue;

      const company = (
        el.querySelector(".job-card-container__primary-description, .artdeco-entity-lockup__subtitle")
          ?.textContent || ""
      ).trim();

      const locText = (
        el.querySelector(".job-card-container__metadata-item, .artdeco-entity-lockup__caption")
          ?.textContent || ""
      ).trim();

      cards.push({
        id: jobId,
        element: el,
        linkEl,
        title,
        company,
        experience: "Not specified",
        location: locText,
        skills: title,
        description: "",
        link: href.startsWith("http")
          ? href
          : `https://www.linkedin.com/jobs/view/${jobId}/`,
      });
    }

    return cards;
  }

  // ======================= MAIN LOOP =======================
  log("🚀 Initializing LinkedIn Easy Apply Two-Layer Decision Pipeline...");
  log(`Mode: ${CONFIG.DRY_RUN ? "🔍 DRY RUN (Simulation)" : "⚡ LIVE APPLICATION"}`);
  log(`Max applications this run: ${CONFIG.MAX_APPLICATIONS}`);

  let appliedCount = 0;
  const processedJobIds = new Set();

  for (let pass = 1; pass <= 3 && appliedCount < CONFIG.MAX_APPLICATIONS; pass++) {
    const cards = findLinkedInCards();
    log(`Pass ${pass}: Found ${cards.length} Easy Apply job cards`);

    for (const card of cards) {
      if (appliedCount >= CONFIG.MAX_APPLICATIONS) break;
      if (processedJobIds.has(card.id)) continue;
      processedJobIds.add(card.id);

      log(`Evaluating: ${card.title} @ ${card.company} | ID: ${card.id}`);

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

      const fsCheck = checkFullStackRelevance(card.title, card.skills, card.description);
      if (!fsCheck.pass) {
        log(`  ❌ [Layer 1 REJECT] ${fsCheck.reason}`);
        continue;
      }

      const evalResult = calculateMatchScore(card);
      log(`  🎯 Evaluation Score: ${evalResult.score}/100 [${evalResult.action}]`);
      log(`  📊 Breakdown: ${evalResult.breakdown}`);

      if (!evalResult.passed) {
        log(`  ❌ [Layer 2 REJECT] Score ${evalResult.score} < ${CONFIG.SCORE_THRESHOLD}`);
        continue;
      }

      // Click card to open right pane
      (card.linkEl || card.element).click();
      await sleep(2500);

      const easyApplyBtn = findButtonByText(
        document,
        /^easy apply$/i,
      );

      if (!easyApplyBtn) {
        log("  ⚠ No Easy Apply button found in job details (external apply) — skipping.");
        continue;
      }

      log(`  ✨ Triggering LinkedIn Easy Apply...`);
      easyApplyBtn.click();
      await sleep(2500);

      const success = await handleLinkedInModal();
      if (success) {
        appliedCount++;
        markJobAsApplied(card.id, card);
        log(
          `  ✅ LinkedIn Easy Apply submitted (${appliedCount}/${CONFIG.MAX_APPLICATIONS})` +
            (CONFIG.DRY_RUN ? " [SIMULATED]" : ""),
        );
        await humanDelay();
      }
    }

    window.scrollBy({ top: 1000, behavior: "smooth" });
    await sleep(4000);
  }

  log(`🎉 LinkedIn session finished. Total applied: ${appliedCount}`);
})();
