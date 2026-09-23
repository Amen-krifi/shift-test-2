// site.js — connects the static SHIFT page to Supabase.
// Requires config.js (defines `supabaseClient`) to be loaded first.

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

// ---------------------------------------------------------------------------
// CURATED SPEAKERS DATA (for rich modal details & static fallbacks)
// ---------------------------------------------------------------------------
const CURATED_SPEAKERS = [
  {
    name: "Executive Keynote Speaker",
    role: "Founder & CEO",
    company: "Leading Enterprise Scaleup",
    badge: "Keynote Address",
    time: "10:15 – 11:00",
    session_title: "AI Is Changing Business",
    abstract: "Unpacking macro AI adoption across enterprise structures, ROI calculation models, capital allocation shifts, and navigating technical debt when transitioning legacy infrastructure to modern neural stacks.",
    bio: "Serial entrepreneur and technology leader with 15+ years scaling B2B enterprise software and operational intelligence platforms across EMEA and North Africa.",
    linkedin_url: "https://www.linkedin.com/",
    twitter_url: "https://x.com/"
  },
  {
    name: "Enterprise Growth Architect",
    role: "Head of Growth & Automation",
    company: "Fintech & Automation Platform",
    badge: "Case Studies",
    time: "11:30 – 12:15",
    session_title: "AI in the Real World",
    abstract: "Real data from 50+ enterprise rollouts. An unflinching analysis of what works in automated underwriting, risk modelling, customer intelligence workflows, and why 80% of experimental POCs fail before reaching production.",
    bio: "Oversees automation and product scalability in banking and transaction processing platforms, bridging software engineering and business development.",
    linkedin_url: "https://www.linkedin.com/",
    twitter_url: "https://x.com/"
  },
  {
    name: "Lead Product Architect",
    role: "Product & Infrastructure Lead",
    company: "Deep Learning Infrastructure",
    badge: "Product Systems",
    time: "13:45 – 14:30",
    session_title: "Building with AI, Not Just Talking About It",
    abstract: "A deep dive into concrete architecture blueprints: low-latency model serving, agentic orchestration pipelines, fine-tuning vs. prompt-context tradeoffs, and keeping cloud costs under strict executive control.",
    bio: "Engineering architect specialized in distributed systems and production machine learning pipelines, advising international venture scaleups.",
    linkedin_url: "https://www.linkedin.com/",
    twitter_url: "https://x.com/"
  },
  {
    name: "Venture Capital Partner",
    role: "Managing Partner",
    company: "Pan-African Venture Capital",
    badge: "Grand Panelist",
    time: "14:30 – 15:15",
    session_title: "The Big Conversation: Board Level Strategy",
    abstract: "C-suite debate exploring sovereign AI capabilities, regional talent retention, how capital allocators assess artificial intelligence moats, and the strategic positioning of emerging tech hubs in Tunisia.",
    bio: "Veteran venture capitalist and angel investor backing high-growth technology companies across Africa and the Mediterranean basin.",
    linkedin_url: "https://www.linkedin.com/",
    twitter_url: "https://x.com/"
  },
  {
    name: "AI Transformation Director",
    role: "AI Strategy Consultant",
    company: "Advisory & Transformational Operations",
    badge: "Practical Lab",
    time: "15:45 – 16:30",
    session_title: "Your Business, SHIFTed: Hands-on Frameworks",
    abstract: "An interactive, practical workshop demonstrating how to audit enterprise friction points, map them to AI-augmented workflows, and establish measurable KPIs for immediate operational gains.",
    bio: "Consultant and transformation lead who has advised tier-1 telecom, banking, and retail corporations on workforce readiness and digital capability evolution.",
    linkedin_url: "https://www.linkedin.com/",
    twitter_url: "https://x.com/"
  },
  {
    name: "Global Systems Strategist",
    role: "Serial Tech Entrepreneur",
    company: "Global Systems Architect",
    badge: "Closing Perspective",
    time: "16:30 – 17:15",
    session_title: "What Comes Next? & 2027 Vision",
    abstract: "Forward-looking synthesis on frontier model trajectories, embodied AI, robotics, multimodal reasoning, and closing recommendations for tomorrow's executive leaders.",
    bio: "Pioneer in artificial intelligence research and commercial deployment with extensive advisory experience for technology ministries and research labs.",
    linkedin_url: "https://www.linkedin.com/",
    twitter_url: "https://x.com/"
  }
];

let loadedSpeakersList = [];

