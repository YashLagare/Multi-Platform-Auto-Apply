/**
 * Wellfound Auto-Apply — Precision Two-Layer Decision Pipeline
 * =============================================================
 * Layer 1: Absolute Hard Filters (Duplicate, Title, JD Quality, Experience, Location, Full-Stack Relevance)
 * Layer 2: Match Scoring Engine (0-100 pts) — Auto-apply only if Score >= 65 (High match: 75+)
 * Personal data & API keys loaded from .env via the Playwright runner.
 */
(async function wellfoundAutoApply() {
  'use strict';

  const __CFG = (typeof window !== 'undefined' && window.__APPLY_CONFIG) || {};
  const appliedJobIds = __CFG.appliedJobIds || {};

  // ======================= CONFIGURATION =======================
  const CONFIG = {
    DRY_RUN: true,
    MAX_APPLICATIONS: 50,
    MIN_DELAY_MS: 60000,
    MAX_DELAY_MS: 150000,
    SCORE_THRESHOLD: 65, // Minimum score to proceed with application
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
    /\bmember\s+of\s+technical\s+staff\b/i,
  ];

  // ======================= CV DATA =======================
  const CV = __CFG.CV || {
    name: '', email: '', phone: '', location: '', currentRole: '', company: '', education: '',
    yearsOfExperience: '', skills: '', highlights: ['', '', '', '', ''], noticePeriod: '',
    currentCTC: '', expectedCTC: '', currentSalary: '', expectedSalary: '', dob: '', gender: '',
    workAuth: '', github: '', linkedin: '', portfolio: '', links: '', remoteOk: '', relocate: '', startDate: '',
  };

  // ======================= QUESTION → ANSWER BANK =======================
  const QA_BANK = [
    [/company name|current (company|employer)|organi[sz]ation/i, CV.company],
    [/years? of (work |professional )?experience|how (long|many years)/i,
      `I have ${CV.yearsOfExperience}. Hands-on with ${CV.skills.split(',').slice(0, 8).join(',')} and more.`],
    [/notice period|when can you (start|join)|start date|joining/i, CV.startDate],
    [/current .{0,15}(ctc|salary|compensation)/i, CV.currentSalary],
    [/(expected|desired) .{0,15}(ctc|salary|compensation|pay)|salary expectation/i, CV.expectedSalary],
    [/remote|work from home|wfh/i, CV.remoteOk],
    [/reloc|move to|shift to|based out of|work from (our )?office|on-?site/i, CV.relocate],
    [/visa|sponsorship|work authorization|legally authorized|right to work|citizen/i, CV.workAuth],
    [/where are you (based|located)|current location|city/i, CV.location],
    [/linkedin|github|portfolio|website|link/i, CV.links],
    [/why (do you want|are you interested|this role|this company|us|join)/i,
      `I build production web applications end to end. ${CV.highlights[0] || ''}. This role matches my core stack directly, and I want to contribute to high-impact products.`],
    [/tell (us|me) about yourself|introduce yourself|about you/i,
      `I'm ${CV.name}, ${CV.currentRole}. ${CV.highlights[0] || ''}. Key highlights: ${CV.highlights[1] || ''}. ${CV.highlights[2] || ''}.`],
    [/(biggest|proudest|favorite) (project|achievement|accomplishment)|worked on/i,
      `${CV.highlights[0] || ''}. I owned it from architecture through deployment and CI/CD.`],
    [/react|frontend|front-end/i,
      `Strong frontend experience: React.js, Next.js, Redux, Zustand, TypeScript, Tailwind CSS, and REST API integration.`],
    [/node|backend|back-end|api/i,
      `I build scalable backends with Node.js/Express, MongoDB, PostgreSQL, Prisma, REST APIs, authentication, and Docker.`],
    [/\b(ai|llm|ml|machine learning|genai|langchain)\b/i,
      `Hands-on with AI integration: Google Gemini API, OpenAI APIs, prompt engineering, and intelligent workflow automation.`],
    [/education|degree|university|college/i, CV.education],
    [/phone|contact number|mobile/i, CV.phone],
    [/e-?mail/i, CV.email],
    [/your name|full name|\bname\b/i, CV.name],
  ];

  const GENERIC_ANSWER =
    `I'm ${CV.name}, ${CV.currentRole}. Happy to elaborate in an interview — key highlights: ` +
    CV.highlights.slice(0, 2).join('; ') + '.';

  // ======================= COVER LETTER BUILDER =======================
  function coverLetter(company, title) {
    return `${CV.name}
${CV.phone} · ${CV.email}
${CV.linkedin} · ${CV.github} · ${CV.portfolio}

Dear ${company ? company + ' team' : 'Hiring Manager'},

I would like to apply for the ${title || 'Full Stack Developer'} position at ${company || 'your company'}.

I am currently a ${CV.currentRole || 'Full Stack Developer'}, working daily with ${CV.skills.split(',').slice(0, 8).join(',').trim()}. A recent example of my work: ${CV.highlights[0] || 'building scalable web applications end-to-end'}.

${CV.highlights[1] || ''}${CV.highlights[2] ? ' ' + CV.highlights[2] + '.' : ''}

I am interested in this position because the ${title || 'Full Stack Developer'} role directly matches the stack I work with every day, and I am excited to deliver performant features${company ? ' at ' + company : ''}. I would welcome the opportunity to discuss how my background aligns with your team's goals.

Thank you for your time and consideration.

Sincerely,
${CV.name}`;
  }

  // ======================= HELPERS =======================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const humanDelay = () => sleep(CONFIG.MIN_DELAY_MS + Math.random() * (CONFIG.MAX_DELAY_MS - CONFIG.MIN_DELAY_MS));
  const log = (...a) => console.log('%c[auto-apply]', 'color:#0a84ff;font-weight:bold', ...a);

  function extractJobId(url) {
    const m = (url || '').match(/\/jobs\/(\d+)/);
    return m ? m[1] : null;
  }

  function isJobAlreadyApplied(jobId, url) {
    if (!jobId) return false;
    if (appliedJobIds[jobId]) return true;
    try {
      if (localStorage.getItem(`wf_applied_${jobId}`) === 'true') return true;
      const history = JSON.parse(localStorage.getItem('wf_applied_history') || '{}');
      if (history[jobId]) return true;
    } catch (e) {}
    return false;
  }

  function markJobAsApplied(jobId, jobData) {
    if (!jobId) return;
    try {
      localStorage.setItem(`wf_applied_${jobId}`, 'true');
      const history = JSON.parse(localStorage.getItem('wf_applied_history') || '{}');
      history[jobId] = { date: new Date().toISOString(), title: jobData.title, company: jobData.company };
      localStorage.setItem('wf_applied_history', JSON.stringify(history));
    } catch (e) {}
  }

  function cleanTitle(raw) {
    return (raw || '')
      .replace(/\s+/g, ' ')
      .split(/remote only|on-?site|hybrid|₹|\$\d|€|posted \d|recruiter|•|\d+\s?(?:weeks?|days?|months?|hours?)\s?ago/i)[0]
      .replace(/\(?\s*remote\s*\)?$/i, '')
      .replace(/[\s\-–—|(,/]+$/g, '')
      .trim();
  }

  function setValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
                : el.tagName === 'SELECT' ? HTMLSelectElement.prototype
                : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function labelTextOf(el) {
    return (
      el.closest('label')?.textContent ||
      el.getAttribute('aria-label') ||
      el.getAttribute('placeholder') ||
      (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
      el.closest('div')?.previousElementSibling?.textContent ||
      el.parentElement?.textContent || ''
    ).trim();
  }

  function visible(el) {
    return el && el.getClientRects().length > 0 && !el.disabled;
  }

  function findButtonByText(root, regex) {
    return [...root.querySelectorAll('button, a[role="button"], [type="submit"]')]
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

  function checkExperienceExclusion(jdText) {
    const t = jdText.toLowerCase();

    // Check high experience ranges (e.g. 2-5 yrs, 3-5 yrs, 4-6 yrs, 5-8 yrs)
    const rangeMatch = t.match(/\b(?:2\s*[-–to]\s*5|3\s*[-–to]\s*5|3\s*[-–to]\s*6|4\s*[-–to]\s*[678]|5\s*[-–to]\s*[89]|5\s*[-–to]\s*10)\s*(?:years?|yrs?)\b/i);
    if (rangeMatch) {
      return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${rangeMatch[0]})` };
    }

    // Check fixed 4+, 5+, 6+ years
    const plusMatch = t.match(/\b(?:[4-9]|1\d)\+?\s*(?:years?|yrs?)(?:\s+of\s+experience|\s+experience)?\b/i);
    if (plusMatch && !/\b(?:0-2|0-3|1-3|1-2)\b/.test(plusMatch[0])) {
      const num = parseInt(plusMatch[0], 10);
      if (num >= 4) {
        return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${plusMatch[0]})` };
      }
    }

    // Check minimum 4/5 years
    const minMatch = t.match(/\b(?:min(?:imum)?|at\s*least)\s*of?\s*([4-9]|1\d)\s*(?:years?|yrs?)\b/i);
    if (minMatch) {
      return { pass: false, reason: `EXPERIENCE_EXCEEDS_LIMIT (${minMatch[0]})` };
    }

    return { pass: true };
  }

  function checkLocationFit(cardLoc, jdText) {
    const combined = ((cardLoc || '') + ' ' + (jdText || '')).toLowerCase();
    const isRemote = /\bremote\b|\bwork\s*from\s*home\b|\bwfh\b|\banywhere\b/i.test(combined);

    // Foreign residency locks (e.g. US/UK/EU citizens only)
    if (/\b(?:must\s+reside\s+in\s+the\s+u\.?s\.?|us\s+citizens\s+only|us\s+only|uk\s+only|eu\s+only|north\s+america\s+only)\b/i.test(combined)) {
      return { pass: false, reason: 'FOREIGN_LOCATION_RESTRICTION' };
    }

    const p1 = /\bbengaluru\b|\bbangalore\b|\bpune\b|\bhyderabad\b/i.test(combined);
    const p2 = /\bmumbai\b|\bchennai\b|\bgurgaon\b|\bgurugram\b|\bnoida\b|\bdelhi\b/i.test(combined);
    const p3 = /\bahmedabad\b/i.test(combined);

    if (p1 || p2 || p3 || isRemote) return { pass: true };

    return { pass: false, reason: 'NON_PRIORITY_ONSITE_LOCATION' };
  }

  function checkFullStackRelevance(title, jdText) {
    const isFullStackOrSDE = /\bfull\s*stack\b|\bfullstack\b|\bsoftware\s+engineer\b|\bsde\b/i.test(title);
    if (!isFullStackOrSDE) return { pass: true };

    const hasReactOrFrontend = /\breact(?:\.js|js)?\b|\bnext(?:\.js|js)?\b|\bmern\b|\btypescript\b|\bfrontend\b|\bfront-end\b|\bjavascript\b|\btailwind\b/i.test(jdText);
    if (!hasReactOrFrontend) {
      return { pass: false, reason: 'FULLSTACK_MISSING_REACT_STACK' };
    }
    return { pass: true };
  }

  // ======================= LAYER 2: MATCH SCORING ENGINE (0-100) =======================
  function calculateMatchScore(job, jdText) {
    let score = 0;
    const breakdown = [];
    const lowerJD = (jdText || '').toLowerCase();
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

    // 2. Primary Tech Stack Match in JD (Max 35 pts)
    let techPoints = 0;
    if (/\breact(?:\.js|js)?\b/.test(lowerJD)) { techPoints += 10; breakdown.push('React (+10)'); }
    if (/\bnext(?:\.js|js)?\b/.test(lowerJD)) { techPoints += 8; breakdown.push('Next.js (+8)'); }
    if (/\btypescript\b/.test(lowerJD)) { techPoints += 7; breakdown.push('TypeScript (+7)'); }
    else if (/\bjavascript\b|\bes6\b/.test(lowerJD)) { techPoints += 5; breakdown.push('JavaScript (+5)'); }

    if (/\bnode(?:\.js|js)?\b|\bexpress(?:\.js)?\b|\bmongodb\b/.test(lowerJD)) { techPoints += 5; breakdown.push('Node/Express/Mongo (+5)'); }
    if (/\btailwind(?:\s*css)?\b|\brest(?:\s*api)?\b|\bsql\b|\bprisma\b|\bpostgresql\b/.test(lowerJD)) { techPoints += 5; breakdown.push('Tailwind/REST/SQL (+5)'); }

    // Conflicting tech penalty
    if (/\bangular\b|\bvue(?:\.js)?\b|\bjava\b(?!\s*script)|\bspring(?:\s*boot)?\b|\b\.net\b|\bdjango\b/.test(lowerJD)) {
      techPoints = Math.max(0, techPoints - 15);
      breakdown.push('Conflicting tech penalty (-15)');
    }
    score += Math.min(35, techPoints);

    // 3. Experience Fit (Max 20 pts)
    if (/\b(?:0-1|0-2|0-3|1-2|1-3|fresh|fresher|entry\s*level|associate|junior)\b/.test(lowerJD)) {
      score += 20;
      breakdown.push('Exp: 0-3 yrs / Entry / Associate (+20)');
    } else if (!/\b\d+\+?\s*(?:years?|yrs?)\b/.test(lowerJD)) {
      score += 15;
      breakdown.push('Exp: Unspecified (+15)');
    } else {
      score += 10;
      breakdown.push('Exp: 2-3 yrs (+10)');
    }

    // 4. Location Tier (Max 10 pts)
    const loc = ((job.location || '') + ' ' + lowerJD).toLowerCase();
    if (/bengaluru|bangalore|pune|hyderabad/.test(loc) || /remote|work from home/.test(loc)) {
      score += 10;
      breakdown.push('Loc: P1 / Remote (+10)');
    } else if (/mumbai|chennai|gurgaon|gurugram|noida|delhi/.test(loc)) {
      score += 8;
      breakdown.push('Loc: P2 (+8)');
    } else if (/ahmedabad/.test(loc)) {
      score += 6;
      breakdown.push('Loc: P3 (+6)');
    } else {
      score += 5;
      breakdown.push('Loc: Other Remote (+5)');
    }

    // 5. Freshness (Max 10 pts)
    if (job.postedHours != null && job.postedHours <= 24) {
      score += 10;
      breakdown.push('Freshness: <24h (+10)');
    } else if (job.postedDays != null && job.postedDays <= 3) {
      score += 5;
      breakdown.push('Freshness: 1-3d (+5)');
    } else {
      score += 5;
      breakdown.push('Freshness: Normal (+5)');
    }

    const passed = score >= CONFIG.SCORE_THRESHOLD;
    return {
      score,
      breakdown: breakdown.join(', '),
      passed,
      action: score >= CONFIG.HIGH_SCORE_THRESHOLD ? 'HIGH_PRIORITY_APPLY' : (passed ? 'MODERATE_APPLY' : 'LOW_SCORE_SKIP'),
    };
  }

  // ======================= SCRAPING & APPLY FLOW =======================
  function scrapeJDText() {
    const selectors = [
      '#jobDescriptionText',
      '[data-test="JobDescription"]',
      '[class*="jobDescription" i]',
      '[class*="job-description" i]',
      '[class*="description" i]',
      'article',
      '[role="dialog"] section',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 80) {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        // Remove UI header/filter boilerplate
        if (!/only show in-office jobs in/i.test(text.slice(0, 100))) {
          return text;
        }
      }
    }
    // Fallback to modal/pane body text minus obvious buttons
    const modal = document.querySelector('[role="dialog"], [class*="modal" i]');
    if (modal) {
      return modal.textContent.replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  function getCompany() {
    const panelHeader = [...document.querySelectorAll('h1, h2, h3, div')]
      .map((e) => (e.children.length === 0 ? e.textContent.trim() : ''))
      .find((t) => /^apply to .{2,60}$/i.test(t));
    if (panelHeader) return panelHeader.replace(/^apply to /i, '').trim();
    const el =
      document.querySelector('a[href^="/company/"] h2') ||
      document.querySelector('[data-test="StartupHeader"] h1') ||
      document.querySelector('a[href^="/company/"]');
    let name = (el?.textContent || '').split('\n')[0].replace(/\s+/g, ' ').trim();
    if (/about the job|about us|apply|jobs|follow|save|^$/i.test(name) || name.split(' ').length > 6) name = '';
    return name;
  }

  async function answerQuestion(questionText) {
    for (const [pattern, answer] of QA_BANK) {
      if (pattern.test(questionText)) return answer;
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
                `You are answering a job application question on my behalf. Answer in first person, 2-4 sentences, professional, no markdown.\n\nMy CV:\n${JSON.stringify(CV)}\n\nQuestion: ${questionText}` }] }],
            }),
          }
        );
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      } catch (e) {
        log('Gemini call failed, using generic answer:', e.message);
      }
    }
    return GENERIC_ANSWER;
  }

  async function fillAndSubmit(company, title) {
    const modal = await waitFor(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"], [class*="modal" i]')];
      return dialogs.find((d) => /apply to /i.test(d.textContent) && d.querySelector('textarea')) ||
             dialogs.find((d) => /apply to /i.test(d.textContent)) ||
             dialogs.find((d) => d.querySelector('textarea'));
    });

    if (!modal) {
      log('  ⚠ no apply modal found — skipping');
      return false;
    }
    const scope = modal;

    // Location-blocked by company?
    if (/not accepting applications from your (current )?location/i.test(scope.textContent)) {
      log('  🚫 location-blocked by company — skipping');
      findButtonByText(scope, /close|cancel|×/i)?.click();
      scope.querySelector('[aria-label="Close"]')?.click();
      return false;
    }

    // 1. Cover letter
    const textareas = [...scope.querySelectorAll('textarea')].filter(visible);
    if (textareas.length) {
      setValue(textareas[0], coverLetter(company, title));
      log('  ✍ cover letter filled');
    }

    // 2. Extra question textareas/inputs
    const extraFields = [
      ...textareas.slice(1),
      ...[...scope.querySelectorAll('input[type="text"]:not([value])')].filter(visible),
    ];
    for (const field of extraFields) {
      const label = labelTextOf(field);
      if (/search/i.test(label)) continue;
      const answer = await answerQuestion(label);
      const required = field.required || field.getAttribute('aria-required') === 'true' || /\*/.test(label);
      if (answer === GENERIC_ANSWER && !required) {
        log(`  ⏭ optional unknown question skipped: "${label.slice(0, 50)}"`);
        continue;
      }
      setValue(field, answer);
      log(`  ✍ answered: "${label.slice(0, 60)}..."`);
    }

    // 3. Relocation & options
    if (/does not support the locations|update your location preferences/i.test(scope.textContent)) {
      const relocateChoice = [...scope.querySelectorAll('label, [role="radio"], button, div')]
        .filter(visible)
        .find((el) => /i can relocate/i.test(el.textContent) && el.textContent.length < 80);
      if (relocateChoice) {
        relocateChoice.click();
        log('  📍 chose "I can relocate to…"');
        await sleep(800);
        const nativeSel = [...scope.querySelectorAll('select')].filter(visible).pop();
        if (nativeSel) {
          const opts = [...nativeSel.options].filter((o) => o.value && !/select|choose/i.test(o.text));
          if (opts.length) setValue(nativeSel, opts[0].value);
        }
      }
    }

    // Dropdowns / Radios / Checkboxes
    const YES = /yes|willing|open to|agree|relocat|remote|immediat|i am able|i can/i;
    for (const sel of [...scope.querySelectorAll('select')].filter(visible)) {
      const opts = [...sel.options].filter((o) => o.value && !/^select|^choose|^--/i.test(o.text.trim()));
      if (!opts.length) continue;
      const pick = opts.find((o) => YES.test(o.text)) || opts[0];
      setValue(sel, pick.value);
    }

    const radioGroups = {};
    for (const r of [...scope.querySelectorAll('input[type="radio"]')].filter(visible)) {
      (radioGroups[r.name || labelTextOf(r)] ||= []).push(r);
    }
    for (const group of Object.values(radioGroups)) {
      let pick = group.find((r) => YES.test(labelTextOf(r))) || group[0];
      if (!pick.checked) pick.click();
    }

    for (const cb of [...scope.querySelectorAll('input[type="checkbox"]')].filter(visible)) {
      const own = labelTextOf(cb);
      if (!cb.checked && /relocat|agree|confirm|authoriz|terms|acknowledge|remote/i.test(own)) {
        cb.click();
      }
    }

    // 4. Send / Apply Button
    const sendBtn = await waitFor(() => findButtonByText(scope, /^apply$|^send$|submit|send application/i), 12000);
    if (!sendBtn) {
      log('  ⚠ no Send button found after waiting — skipping');
      findButtonByText(scope, /close|cancel|×/i)?.click();
      scope.querySelector('[aria-label="Close"]')?.click();
      return false;
    }

    if (CONFIG.DRY_RUN) {
      log('  🔍 DRY_RUN — would click:', sendBtn.textContent.trim());
      findButtonByText(scope, /close|cancel|×/i)?.click();
      scope.querySelector('[aria-label="Close"]')?.click();
      return true;
    }

    sendBtn.click();
    log('  ✅ application sent');
    return true;
  }

  // ======================= MAIN LOOP =======================
  function findJobRows() {
    const rows = [];
    for (const a of document.querySelectorAll('a[href*="/jobs/"]')) {
      const href = a.getAttribute('href') || '';
      if (!/\/jobs\/\d/.test(href)) continue;
      if (!visible(a) || a.textContent.trim().length < 4) continue;

      const jobId = extractJobId(href);
      if (!jobId) continue;

      let row = a.closest('div');
      for (let i = 0; i < 5 && row && row.textContent.trim().length < 60; i++) row = row.parentElement;
      row = row || a.parentElement;

      // Already applied check via card stamp or historical database
      if (/applied/i.test([...row.querySelectorAll('button, span')].map((e) => e.textContent.trim()).find((t) => /^applied$/i.test(t)) || '')) {
        continue;
      }
      if (isJobAlreadyApplied(jobId, href)) {
        continue;
      }

      // Freshness check
      const posted = row.textContent.match(/posted (?:about )?(\d+)\+? ?(day|week|month|hour|minute)s? ago/i);
      let postedHours = 12;
      let postedDays = 1;
      if (posted) {
        const n = +posted[1];
        const unit = posted[2].toLowerCase();
        if (unit.startsWith('hour') || unit.startsWith('minute')) { postedHours = n; postedDays = 0; }
        else if (unit.startsWith('day')) { postedHours = n * 24; postedDays = n; }
        else if (unit.startsWith('week')) { postedDays = n * 7; }
        else { postedDays = n * 30; }
        if (postedDays > 14) continue;
      }

      const company = (row.querySelector('img[alt*="logo" i]')?.alt || '')
        .replace(/company logo/i, '').trim();
      const salary = (row.textContent.match(/(?:₹|\$|€)\s?[\d.,k]+\s?(?:[–-]\s?(?:₹|\$|€)?\s?[\d.,k]+)?k?/i) || [''])[0].trim();
      const location = (row.textContent.match(/(?:in-office|remote|hybrid|in office)[^•\n]{0,60}/i) || [''])[0].trim();

      rows.push({
        id: jobId,
        href: a.href,
        title: cleanTitle(a.textContent),
        company,
        salary,
        location,
        postedHours,
        postedDays,
        linkEl: a,
      });
    }
    return rows;
  }

  let applied = 0;
  log(`Starting Precision Two-Layer Apply. DRY_RUN=${CONFIG.DRY_RUN}, max=${CONFIG.MAX_APPLICATIONS}, Score Threshold=${CONFIG.SCORE_THRESHOLD}`);

  await sleep(5000);

  while (applied < CONFIG.MAX_APPLICATIONS) {
    const allRows = findJobRows();
    if (!allRows.length) {
      log('No un-applied job cards found on current feed. Scrolling to load more...');
      let grew = false;
      for (let s = 0; s < 6 && !grew; s++) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(3000);
        grew = findJobRows().length > 0;
      }
      if (!grew) {
        log('Feed exhausted. Finished.');
        break;
      }
      continue;
    }

    const job = allRows[0];

    // ================= LAYER 1: PRE-CLICK CHECKS =================
    // 1. Duplicate check
    if (isJobAlreadyApplied(job.id, job.href)) {
      log(`🚫 [SKIP: ALREADY_APPLIED] Job ID: ${job.id} (${job.title} @ ${job.company})`);
      appliedJobIds[job.id] = true;
      continue;
    }

    // 2. Title Hard Exclusion Check
    const titleCheck = checkTitleHardExclusions(job.title);
    if (!titleCheck.pass) {
      log(`🚫 [SKIP: ${titleCheck.reason}] Job ID: ${job.id} ("${job.title}")`);
      appliedJobIds[job.id] = true; // Mark seen so we don't re-evaluate
      continue;
    }

    // ================= OPEN JOB PANE & FETCH FULL JD =================
    log(`▶ Evaluating: ${job.title} @ ${job.company || '?'} | ${job.href} | Job ID: ${job.id}`);
    job.linkEl.scrollIntoView({ block: 'center' });
    await sleep(500);
    job.linkEl.click();
    await sleep(3000);

    const jdText = scrapeJDText();

    // 3. JD Data Quality Check
    if (!jdText || jdText.length < 80) {
      log(`🚫 [SKIP: INSUFFICIENT_JD_DATA] Job ID: ${job.id} (JD length: ${jdText.length} chars)`);
      appliedJobIds[job.id] = true;
      (document.querySelector('button[aria-label="Close" i], [class*="Modal" i] button[class*="close" i]') ||
        findButtonByText(document, /^×$|^✕$/))?.click();
      await sleep(1000);
      continue;
    }

    // 4. Experience Exclusion Check
    const expCheck = checkExperienceExclusion(jdText);
    if (!expCheck.pass) {
      log(`🚫 [SKIP: ${expCheck.reason}] Job ID: ${job.id} ("${job.title}")`);
      appliedJobIds[job.id] = true;
      (document.querySelector('button[aria-label="Close" i], [class*="Modal" i] button[class*="close" i]') ||
        findButtonByText(document, /^×$|^✕$/))?.click();
      await sleep(1000);
      continue;
    }

    // 5. Location Fit Check
    const locCheck = checkLocationFit(job.location, jdText);
    if (!locCheck.pass) {
      log(`🚫 [SKIP: ${locCheck.reason}] Job ID: ${job.id} (Location: ${job.location || 'Unspecified'})`);
      appliedJobIds[job.id] = true;
      (document.querySelector('button[aria-label="Close" i], [class*="Modal" i] button[class*="close" i]') ||
        findButtonByText(document, /^×$|^✕$/))?.click();
      await sleep(1000);
      continue;
    }

    // 6. Full Stack Stack Relevance Check
    const fsCheck = checkFullStackRelevance(job.title, jdText);
    if (!fsCheck.pass) {
      log(`🚫 [SKIP: ${fsCheck.reason}] Job ID: ${job.id} ("${job.title}")`);
      appliedJobIds[job.id] = true;
      (document.querySelector('button[aria-label="Close" i], [class*="Modal" i] button[class*="close" i]') ||
        findButtonByText(document, /^×$|^✕$/))?.click();
      await sleep(1000);
      continue;
    }

    // ================= LAYER 2: MATCH SCORING (0-100) =================
    const matchResult = calculateMatchScore(job, jdText);
    log(`  📊 Evaluation Score: ${matchResult.score}/100 [${matchResult.action}]`);
    log(`  📊 Breakdown: ${matchResult.breakdown}`);

    if (!matchResult.passed) {
      log(`🚫 [SKIP: LOW_MATCH_SCORE (${matchResult.score}/100)] Below threshold of ${CONFIG.SCORE_THRESHOLD}`);
      appliedJobIds[job.id] = true;
      (document.querySelector('button[aria-label="Close" i], [class*="Modal" i] button[class*="close" i]') ||
        findButtonByText(document, /^×$|^✕$/))?.click();
      await sleep(1000);
      continue;
    }

    // ================= PROCEED WITH APPLICATION =================
    log(`  🎯 MATCH APPROVED (${matchResult.score}/100) — Proceeding to Apply`);
    job.jd = jdText;
    job.score = matchResult.score;
    job.breakdown = matchResult.breakdown;

    const ok = await fillAndSubmit(job.company || getCompany(), job.title);
    if (ok) {
      applied++;
      appliedJobIds[job.id] = true;
      markJobAsApplied(job.id, job);
      log(`  progress: ${applied}/${CONFIG.MAX_APPLICATIONS}`);
    }

    // Close overlay
    await sleep(1000);
    (document.querySelector('button[aria-label="Close" i], [class*="Modal" i] button[class*="close" i]') ||
      findButtonByText(document, /^×$|^✕$/))?.click();
    await sleep(1000);
    await humanDelay();
  }

  log(`Finished. Total processed: ${applied} applications.`);
})();
