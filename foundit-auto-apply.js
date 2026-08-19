/**
 * Foundit (formerly Monster) Auto-Apply — Precision Two-Layer Decision Pipeline
 * ==============================================================================
 * Layer 1: Absolute Hard Filters (Duplicate, External redirect, Title, Experience badge, Location hierarchy, Full Stack tech relevance)
 * Layer 2: Match Scoring Engine (0-100 pts) — Auto-apply only if Score >= 65 (High match: 75+)
 * Handles both Direct Quick Apply and Screening Questionnaire Modals with Google Gemini AI.
 */
(async function founditAutoApply() {
  'use strict';

  const __CFG = (typeof window !== 'undefined' && window.__APPLY_CONFIG) || {};
  const appliedJobIds = __CFG.appliedJobIds || {};

  // ======================= CONFIGURATION =======================
  const CONFIG = {
    DRY_RUN: true,
    MAX_APPLICATIONS: 30,
    MIN_DELAY_MS: 45000,
    MAX_DELAY_MS: 90000,
    SCORE_THRESHOLD: 65,
    HIGH_SCORE_THRESHOLD: 75,
    geminiKey: __CFG.geminiKey || '',
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
    name: '', email: '', phone: '', location: '', currentRole: '', company: '', education: '',
    yearsOfExperience: '', skills: '', highlights: ['', '', '', '', ''], noticePeriod: '',
    currentCTC: '', expectedCTC: '', currentSalary: '', expectedSalary: '', dob: '', gender: '',
    workAuth: '', github: '', linkedin: '', portfolio: '', links: '', remoteOk: '', relocate: '', startDate: '',
  };

  // ======================= QA BANK =======================
  const QA_BANK = [
    [/notice period|when can you (start|join)|start date|availability|joining/i, CV.noticePeriod || 'Immediately available'],
    [/current .{0,15}(ctc|salary|compensation|package)/i, CV.currentSalary || '3 LPA'],
    [/(expected|desired) .{0,15}(ctc|salary|compensation|package|pay)/i, CV.expectedSalary || '4.5 LPA'],
    [/years? of (work |professional )?experience|how many years/i, '1 year professional experience + 9 full-stack projects'],
    [/react|frontend|front-end/i, 'Strong experience with React.js, Next.js, TypeScript, Redux, Zustand, and Tailwind CSS.'],
    [/node|backend|back-end|api/i, 'Experienced in building scalable Node.js/Express backends, REST APIs, MongoDB, PostgreSQL, and Prisma.'],
    [/remote|work from home|wfh/i, 'Yes, fully set up for remote work and open to hybrid/onsite in target locations.'],
    [/reloc|move to|based out of|location/i, `Yes, open to relocation. Currently based in ${CV.location || 'Maharashtra, India'}.`],
    [/github|portfolio|linkedin|profile link/i, CV.links],
    [/why (do you want|are you interested|join|us)/i,
      `I build scalable web applications end to end. ${CV.highlights[0] || ''}. This role matches my core stack directly, and I am excited to deliver high-impact features.`],
  ];

  const GENERIC_ANSWER =
    `I am ${CV.name}, a ${CV.currentRole || 'Full Stack Developer'}. Key highlights: ` +
    (CV.highlights.slice(0, 2).join('; ') || 'shipping production features end to end') + '.';

  // ======================= HELPERS =======================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const humanDelay = () => sleep(CONFIG.MIN_DELAY_MS + Math.random() * (CONFIG.MAX_DELAY_MS - CONFIG.MIN_DELAY_MS));
  const log = (...a) => console.log('%c[foundit-apply]', 'color:#e11d48;font-weight:bold', ...a);

  function extractJobId(el, href) {
    const fromHref = (href || '').match(/\/job\/[^\/]+-(\d+)/)?.[1] ||
                     (href || '').match(/jobId=(\d+)/)?.[1] ||
                     (href || '').match(/(\d{6,12})/)?.[1];
    if (fromHref) return fromHref;

    return el.getAttribute('data-job-id') ||
           el.getAttribute('data-jobid') ||
           el.id?.replace(/^[^\d]*/, '') ||
           null;
  }

  function isJobAlreadyApplied(jobId) {
    if (!jobId) return false;
    if (appliedJobIds[jobId]) return true;
    try {
      if (localStorage.getItem(`fi_applied_${jobId}`) === 'true') return true;
      const history = JSON.parse(localStorage.getItem('fi_applied_history') || '{}');
      if (history[jobId]) return true;
    } catch (e) {}
    return false;
  }

  function markJobAsApplied(jobId, jobData) {
    if (!jobId) return;
    try {
      localStorage.setItem(`fi_applied_${jobId}`, 'true');
      const history = JSON.parse(localStorage.getItem('fi_applied_history') || '{}');
      history[jobId] = { date: new Date().toISOString(), title: jobData.title, company: jobData.company };
      localStorage.setItem('fi_applied_history', JSON.stringify(history));
    } catch (e) {}
  }

  function setValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
                : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
                : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function visible(el) {
    return el && el.getClientRects().length > 0 && !el.disabled;
  }

  function findButtonByText(root, regex) {
    return [...root.querySelectorAll('button, a[role="button"], [type="submit"], .btn, .apply-btn, .btn-apply')]
      .find((b) => visible(b) && regex.test(b.textContent.trim()));
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
        return { pass: false, reason: `HARD_TITLE_EXCLUSION (${regex.source})` };
      }
    }
    const isTarget = TARGET_ROLE_PATTERNS.some((r) => r.test(title));
    if (!isTarget) {
      return { pass: false, reason: 'NOT_A_TARGET_ROLE' };
    }
    return { pass: true };
  }

  function checkExperienceExclusion(expText) {
    const t = (expText || '').toLowerCase();

    // Check senior ranges (e.g. 2-5 yrs, 3-5 yrs, 3-6 yrs, 4-7 yrs, 5-8 yrs)
    const rangeMatch = t.match(/\b(?:2\s*[-–to]\s*5|3\s*[-–to]\s*5|3\s*[-–to]\s*6|4\s*[-–to]\s*[678]|5\s*[-–to]\s*[89]|5\s*[-–to]\s*10)\s*(?:years?|yrs?)\b/i);
    if (rangeMatch) {
      return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${rangeMatch[0]})` };
    }

    // Check fixed 4+, 5+, 6+ years
    const numMatch = t.match(/\b([3-9]|1\d)\s*(?:\+|-\s*\d+)?\s*(?:years?|yrs?)\b/i);
    if (numMatch) {
      const minNum = parseInt(numMatch[1], 10);
      if (minNum >= 4) {
        return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${numMatch[0]})` };
      }
    }

    return { pass: true };
  }

  function checkLocationFit(locText) {
    const t = (locText || '').toLowerCase();
    const isRemote = /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b/i.test(t);

    if (/\b(?:us\s+only|uk\s+only|eu\s+only)\b/i.test(t)) {
      return { pass: false, reason: 'FOREIGN_LOCATION_RESTRICTION' };
    }

    const p1 = /\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b/i.test(t);
    const p2 = /\bmumbai\b|\bchennai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(t);
    const p3 = /\bahmedabad\b/i.test(t);

    if (p1 || p2 || p3 || isRemote) return { pass: true };

    return { pass: false, reason: 'NON_PRIORITY_ONSITE_LOCATION' };
  }

  function checkFullStackRelevance(title, skillsText) {
    const isFullStackOrSDE = /\bfull\s*stack\b|\bfullstack\b|\bsoftware\s+engineer\b|\bsde\b/i.test(title);
    if (!isFullStackOrSDE) return { pass: true };

    const hasReactOrFrontend = /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bmern\b|\btypescript\b|\bfrontend\b|\bfront-end\b|\bjavascript\b|\btailwind\b/i.test(skillsText);
    if (!hasReactOrFrontend) {
      return { pass: false, reason: 'FULLSTACK_MISSING_REACT_STACK' };
    }
    return { pass: true };
  }

  function isExternalRedirect(el) {
    const applyBtn = findButtonByText(el, /apply/i);
    const text = (applyBtn?.textContent || el.textContent || '').toLowerCase();
    return /apply on (?:company|employer) website|external website|redirect/i.test(text);
  }

  // ======================= LAYER 2: MATCH SCORING (0-100) =======================
  function calculateMatchScore(job) {
    let score = 0;
    const breakdown = [];
    const lowerSkills = (job.skills || '').toLowerCase() + ' ' + (job.description || '').toLowerCase();
    const lowerTitle = (job.title || '').toLowerCase();

    // 1. Role Alignment (Max 25 pts)
    if (/\breact\b|\bnext(?:\.js|js)?\b|\bfrontend\b|\bfront-end\b|\bmern\b/.test(lowerTitle)) {
      score += 25;
      breakdown.push('Role: React/Next/Frontend/MERN (+25)');
    } else if (/full\s*stack|fullstack/.test(lowerTitle)) {
      score += 22;
      breakdown.push('Role: Full Stack (+22)');
    } else {
      score += 18;
      breakdown.push('Role: SDE/Other (+18)');
    }

    // 2. Tech Stack Match (Max 35 pts)
    let techPoints = 0;
    if (/\breact(?:\.js|js)?\b/.test(lowerSkills)) { techPoints += 10; breakdown.push('React (+10)'); }
    if (/\bnext(?:\.js|js)?\b/.test(lowerSkills)) { techPoints += 8; breakdown.push('Next.js (+8)'); }
    if (/\btypescript\b/.test(lowerSkills)) { techPoints += 7; breakdown.push('TypeScript (+7)'); }
    else if (/\bjavascript\b|\bes6\b/.test(lowerSkills)) { techPoints += 5; breakdown.push('JavaScript (+5)'); }

    if (/\bnode(?:\.js|js)?\b|\bexpress(?:\.js)?\b|\bmongodb\b/.test(lowerSkills)) { techPoints += 5; breakdown.push('Node/Express/Mongo (+5)'); }
    if (/\btailwind(?:\s*css)?\b|\brest(?:\s*api)?\b|\bsql\b|\bprisma\b|\bpostgresql\b/.test(lowerSkills)) { techPoints += 5; breakdown.push('Tailwind/REST/SQL (+5)'); }

    if (/\bangular\b|\bvue(?:\.js)?\b|\bjava\b(?!\s*script)|\bspring(?:\s*boot)?\b|\b\.net\b|\bdjango\b/.test(lowerSkills)) {
      techPoints = Math.max(0, techPoints - 15);
      breakdown.push('Conflicting tech penalty (-15)');
    }
    score += Math.min(35, techPoints);

    // 3. Experience Fit (Max 20 pts)
    const exp = (job.experience || '').toLowerCase();
    if (/\b(?:0-1|0-2|0-3|1-2|1-3|0 - 2|1 - 3|0-2\s*yrs|1-3\s*yrs|fresh|entry)\b/.test(exp)) {
      score += 20;
      breakdown.push('Exp: 0-3 yrs (+20)');
    } else if (!exp || /any/.test(exp)) {
      score += 15;
      breakdown.push('Exp: Unspecified (+15)');
    } else {
      score += 10;
      breakdown.push('Exp: 2-3 yrs (+10)');
    }

    // 4. Location Tier (Max 10 pts)
    const loc = (job.location || '').toLowerCase();
    if (/bengaluru|bangalore|pune|hyderabad|remote|work from home/.test(loc)) {
      score += 10;
      breakdown.push('Loc: P1 / Remote (+10)');
    } else if (/mumbai|chennai|gurgaon|gurugram|noida|delhi/.test(loc)) {
      score += 8;
      breakdown.push('Loc: P2 (+8)');
    } else {
      score += 6;
      breakdown.push('Loc: P3 (+6)');
    }

    // 5. Freshness / Priority (Max 10 pts)
    score += 10;
    breakdown.push('Active Search Result (+10)');

    const passed = score >= CONFIG.SCORE_THRESHOLD;
    return {
      score,
      breakdown: breakdown.join(', '),
      passed,
      action: score >= CONFIG.HIGH_SCORE_THRESHOLD ? 'HIGH_PRIORITY_APPLY' : (passed ? 'MODERATE_APPLY' : 'LOW_SCORE_SKIP'),
    };
  }

  // ======================= MODAL & QUESTION ANSWERING =======================
  async function answerQuestion(label) {
    for (const [pattern, answer] of QA_BANK) {
      if (pattern.test(label)) return answer;
    }
    if (CONFIG.geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text:
                `You are answering a job screening question on Foundit on my behalf. Answer in first person, 1-3 sentences, professional, no markdown.\n\nMy CV:\n${JSON.stringify(CV)}\n\nQuestion: ${label}` }] }],
            }),
          }
        );
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } catch (e) {
        log('Gemini call failed:', e.message);
      }
    }
    return GENERIC_ANSWER;
  }

  async function handleFounditModal(job) {
    const modal = await waitFor(() => document.querySelector('.modal.show, .modal.in, [role="dialog"], .apply-modal, .questionnaire-popup'), 4000);
    if (!modal) {
      log('  ✅ Quick Apply submitted directly (no extra questionnaire)');
      return true;
    }

    log('  📋 Answering Foundit questionnaire modal...');

    // 1. Text / Number inputs
    const inputs = [...modal.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"]')].filter(visible);
    for (const inp of inputs) {
      const label = inp.getAttribute('placeholder') || inp.getAttribute('name') || inp.closest('label')?.textContent || '';
      if (/current.*ctc|current.*salary/i.test(label)) {
        setValue(inp, CV.currentCTC || '3');
      } else if (/expected.*ctc|expected.*salary/i.test(label)) {
        setValue(inp, CV.expectedCTC || '4.5');
      } else if (/notice/i.test(label)) {
        setValue(inp, '0');
      } else if (/experience/i.test(label)) {
        setValue(inp, '1');
      } else {
        const ans = await answerQuestion(label);
        setValue(inp, ans);
      }
    }

    // 2. Dropdowns
    const selects = [...modal.querySelectorAll('select')].filter(visible);
    for (const sel of selects) {
      const opts = [...sel.options].filter((o) => o.value && !/^select|^choose/i.test(o.text));
      if (!opts.length) continue;
      const pick = opts.find((o) => /immediate|0|15|yes|available/i.test(o.text)) || opts[0];
      setValue(sel, pick.value);
    }

    // 3. Textareas
    const textareas = [...modal.querySelectorAll('textarea')].filter(visible);
    for (const ta of textareas) {
      const label = ta.getAttribute('placeholder') || ta.closest('label')?.textContent || '';
      const ans = await answerQuestion(label);
      setValue(ta, ans);
    }

    // 4. Submit button
    const submitBtn = findButtonByText(modal, /^apply$|^submit$|^send$|^confirm$|^apply now$/i);
    if (!submitBtn) {
      log('  ⚠ No Submit button found in modal — closing');
      findButtonByText(modal, /close|cancel|×/i)?.click();
      return false;
    }

    if (CONFIG.DRY_RUN) {
      log('  🔍 DRY_RUN — would click submit:', submitBtn.textContent.trim());
      findButtonByText(modal, /close|cancel|×/i)?.click();
      return true;
    }

    submitBtn.click();
    log('  ✅ Application submitted in modal');
    return true;
  }

  // ======================= SCRAPE FOUNDIT CARDS =======================
  function findFounditCards() {
    const cards = [];
    const cardElements = document.querySelectorAll(
      '.srpResultCard, .jobCard, .srp-card, .cardContainer, [data-job-id], .job-tuple'
    );

    for (const el of cardElements) {
      if (!visible(el)) continue;

      const linkEl = el.querySelector('a[href*="/job/"], a[href*="jobId"], .jobTitle a, h3 a');
      const href = linkEl?.getAttribute('href') || '';
      const jobId = extractJobId(el, href);
      if (!jobId || isJobAlreadyApplied(jobId)) continue;

      const title = (linkEl?.textContent || el.querySelector('.jobTitle, h3, h2')?.textContent || '').trim();
      if (!title || title.length < 3) continue;

      const company = (el.querySelector('.companyName, .company-name, [class*="company" i]')?.textContent || '').trim();

      const expEl = el.querySelector('.exp, .experience, [class*="experience" i], .job-exp');
      const experience = (expEl?.textContent || el.textContent.match(/\d+\s*-\s*\d+\s*Yrs/i)?.[0] || '').trim();

      const locEl = el.querySelector('.loc, .location, [class*="location" i], .job-loc');
      const location = (locEl?.textContent || el.textContent.match(/Bengaluru|Bangalore|Pune|Hyderabad|Remote|Mumbai|Gurgaon|Noida|Delhi|Ahmedabad/i)?.[0] || '').trim();

      const skillsEl = el.querySelector('.skill, .skills, [class*="skill" i], .keySkills');
      const skills = (skillsEl?.textContent || el.textContent).replace(/\s+/g, ' ').trim();

      const applyBtn = findButtonByText(el, /^apply$|^quick apply$|^apply now$/i) || el.querySelector('.btn-apply, .applyBtn');

      cards.push({
        id: jobId,
        href,
        title,
        company,
        experience,
        location,
        skills,
        description: el.textContent.replace(/\s+/g, ' ').trim(),
        applyBtn,
        cardEl: el,
      });
    }

    return cards;
  }

  let applied = 0;
  log(`Starting Foundit Precision Two-Layer Apply. Mode=${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}, Max=${CONFIG.MAX_APPLICATIONS}, Score Threshold=${CONFIG.SCORE_THRESHOLD}`);

  await sleep(4000);

  while (applied < CONFIG.MAX_APPLICATIONS) {
    const cards = findFounditCards();

    if (!cards.length) {
      log('No un-applied job cards found on current view. Scrolling down...');
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(4000);
      const newCards = findFounditCards();
      if (!newCards.length) {
        log('Foundit search results exhausted for current query.');
        break;
      }
      continue;
    }

    const job = cards[0];

    // ================= LAYER 1: PRE-CLICK HARD FILTERS =================
    // 1. Duplicate check
    if (isJobAlreadyApplied(job.id)) {
      log(`🚫 [SKIP: ALREADY_APPLIED] Job ID: ${job.id} (${job.title} @ ${job.company})`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // 2. External redirect check
    if (isExternalRedirect(job.cardEl)) {
      log(`🚫 [SKIP: EXTERNAL_ATS_REDIRECT] Job ID: ${job.id} ("${job.title}")`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // 3. Title Hard Exclusion Check
    const titleCheck = checkTitleHardExclusions(job.title);
    if (!titleCheck.pass) {
      log(`🚫 [SKIP: ${titleCheck.reason}] Job ID: ${job.id} ("${job.title}")`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // 4. Experience Hard Exclusion Check
    const expCheck = checkExperienceExclusion(job.experience || job.description);
    if (!expCheck.pass) {
      log(`🚫 [SKIP: ${expCheck.reason}] Job ID: ${job.id} ("${job.title}" - Exp: ${job.experience || 'N/A'})`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // 5. Location Fit Check
    const locCheck = checkLocationFit(job.location || job.description);
    if (!locCheck.pass) {
      log(`🚫 [SKIP: ${locCheck.reason}] Job ID: ${job.id} (Location: ${job.location || 'Unspecified'})`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // 6. Full Stack React Relevance Check
    const fsCheck = checkFullStackRelevance(job.title, job.skills + ' ' + job.description);
    if (!fsCheck.pass) {
      log(`🚫 [SKIP: ${fsCheck.reason}] Job ID: ${job.id} ("${job.title}")`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // ================= LAYER 2: MATCH SCORING (0-100) =================
    const matchResult = calculateMatchScore(job);
    log(`▶ Evaluating: ${job.title} @ ${job.company || 'Company'} | ID: ${job.id}`);
    log(`  📊 Score: ${matchResult.score}/100 [${matchResult.action}] | Breakdown: ${matchResult.breakdown}`);

    if (!matchResult.passed) {
      log(`🚫 [SKIP: LOW_MATCH_SCORE (${matchResult.score}/100)] Below threshold of ${CONFIG.SCORE_THRESHOLD}`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // ================= PROCEED WITH APPLICATION =================
    log(`  🎯 MATCH APPROVED (${matchResult.score}/100) — Applying to ${job.company || 'Company'}`);
    job.score = matchResult.score;
    job.breakdown = matchResult.breakdown;

    job.cardEl.scrollIntoView({ block: 'center' });
    await sleep(600);

    let btn = job.applyBtn;
    if (!btn) {
      // Click card to open detail view / side drawer
      const clickTarget = job.cardEl.querySelector('a, h3, h2, .jobTitle') || job.cardEl;
      clickTarget.click();
      await sleep(1800);
      btn = findButtonByText(document, /^apply$|^quick apply$|^apply now$/i) ||
            document.querySelector('.btn-apply, .applyBtn, [class*="applyBtn" i], .apply-btn');
    }

    if (!btn) {
      log('  ⚠ No Apply button found on card or details view — skipping');
      appliedJobIds[job.id] = true;
      continue;
    }

    btn.click();
    await sleep(2000);

    const ok = await handleFounditModal(job);
    if (ok) {
      applied++;
      appliedJobIds[job.id] = true;
      markJobAsApplied(job.id, job);
      log(`  progress: ${applied}/${CONFIG.MAX_APPLICATIONS}`);
    }

    await sleep(1500);
    await humanDelay();
  }

  log(`Finished. Total processed: ${applied} Foundit applications.`);
})();