function openSpeakerModal(speaker) {
  if (!speaker) return;

  const modalName = document.getElementById("speaker-modal-name");
  const modalBadge = document.getElementById("speaker-modal-badge");
  const modalRole = document.getElementById("speaker-modal-role");
  const modalCompany = document.getElementById("speaker-modal-company");
  const modalTime = document.getElementById("speaker-modal-time");
  const modalSession = document.getElementById("speaker-modal-session");
  const modalAbstract = document.getElementById("speaker-modal-abstract");
  const modalBio = document.getElementById("speaker-modal-bio");
  const modalAvatar = document.getElementById("speaker-modal-avatar");
  const modalLinkedin = document.getElementById("speaker-modal-linkedin");

  if (modalName) modalName.textContent = speaker.name || "Speaker Announcement Soon";
  if (modalBadge) modalBadge.textContent = speaker.badge || "Summit Speaker";
  if (modalRole) modalRole.textContent = speaker.role || "Executive Leader";
  if (modalCompany) modalCompany.textContent = speaker.company || "Enterprise AI";
  if (modalTime) modalTime.textContent = speaker.time || "Summit Day";
  if (modalSession) modalSession.textContent = speaker.session_title || "Executive Briefing";
  if (modalAbstract) modalAbstract.textContent = speaker.abstract || "Detailed talk abstract, operational framework, and key takeaways for summit attendees.";
  if (modalBio) modalBio.textContent = speaker.bio || "Full biography and professional background will be published ahead of summit day.";

  if (modalAvatar) {
    if (speaker.photo_url) {
      modalAvatar.innerHTML = `<img src="${escapeHtml(speaker.photo_url)}" alt="${escapeHtml(speaker.name)}" class="w-full h-full object-cover"/>`;
    } else {
      modalAvatar.innerHTML = `<span class="material-symbols-outlined text-[36px]">person</span>`;
    }
  }

  if (modalLinkedin) {
    if (speaker.linkedin_url) {
      modalLinkedin.href = speaker.linkedin_url;
      modalLinkedin.classList.remove("hidden");
    } else {
      modalLinkedin.classList.add("hidden");
    }
  }

  openModal("modal-speaker-detail");
}

function bindSpeakerCards() {
  const cards = document.querySelectorAll(".speaker-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const idx = card.dataset.speakerIndex;
      if (idx !== undefined && CURATED_SPEAKERS[idx]) {
        openSpeakerModal(CURATED_SPEAKERS[idx]);
      } else if (card.dataset.speakerId && loadedSpeakersList.length) {
        const found = loadedSpeakersList.find((s) => s.id === card.dataset.speakerId);
        if (found) openSpeakerModal(found);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// SPEAKERS
// ---------------------------------------------------------------------------
async function loadSpeakers() {
  bindSpeakerCards();
  const grid = document.getElementById("speakers-grid");
  if (!grid || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("speakers")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return; // keep curated static cards

  loadedSpeakersList = data;
  grid.innerHTML = data
    .map(
      (s) => `
    <div class="speaker-card bg-surface-card rounded-xl p-space-lg flex flex-col justify-between h-full shadow-sm hover:bg-surface-card-hover hover:border-primary-container/40 border border-transparent transition-all group cursor-pointer" data-speaker-id="${s.id}">
      <div>
        <div class="w-full h-48 rounded-lg bg-surface-container-high flex flex-col items-center justify-center relative overflow-hidden mb-space-md">
          ${
            s.photo_url
              ? `<img src="${escapeHtml(s.photo_url)}" alt="${escapeHtml(s.name)}" class="w-full h-full object-cover"/>`
              : `<span class="font-headline-lg text-headline-lg text-primary-container font-bold">${escapeHtml(initials(s.name))}</span>`
          }
        </div>
        ${s.badge ? `<span class="font-label-badge text-label-badge text-primary-container uppercase tracking-wider">${escapeHtml(s.badge)}</span>` : ""}
        <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold mt-space-xs group-hover:text-primary-container transition-colors">${escapeHtml(s.name)}</h3>
        ${s.role ? `<p class="font-body-sm text-body-sm text-secondary">${escapeHtml(s.role)}</p>` : ""}
        ${s.company ? `<p class="font-body-sm text-body-sm text-text-muted">${escapeHtml(s.company)}</p>` : ""}
      </div>
      <div class="mt-space-lg pt-space-sm flex items-center justify-between text-text-muted">
        <span class="font-label-code text-label-code text-primary-container">${s.session_title ? "Session: " + escapeHtml(s.session_title) : "View Abstract"}</span>
        <span class="material-symbols-outlined text-[18px] text-primary-container">arrow_forward</span>
      </div>
    </div>`
    )
    .join("");

  bindSpeakerCards();
}

// ---------------------------------------------------------------------------
// TEAM
// ---------------------------------------------------------------------------
async function loadTeam() {
  const grid = document.getElementById("team-grid");
  if (!grid || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("team_members")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return;

  grid.innerHTML = data
    .map(
      (m) => `
    <div class="bg-surface-card rounded-xl p-space-lg flex flex-col justify-between hover:bg-surface-card-hover transition-colors">
      <div class="w-full h-56 rounded-lg bg-surface-container-high flex flex-col items-center justify-center mb-space-md overflow-hidden">
        ${
          m.photo_url
            ? `<img src="${escapeHtml(m.photo_url)}" alt="${escapeHtml(m.name)}" class="w-full h-full object-cover"/>`
            : `<span class="font-headline-sm text-headline-sm text-primary-container font-bold">${escapeHtml(initials(m.name))}</span>`
        }
      </div>
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-headline-sm text-headline-sm text-text-primary font-bold">${escapeHtml(m.name)}</h4>
          ${m.role ? `<p class="font-body-sm text-body-sm text-secondary">${escapeHtml(m.role)}</p>` : ""}
        </div>
        ${
          m.linkedin_url
            ? `<a class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors" href="${escapeHtml(m.linkedin_url)}" rel="noreferrer" target="_blank"><span class="material-symbols-outlined text-[18px]">share</span></a>`
            : ""
        }
      </div>
    </div>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// PARTNERS (approved, displayed logos)
// ---------------------------------------------------------------------------
async function loadPartners() {
  const grid = document.getElementById("partners-grid");
  const label = document.getElementById("partners-strip-label");
  if (!grid || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("partners")
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return;

  if (label) label.textContent = "Trusted By · Our Partners";

  grid.innerHTML = data
    .map(
      (p) => `
    <a href="${p.website_url ? escapeHtml(p.website_url) : "#"}" target="${p.website_url ? "_blank" : "_self"}" rel="noreferrer"
       class="h-16 rounded-lg bg-surface-card flex items-center justify-center text-text-muted font-label-code text-label-code uppercase tracking-wider hover:text-text-primary transition-colors overflow-hidden p-space-sm">
      ${
        p.logo_url
          ? `<img src="${escapeHtml(p.logo_url)}" alt="${escapeHtml(p.name)}" class="max-h-full max-w-full object-contain"/>`
          : escapeHtml(p.name)
      }
    </a>`
    )
    .join("");
}

// ---------------------------------------------------------------------------
// MODALS MANAGEMENT
// ---------------------------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";

  // Focus the first input or primary button inside the modal
  const firstInput = modal.querySelector("input:not([type=hidden]), textarea, button:not(.modal-close-btn)");
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 50);
  }
}

function closeModal(modalOrId) {
  const modal = typeof modalOrId === "string" ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;
  modal.classList.remove("flex");
  modal.classList.add("hidden");

  // Check if any modal is still visible
  const anyOpen = document.querySelector(".fixed[id^='modal-']:not(.hidden)");
  if (!anyOpen) {
    document.body.style.overflow = "";
  }
}

function closeAllModals() {
  document.querySelectorAll(".fixed[id^='modal-']").forEach((m) => {
    m.classList.remove("flex");
    m.classList.add("hidden");
  });
  document.body.style.overflow = "";
}

function initModals() {
  // Close buttons inside any modal
  document.querySelectorAll(".modal-close-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".fixed[id^='modal-']");
      if (modal) closeModal(modal);
    });
  });

  // Clicking on the backdrop overlay closes the modal
  document.querySelectorAll(".fixed[id^='modal-']").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // ESC key closes topmost open modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = Array.from(document.querySelectorAll(".fixed[id^='modal-']:not(.hidden)"));
      if (openModals.length > 0) {
        closeModal(openModals[openModals.length - 1]);
      }
    }
  });

  // Partner Confirmation prompt buttons
  const partnerRedirectBtn = document.getElementById("partner-redirect-to-reg-btn");
  if (partnerRedirectBtn) {
    partnerRedirectBtn.addEventListener("click", () => {
      closeModal("modal-partner-confirm");
      openModal("modal-registration");
    });
  }

  const partnerProceedBtn = document.getElementById("partner-proceed-btn");
  if (partnerProceedBtn) {
    partnerProceedBtn.addEventListener("click", () => {
      closeModal("modal-partner-confirm");
      openModal("modal-partner-form");
    });
  }

  // Intercept all "Become a Partner" buttons / links
  const partnerTriggers = document.querySelectorAll(
    'a[href="#become-a-partner"], a[data-path="become-a-partner"], #partner-cta'
  );
  partnerTriggers.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllModals();
      openModal("modal-partner-confirm");
    });
  });

  // Intercept all "Register" buttons / links
  const registerTriggers = document.querySelectorAll(
    'a[href="#register"], a[data-path="register"], #register-cta'
  );
  registerTriggers.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeAllModals();
      openModal("modal-registration");
    });
  });
}

// ---------------------------------------------------------------------------
// CALENDAR INTEGRATION (.ICS & GOOGLE CALENDAR)
// ---------------------------------------------------------------------------
function generateIcsContent() {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIESEC in Bardo//SHIFT Executive AI Summit//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:shift-summit-2026@aiesec.net",
    "DTSTAMP:20260923T100000Z",
    "DTSTART:20261128T080000Z",
    "DTEND:20261128T173000Z",
    "SUMMARY:SHIFT 2026 — Executive AI Summit",
    "DESCRIPTION:A one-day executive summit convening enterprise founders, c-level strategists, and machine intelligence architects with the next generation of builders organized by AIESEC in Bardo.\\n\\nLocation: Tunis, Tunisia.",
    "LOCATION:Cité de la Culture / UTICA, Tunis, Tunisia",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

function downloadIcsFile() {
  const ics = generateIcsContent();
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "SHIFT-2026-Executive-AI-Summit.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setupCalendarLinks() {
  const googleUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" +
    encodeURIComponent("SHIFT 2026 — Executive AI Summit") +
    "&dates=20261128T080000Z/20261128T173000Z" +
    "&details=" +
    encodeURIComponent(
      "A one-day executive summit convening enterprise founders, c-level strategists, and machine intelligence architects by AIESEC in Bardo.\n\nSummit Date: 28 November 2026\nVenue: Tunis, Tunisia"
    ) +
    "&location=" +
    encodeURIComponent("Cité de la Culture / UTICA, Tunis, Tunisia");

  const googleLink = document.getElementById("cal-google-link");
  if (googleLink) googleLink.href = googleUrl;

  const icsBtn = document.getElementById("cal-ics-btn");
  if (icsBtn) {
    icsBtn.addEventListener("click", downloadIcsFile);
  }

  const heroCalBtn = document.getElementById("hero-cal-btn");
  if (heroCalBtn) {
    heroCalBtn.addEventListener("click", downloadIcsFile);
  }
}

// ---------------------------------------------------------------------------
// DIGITAL ATTENDEE PASS GENERATOR (HTML5 CANVAS → PNG EXPORT)
// ---------------------------------------------------------------------------
function generatePassCanvas(name, org, passId) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 680;
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 1200, 680);
  bg.addColorStop(0, "#0b0e14");
  bg.addColorStop(0.4, "#131b26");
  bg.addColorStop(1, "#07090d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 680);

  // Subtle tech grid lines
  ctx.strokeStyle = "rgba(205, 241, 72, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 680);
    ctx.stroke();
  }
  for (let y = 0; y < 680; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Neon frame
  ctx.strokeStyle = "#cdf148";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, 1144, 624);

  // Corner highlights
  ctx.fillStyle = "#cdf148";
  const cornerSize = 16;
  ctx.fillRect(28, 28, cornerSize, 4);
  ctx.fillRect(28, 28, 4, cornerSize);
  ctx.fillRect(1172 - cornerSize, 28, cornerSize, 4);
  ctx.fillRect(1168, 28, 4, cornerSize);
  ctx.fillRect(28, 648, cornerSize, 4);
  ctx.fillRect(28, 652 - cornerSize, 4, cornerSize);
  ctx.fillRect(1172 - cornerSize, 648, cornerSize, 4);
  ctx.fillRect(1168, 652 - cornerSize, 4, cornerSize);

  // Glow Accent
  const glow = ctx.createRadialGradient(1000, 100, 10, 1000, 100, 320);
  glow.addColorStop(0, "rgba(205, 241, 72, 0.22)");
  glow.addColorStop(1, "rgba(205, 241, 72, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 680);

  // Brand Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 52px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText("SHIFT", 70, 110);
  ctx.fillStyle = "#cdf148";
  ctx.fillText(".", 225, 110);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "600 15px 'JetBrains Mono', monospace";
  ctx.fillText("EXECUTIVE AI SUMMIT · AIESEC IN BARDO", 70, 142);

  // Pass Code pill badge
  ctx.fillStyle = "rgba(205, 241, 72, 0.15)";
  ctx.fillRect(830, 75, 280, 48);
  ctx.strokeStyle = "rgba(205, 241, 72, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(830, 75, 280, 48);

  ctx.fillStyle = "#cdf148";
  ctx.font = "700 15px 'JetBrains Mono', monospace";
  ctx.fillText("PASS: " + (passId || "SHFT-DELEGATE"), 850, 105);

  // Divider
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(70, 185);
  ctx.lineTo(1110, 185);
  ctx.stroke();

  // Credential Subhead
  ctx.fillStyle = "#cdf148";
  ctx.font = "600 16px 'JetBrains Mono', monospace";
  ctx.fillText("OFFICIAL DELEGATE CREDENTIAL", 70, 235);

  // Delegate Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 54px 'Plus Jakarta Sans', system-ui, sans-serif";
  const safeName = (name || "Delegate").toUpperCase();
  ctx.fillText(safeName, 70, 310);

  // University / Affiliation
  ctx.fillStyle = "#b2d42b";
  ctx.font = "600 22px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(org || "Participant · Summit General Assembly", 70, 355);

  // Metadata Card inside pass
  ctx.fillStyle = "rgba(18, 23, 33, 0.85)";
  ctx.fillRect(70, 415, 1040, 115);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.strokeRect(70, 415, 1040, 115);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillText("DATE", 100, 455);
  ctx.fillText("VENUE", 360, 455);
  ctx.fillText("ACCESS LEVEL", 680, 455);
  ctx.fillText("STATUS", 920, 455);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 18px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText("28 NOV 2026", 100, 495);
  ctx.fillText("TUNIS, TUNISIA", 360, 495);
  ctx.fillText("FULL DELEGATE", 680, 495);

  ctx.fillStyle = "#cdf148";
  ctx.fillText("CONFIRMED", 920, 495);

  // Footer bar & barcode
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "500 13px 'JetBrains Mono', monospace";
  ctx.fillText("DATABASE VERIFIED · AIESEC IN BARDO SUMMIT GOVERNANCE", 70, 600);

  for (let i = 0; i < 32; i++) {
    const barW = i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1;
    ctx.fillStyle = i % 5 === 0 ? "#cdf148" : "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(940 + i * 5, 580, barW, 26);
  }

  return canvas;
}

function downloadPassImage() {
  const name = document.getElementById("verif-name")?.textContent || "Delegate";
  const org = document.getElementById("pass-holder-org")?.textContent || "Summit Participant";
  const code = document.getElementById("pass-code")?.textContent || "SHFT-DELEGATE";
  const canvas = generatePassCanvas(name, org, code);

  const link = document.createElement("a");
  link.download = `SHIFT-2026-Pass-${name.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------------------------------------------------------------------------
// SOCIAL SHARE KIT
// ---------------------------------------------------------------------------
function setupSocialShareKit() {
  const pageUrl = window.location.origin + window.location.pathname;
  const shareText =
    "I just registered for SHIFT 2026 — the Executive AI Summit by AIESEC in Bardo! Looking forward to exploring enterprise AI deployment in Tunis.";

  const liBtn = document.getElementById("share-linkedin-btn");
  if (liBtn) {
    liBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
  }

  const xBtn = document.getElementById("share-x-btn");
  if (xBtn) {
    xBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      shareText
    )}&url=${encodeURIComponent(pageUrl)}&hashtags=SHIFT2026,AIEnterprise,AIESEC`;
  }

  const copyBtn = document.getElementById("share-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        copyBtn.innerHTML = `<span class="material-symbols-outlined text-[16px] text-primary-container">done</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<span class="material-symbols-outlined text-[16px]">link</span>`;
        }, 2000);
      } catch (e) {
        console.warn("Clipboard copy err:", e);
      }
    });
  }

  const passBtn = document.getElementById("download-pass-btn");
  if (passBtn) {
    passBtn.addEventListener("click", downloadPassImage);
  }
}

// ---------------------------------------------------------------------------
// REGISTER FORM → insert into applicants table in Supabase + confirmation popup
// ---------------------------------------------------------------------------
function initRegisterForm() {
  const form = document.getElementById("register-form");
  if (!form) return;
  const msgEl = document.getElementById("register-form-message");
  const submitLabel = document.getElementById("register-submit-label");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = "Registering...";
    if (msgEl) msgEl.classList.add("hidden");

    const payload = {
      full_name: document.getElementById("reg-name").value.trim(),
      email: document.getElementById("reg-email").value.trim(),
      phone: document.getElementById("reg-phone").value.trim(),
      university: document.getElementById("reg-university")?.value.trim() || "",
      faculty: document.getElementById("reg-faculty")?.value.trim() || "",
    };

    if (supabaseClient) {
      try {
        // Direct insert into applicants table — no verification/lookup query against the database
        const { error } = await supabaseClient
          .from("applicants")
          .insert([payload]);

        if (error) {
          submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = "Submit Registration";
          if (msgEl) {
            msgEl.textContent =
              error.code === "23505"
                ? "That email is already registered — see you at SHIFT!"
                : "Unable to complete registration. Please verify details and try again.";
            msgEl.classList.remove("hidden");
            msgEl.classList.add("text-error");
          }
          return;
        }

        // Fire confirmation email edge function (best-effort)
        try {
          await supabaseClient.functions.invoke("send-confirmation", {
            body: { full_name: payload.full_name, email: payload.email },
          });
        } catch (emailErr) {
          console.warn("Confirmation email worker:", emailErr);
        }
      } catch (clientErr) {
        console.warn("Supabase network error:", clientErr);
      }
    }

    // Reset and enable form
    form.reset();
    submitBtn.disabled = false;
    if (submitLabel) submitLabel.textContent = "Submit Registration";
    if (msgEl) msgEl.classList.add("hidden");

    // Close the registration form modal
    closeModal("modal-registration");

    // Populate the Confirmation Pop-up Window
    const verifName = document.getElementById("verif-name");
    const verifEmail = document.getElementById("verif-email");

    if (verifName) verifName.textContent = payload.full_name || "Delegate";
    if (verifEmail) verifEmail.textContent = payload.email || "—";

    // Populate Pass Card
    const passName = document.getElementById("pass-holder-name");
    const passOrg = document.getElementById("pass-holder-org");
    const passCode = document.getElementById("pass-code");

    if (passName) passName.textContent = payload.full_name || "Delegate Name";
    const orgText = [payload.faculty, payload.university].filter(Boolean).join(" · ") || "Executive Delegate";
    if (passOrg) passOrg.textContent = orgText;
    if (passCode) {
      const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      passCode.textContent = `SHFT-2026-${randHex}`;
    }

    // Open the confirmation popup window confirming they are added to the database
    openModal("modal-reg-verification");
  });
}

// ---------------------------------------------------------------------------
// BECOME A PARTNER FORM → partner_applications table + verification popup
// ---------------------------------------------------------------------------
function initPartnerForm() {
  const form = document.getElementById("partner-form");
  if (!form) return;
  const msgEl = document.getElementById("partner-form-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    if (msgEl) msgEl.classList.add("hidden");

    const payload = {
      company_name: document.getElementById("partner-company").value.trim(),
      contact_name: document.getElementById("partner-contact").value.trim(),
      email: document.getElementById("partner-email").value.trim(),
      phone: document.getElementById("partner-phone")?.value.trim() || "",
      message: document.getElementById("partner-message")?.value.trim() || "",
    };

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from("partner_applications").insert(payload);
        if (error) {
          submitBtn.disabled = false;
          if (msgEl) {
            msgEl.textContent = "Something went wrong. Please check your inputs and try again.";
            msgEl.classList.remove("hidden");
            msgEl.classList.add("text-error");
          }
          return;
        }
      } catch (err) {
        console.warn("Supabase partner insert err:", err);
      }
    }

    form.reset();
    submitBtn.disabled = false;
    if (msgEl) msgEl.classList.add("hidden");

    // Close partner form modal
    closeModal("modal-partner-form");

    // Populate the Partner Verification Pop-up Window
    const verifCompany = document.getElementById("verif-partner-company");
    const verifContact = document.getElementById("verif-partner-contact");

    if (verifCompany) verifCompany.textContent = payload.company_name;
    if (verifContact) verifContact.textContent = payload.contact_name;

    // Open verification popup window
    openModal("modal-partner-verification");
  });
}

// ---------------------------------------------------------------------------
// INTERACTIVE AGENDA: TYPE FILTERING & HOVER/TOUCH EXPANSION
// ---------------------------------------------------------------------------
function downloadSessionIcs(title, desc, startIso, endIso, room) {
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AIESEC in Bardo//SHIFT Executive AI Summit//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:shift-session-" + Date.now() + "@aiesec.net",
    "DTSTAMP:20260923T100000Z",
    "DTSTART:" + startIso,
    "DTEND:" + endIso,
    "SUMMARY:SHIFT 2026: " + title,
    "DESCRIPTION:" + desc.replace(/\n/g, "\\n"),
    "LOCATION:" + (room || "Cité de la Culture / UTICA, Tunis, Tunisia"),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const cleanFilename = title.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
  link.download = "SHIFT-" + cleanFilename + ".ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderAgendaItemHtml(item) {
  const type = item.type || "talks";
  const badge = item.badge || (type === "networking" ? "Networking" : type === "workshop" ? "Interactive Workshop" : "Speaker Talk");
  const badgeColorClass =
    type === "workshop"
      ? "text-primary-container bg-glow-lime"
      : type === "networking"
      ? "text-on-surface-variant bg-surface-container"
      : "text-secondary-fixed-dim bg-surface-container";

  const hostCategory = item.host_category || (type === "networking" ? "Session Host" : type === "workshop" ? "Lab Facilitator" : "Featured Faculty");
  const hostInitials = item.host_initials || initials(item.host_name || "SH");

  const takeawaysHtml = (item.takeaways || [])
    .map((t) => `<li class="flex items-start gap-1.5"><span class="text-primary-container leading-none">›</span><span>${escapeHtml(t)}</span></li>`)
    .join("");

  const kickerText =
    type === "networking"
      ? "Session Format & Networking Context"
      : type === "workshop"
      ? "Interactive Sprint Lab Brief"
      : "Executive Overview & Strategic Thesis";

  const hostRoleLabel = type === "networking" ? "Session Host" : type === "workshop" ? "Lead Coach" : "Featured Speaker";

  return `
<div class="agenda-item group relative bg-surface-card rounded-xl p-space-md sm:p-space-lg border border-surface-border/60 hover:border-primary-container/50 hover:bg-surface-card-hover transition-all duration-300 shadow-sm cursor-pointer select-none" data-agenda-type="${escapeHtml(type)}" tabindex="0">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
    <div class="flex items-start sm:items-center gap-space-md flex-1">
      <span class="font-label-code text-label-code text-primary-container w-28 shrink-0 group-hover:text-primary-fixed-dim transition-colors">${escapeHtml(item.time || "TBD")}</span>
      <div class="flex flex-col">
        <span class="font-headline-sm text-headline-sm text-text-primary font-bold group-hover:text-white transition-colors">${escapeHtml(item.title)}</span>
        ${item.subtitle ? `<span class="font-body-sm text-body-sm text-text-muted">${escapeHtml(item.subtitle)}</span>` : ""}
      </div>
    </div>
    <div class="flex items-center gap-3 self-start sm:self-auto shrink-0">
      <span class="font-label-badge text-label-badge ${badgeColorClass} px-space-md py-space-xs rounded-full uppercase">${escapeHtml(badge)}</span>
      <span class="agenda-chevron material-symbols-outlined text-[20px] text-text-muted group-hover:text-primary-container">expand_more</span>
    </div>
  </div>
  <div class="agenda-drawer">
    <div class="overflow-hidden">
      <div class="pt-4 mt-4 border-t border-surface-border/60 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs font-body-sm">
        <div class="lg:col-span-7 flex flex-col gap-2">
          <span class="font-kicker text-kicker uppercase text-primary-container font-semibold tracking-wider">${kickerText}</span>
          <p class="text-secondary leading-relaxed">${escapeHtml(item.overview || "")}</p>
          ${takeawaysHtml ? `<ul class="flex flex-col gap-1 text-text-muted mt-1 font-label-code text-[11px]">${takeawaysHtml}</ul>` : ""}
        </div>
        <div class="lg:col-span-5 flex flex-col justify-between gap-3 bg-surface-container/60 p-3 rounded-lg border border-surface-border/40">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-text-muted font-label-code text-[11px]">
              <span class="uppercase">${hostRoleLabel}</span>
              <span class="text-secondary">${escapeHtml(hostCategory)}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-surface-container-high border border-primary-container/30 flex items-center justify-center font-bold text-primary-container text-xs shrink-0">
                ${escapeHtml(hostInitials)}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-headline-sm text-xs font-bold text-text-primary truncate">${escapeHtml(item.host_name || "Summit Speaker")}</span>
                <span class="text-text-muted text-[11px] truncate">${escapeHtml(item.host_role || "Executive Leader")}</span>
              </div>
            </div>
          </div>
          <div class="pt-2 border-t border-surface-border/40 flex items-center justify-between font-label-code text-[11px]">
            <div class="flex items-center gap-1.5 text-text-muted">
              <span class="material-symbols-outlined text-[15px] text-primary-container">meeting_room</span>
              <span>${escapeHtml(item.room || "Grand Plenary Amphitheatre")}</span>
            </div>
            <button type="button" class="agenda-session-cal-btn text-primary-container hover:underline inline-flex items-center gap-1 text-[11px] font-bold" data-session-title="${escapeHtml(item.title)}" data-session-start="${escapeHtml(item.start_iso || "20261128T090000Z")}" data-session-end="${escapeHtml(item.end_iso || "20261128T100000Z")}" data-session-room="${escapeHtml(item.room || "Tunis, Tunisia")}" data-session-desc="${escapeHtml(item.subtitle || item.title)}">
              <span class="material-symbols-outlined text-[14px]">calendar_add_on</span>
              <span>Add to Cal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

function updateAgendaFilterCounts(items) {
  const total = items.length;
  const talks = items.filter((i) => (i.type || "talks") === "talks").length;
  const net = items.filter((i) => i.type === "networking").length;
  const work = items.filter((i) => i.type === "workshop").length;

  const btnAll = document.querySelector('.agenda-filter-btn[data-filter="all"]');
  const btnTalks = document.querySelector('.agenda-filter-btn[data-filter="talks"]');
  const btnNet = document.querySelector('.agenda-filter-btn[data-filter="networking"]');
  const btnWork = document.querySelector('.agenda-filter-btn[data-filter="workshop"]');

  if (btnAll) btnAll.innerHTML = `All <span class="opacity-75 font-normal ml-0.5">(${total})</span>`;
  if (btnTalks) btnTalks.innerHTML = `Talks <span class="opacity-75 font-normal ml-0.5">(${talks})</span>`;
  if (btnNet) btnNet.innerHTML = `Networking <span class="opacity-75 font-normal ml-0.5">(${net})</span>`;
  if (btnWork) btnWork.innerHTML = `Workshop <span class="opacity-75 font-normal ml-0.5">(${work})</span>`;
}

let agendaFilterBound = false;

function initAgenda() {
  const filterButtons = document.querySelectorAll(".agenda-filter-btn");
  const agendaItems = document.querySelectorAll(".agenda-item");
  const emptyState = document.getElementById("agenda-empty-state");
  const resetBtn = document.getElementById("agenda-reset-filter-btn");

  if (!filterButtons.length || !agendaItems.length) return;

  function setFilter(filterType) {
    let visibleCount = 0;

    agendaItems.forEach((item) => {
      const itemType = item.getAttribute("data-agenda-type");
      const matches = filterType === "all" || itemType === filterType;
      if (matches) {
        item.style.display = "";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    // Update active button state
    filterButtons.forEach((btn) => {
      const isSelected = btn.getAttribute("data-filter") === filterType;
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
      if (isSelected) {
        btn.className =
          "agenda-filter-btn px-4 py-2 rounded-lg font-label-code text-xs uppercase tracking-wider transition-all duration-200 bg-primary-container text-on-primary font-bold shadow-[0_0_12px_rgba(205,241,72,0.3)]";
      } else {
        btn.className =
          "agenda-filter-btn px-4 py-2 rounded-lg font-label-code text-xs uppercase tracking-wider transition-all duration-200 text-text-muted hover:text-text-primary hover:bg-surface-container";
      }
    });

    // Handle empty state
    if (emptyState) {
      if (visibleCount === 0) {
        emptyState.classList.remove("hidden");
        emptyState.classList.add("flex");
      } else {
        emptyState.classList.add("hidden");
        emptyState.classList.remove("flex");
      }
    }
  }

  if (!agendaFilterBound) {
    agendaFilterBound = true;
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter") || "all";
        setFilter(filter);
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        setFilter("all");
      });
    }
  }

  // Handle click / tap expansion (keeps card open on mobile or pinned on click)
  agendaItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      // Don't toggle expansion if user clicked the "Add to Cal" button
      if (e.target.closest(".agenda-session-cal-btn")) return;
      item.classList.toggle("is-expanded");
    });

    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.closest(".agenda-session-cal-btn")) return;
        e.preventDefault();
        item.classList.toggle("is-expanded");
      }
    });
  });

  // Session-specific calendar downloads
  const calButtons = document.querySelectorAll(".agenda-session-cal-btn");
  calButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const title = btn.getAttribute("data-session-title") || "SHIFT Session";
      const start = btn.getAttribute("data-session-start") || "20261128T090000Z";
      const end = btn.getAttribute("data-session-end") || "20261128T100000Z";
      const room = btn.getAttribute("data-session-room") || "Tunis, Tunisia";
      const desc = btn.getAttribute("data-session-desc") || "SHIFT 2026 Executive AI Summit session.";
      downloadSessionIcs(title, desc, start, end, room);
    });
  });
}

async function loadAgenda() {
  let items = null;
  try {
    const res = await fetch("/api/agenda");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        items = json.data;
      }
    }
  } catch (err) {
    console.warn("Could not fetch /api/agenda:", err);
  }

  if (!items) {
    try {
      const local = localStorage.getItem("shift_agenda_items");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed;
        }
      }
    } catch (e) {}
  }

  if (!items) {
    try {
      const res = await fetch("/data/agenda.json");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          items = data;
        }
      }
    } catch (e) {}
  }

  if (items) {
    const publishedItems = items.filter((i) => i.published !== false);
    const container = document.getElementById("agenda-timeline-list");
    if (container && publishedItems.length > 0) {
      container.innerHTML = publishedItems.map(renderAgendaItemHtml).join("\n");
      updateAgendaFilterCounts(publishedItems);
    }
  }

  initAgenda();
}

document.addEventListener("DOMContentLoaded", () => {
  loadSpeakers();
  loadTeam();
  loadPartners();
  loadAgenda();
  initModals();
  initRegisterForm();
  initPartnerForm();
  setupCalendarLinks();
  setupSocialShareKit();
});
