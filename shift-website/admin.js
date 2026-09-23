// admin.js — powers admin.html
// Requires config.js (defines `supabaseClient`) to be loaded first.

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

async function checkAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get("preview") === "true" || window.location.hash === "#preview";
  if (isPreview) {
    showApp({ user: { email: "organizer.preview@shift2026.ai" } });
    return;
  }

  if (!supabaseClient) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    return;
  }
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      showApp(session);
    } else {
      loginView.classList.remove("hidden");
      appView.classList.add("hidden");
    }
  } catch (err) {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
  }
}

function showApp(session) {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  document.getElementById("admin-email").textContent = session.user.email;
  document.getElementById("admin-email").classList.remove("hidden");
  loadAll();
}

const previewBtn = document.getElementById("preview-admin-btn");
if (previewBtn) {
  previewBtn.addEventListener("click", () => {
    showApp({ user: { email: "organizer.preview@shift2026.ai" } });
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  if (!supabaseClient) {
    loginError.textContent = "Supabase client not initialized.";
    loginError.classList.remove("hidden");
    return;
  }
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
    return;
  }
  showApp(data.session);
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  location.reload();
});

// ---------------------------------------------------------------------------
// TABS
// ---------------------------------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function uploadImage(bucket, file) {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// GENERIC ENTITY CONFIG (speakers / team_members / partners)
// ---------------------------------------------------------------------------
const ENTITIES = {
  speakers: {
    table: "speakers",
    bucket: "speaker-photos",
    imageField: "photo_url",
    label: "speaker",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "role", label: "Role / Title", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "badge", label: "Badge (e.g. Keynote Address)", type: "text" },
      { key: "session_title", label: "Session Title", type: "text" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "twitter_url", label: "X / Twitter URL", type: "text" },
      { key: "sort_order", label: "Display Order (lower = first)", type: "number" },
      { key: "published", label: "Published (visible on site)", type: "checkbox" },
    ],
  },
  team_members: {
    table: "team_members",
    bucket: "team-photos",
    imageField: "photo_url",
    label: "team member",
    fields: [
      { key: "name", label: "Full Name", type: "text", required: true },
      { key: "role", label: "Role (e.g. OC President)", type: "text" },
      { key: "linkedin_url", label: "LinkedIn URL", type: "text" },
      { key: "sort_order", label: "Display Order (lower = first)", type: "number" },
      { key: "published", label: "Published (visible on site)", type: "checkbox" },
    ],
  },
  partners: {
    table: "partners",
    bucket: "partner-logos",
    imageField: "logo_url",
    label: "partner",
    fields: [
      { key: "name", label: "Company Name", type: "text", required: true },
      { key: "website_url", label: "Website URL", type: "text" },
      { key: "tier", label: "Tier (e.g. gold / silver)", type: "text" },
      { key: "sort_order", label: "Display Order (lower = first)", type: "number" },
      { key: "published", label: "Published (visible on site)", type: "checkbox" },
    ],
  },
};

let editingId = { speakers: null, team_members: null, partners: null };

function fieldHtml(entityKey, field, value) {
  const id = `field-${entityKey}-${field.key}`;
  const v = value == null ? "" : value;
  if (field.type === "textarea") {
    return `<div class="flex flex-col gap-1"><label class="field-label">${field.label}</label><textarea id="${id}" rows="3">${escapeHtml(v)}</textarea></div>`;
  }
  if (field.type === "checkbox") {
    return `<div class="flex items-center gap-2 pt-2"><input type="checkbox" id="${id}" ${v ? "checked" : ""} class="w-4 h-4"/><label class="field-label" for="${id}">${field.label}</label></div>`;
  }
  if (field.type === "number") {
    return `<div class="flex flex-col gap-1"><label class="field-label">${field.label}</label><input type="number" id="${id}" value="${escapeHtml(v || 0)}"/></div>`;
  }
  return `<div class="flex flex-col gap-1"><label class="field-label">${field.label}</label><input type="text" id="${id}" value="${escapeHtml(v)}" ${field.required ? "required" : ""}/></div>`;
}

function openForm(entityKey, row) {
  const cfg = ENTITIES[entityKey];
  const container = document.getElementById(`form-${entityKey}`);
  editingId[entityKey] = row ? row.id : null;

  const fieldsHtml = cfg.fields.map((f) => fieldHtml(entityKey, f, row ? row[f.key] : f.type === "checkbox" ? true : "")).join("");

  container.innerHTML = `
    <h3 class="font-headline-sm text-headline-sm text-text-primary font-bold mb-4">${row ? "Edit" : "Add"} ${cfg.label}</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">${fieldsHtml}</div>
    <div class="flex flex-col gap-1 mb-4">
      <label class="field-label">Photo / Logo</label>
      <input type="file" accept="image/*" id="file-${entityKey}"/>
      ${row && row[cfg.imageField] ? `<img src="${escapeHtml(row[cfg.imageField])}" class="w-24 h-24 object-cover rounded-lg mt-2"/>` : ""}
    </div>
    <div class="flex gap-3">
      <button id="save-${entityKey}" class="px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-code text-label-code uppercase font-bold">Save</button>
      <button id="cancel-${entityKey}" class="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-code text-label-code uppercase">Cancel</button>
      <p id="status-${entityKey}" class="font-body-sm text-body-sm hidden"></p>
    </div>
  `;
  container.classList.remove("hidden");
  container.scrollIntoView({ behavior: "smooth", block: "center" });

  document.getElementById(`cancel-${entityKey}`).addEventListener("click", () => {
    container.classList.add("hidden");
  });

  document.getElementById(`save-${entityKey}`).addEventListener("click", async () => {
    await saveEntity(entityKey);
  });
}

async function saveEntity(entityKey) {
  const cfg = ENTITIES[entityKey];
  const statusEl = document.getElementById(`status-${entityKey}`);
  statusEl.classList.remove("hidden", "text-error");
  statusEl.textContent = "Saving...";

  const payload = {};
  for (const f of cfg.fields) {
    const el = document.getElementById(`field-${entityKey}-${f.key}`);
    if (f.type === "checkbox") payload[f.key] = el.checked;
    else if (f.type === "number") payload[f.key] = Number(el.value) || 0;
    else payload[f.key] = el.value.trim();
  }

  if (cfg.fields.find((f) => f.required) && !payload.name) {
    statusEl.textContent = "Name is required.";
    statusEl.classList.add("text-error");
    return;
  }

  try {
    const fileInput = document.getElementById(`file-${entityKey}`);
    if (fileInput && fileInput.files[0]) {
      const url = await uploadImage(cfg.bucket, fileInput.files[0]);
      payload[cfg.imageField] = url;
    }

    let error;
    if (editingId[entityKey]) {
      ({ error } = await supabaseClient.from(cfg.table).update(payload).eq("id", editingId[entityKey]));
    } else {
      ({ error } = await supabaseClient.from(cfg.table).insert(payload));
    }
    if (error) throw error;

    statusEl.textContent = "Saved!";
    document.getElementById(`form-${entityKey}`).classList.add("hidden");
    loadEntity(entityKey);
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    statusEl.classList.add("text-error");
  }
}

async function loadEntity(entityKey) {
  const cfg = ENTITIES[entityKey];
  const list = document.getElementById(`list-${entityKey}`);
  const { data, error } = await supabaseClient.from(cfg.table).select("*").order("sort_order", { ascending: true });
  if (error) {
    list.innerHTML = `<p class="text-error text-body-sm">Error loading: ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data || data.length === 0) {
    list.innerHTML = `<p class="text-text-muted text-body-sm">No ${cfg.label}s yet. Click "+ Add" to create one.</p>`;
    return;
  }
  list.innerHTML = data
    .map(
      (row) => `
    <div class="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-2">
      <div class="w-full h-32 rounded-lg bg-surface-container-high overflow-hidden flex items-center justify-center">
        ${row[cfg.imageField] ? `<img src="${escapeHtml(row[cfg.imageField])}" class="w-full h-full object-cover"/>` : `<span class="material-symbols-outlined text-text-muted text-[32px]">image</span>`}
      </div>
      <div class="flex items-center justify-between">
        <h4 class="font-headline-sm text-headline-sm text-text-primary font-bold">${escapeHtml(row.name)}</h4>
        <span class="text-xs px-2 py-0.5 rounded-full ${row.published ? "bg-primary-container/20 text-primary-container" : "bg-surface-container text-text-muted"}">${row.published ? "Published" : "Draft"}</span>
      </div>
      <p class="text-body-sm text-text-muted">${escapeHtml(row.role || row.website_url || "")}</p>
      <div class="flex gap-2 mt-2">
        <button class="edit-btn flex-1 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-body-sm" data-entity="${entityKey}" data-id="${row.id}">Edit</button>
        <button class="delete-btn flex-1 px-3 py-1.5 rounded-full bg-error-container/20 text-error hover:bg-error-container/30 text-body-sm" data-entity="${entityKey}" data-id="${row.id}">Delete</button>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll(".edit-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      const row = data.find((r) => r.id === btn.dataset.id);
      openForm(entityKey, row);
    })
  );
  list.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this entry? This cannot be undone.")) return;
      await supabaseClient.from(cfg.table).delete().eq("id", btn.dataset.id);
      loadEntity(entityKey);
    })
  );
}

document.querySelectorAll(".add-btn").forEach((btn) => {
  btn.addEventListener("click", () => openForm(btn.dataset.entity, null));
});

// ---------------------------------------------------------------------------
// APPLICANTS & ORGANIZER TOOLS
// ---------------------------------------------------------------------------
let applicantsCache = [];
let partnerRequestsCache = [];

function updateMetricsDashboard() {
  const totalApplicants = applicantsCache.length;

  // 1. Delegate Influx Metric (Endless Capacity)
  const regCountEl = document.getElementById("metric-registered-count");
  if (regCountEl) regCountEl.textContent = totalApplicants;

  // 2. Attendance Metric
  const attendedCount = applicantsCache.filter((a) => a.status === "attended").length;
  const attendedPct = totalApplicants > 0 ? Math.round((attendedCount / totalApplicants) * 100) : 0;

  const attendedCountEl = document.getElementById("metric-attended-count");
  const attendedPctEl = document.getElementById("metric-attended-pct");
  if (attendedCountEl) attendedCountEl.textContent = attendedCount;
  if (attendedPctEl) attendedPctEl.textContent = `(${attendedPct}% of registered)`;

  // 3. Top Institutions
  const uniMap = {};
  applicantsCache.forEach((a) => {
    const uni = (a.university || a.faculty || "").trim();
    if (uni) {
      uniMap[uni] = (uniMap[uni] || 0) + 1;
    }
  });

  const sortedUnis = Object.entries(uniMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const topInstEl = document.getElementById("metric-top-institutions");
  if (topInstEl) {
    if (sortedUnis.length === 0) {
      topInstEl.innerHTML = `<span class="text-xs text-text-muted">No institution data yet</span>`;
    } else {
      topInstEl.innerHTML = sortedUnis
        .map(
          ([name, count]) =>
            `<span class="px-2 py-0.5 rounded bg-surface-container text-[11px] font-label-code text-text-primary border border-surface-border truncate max-w-[170px]" title="${escapeHtml(name)}">${escapeHtml(name)} <strong class="text-primary-container">(${count})</strong></span>`
        )
        .join("");
    }
  }

  // 4. Partner Pipeline Metric
  const totalPartners = partnerRequestsCache.length;
  const newPartners = partnerRequestsCache.filter((p) => !p.status || p.status === "new").length;
  const contactedPartners = partnerRequestsCache.filter((p) => p.status === "contacted").length;
  const approvedPartners = partnerRequestsCache.filter((p) => p.status === "approved").length;

  const partnerTotalEl = document.getElementById("metric-partner-total");
  const newBadgeEl = document.getElementById("metric-new-partners-badge");
  const breakdownEl = document.getElementById("metric-partner-breakdown");

  if (partnerTotalEl) partnerTotalEl.textContent = totalPartners;
  if (newBadgeEl) newBadgeEl.textContent = `${newPartners} New`;
  if (breakdownEl) breakdownEl.textContent = `${contactedPartners} contacted · ${approvedPartners} approved`;

  // 5. Render Delegate Influx Graphs (Endless Capacity)
  renderDelegateGraphs();
}

function computeRegistrationTimeline() {
  if (!applicantsCache || applicantsCache.length === 0) {
    return [
      { dateStr: "Launch", dateLabel: "Launch", daily: 0, cumulative: 0 },
      { dateStr: "Today", dateLabel: "Today", daily: 0, cumulative: 0 },
    ];
  }

  // Group by chronological day
  const dateMap = {};
  applicantsCache.forEach((applicant) => {
    let dateObj;
    try {
      dateObj = applicant.created_at ? new Date(applicant.created_at) : new Date();
      if (isNaN(dateObj.getTime())) dateObj = new Date();
    } catch {
      dateObj = new Date();
    }
    const isoDay = dateObj.toISOString().slice(0, 10);
    dateMap[isoDay] = (dateMap[isoDay] || 0) + 1;
  });

  const sortedDays = Object.keys(dateMap).sort();
  let runningTotal = 0;
  const points = [];

  // If first day is not baseline, add day-before baseline for a smooth graph start
  if (sortedDays.length > 0) {
    const firstDate = new Date(sortedDays[0]);
    firstDate.setDate(firstDate.getDate() - 1);
    const baselineLabel = firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    points.push({
      dateStr: firstDate.toISOString().slice(0, 10),
      dateLabel: baselineLabel,
      daily: 0,
      cumulative: 0,
    });
  }

  sortedDays.forEach((isoDay) => {
    const dailyCount = dateMap[isoDay];
    runningTotal += dailyCount;
    const d = new Date(isoDay);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    points.push({
      dateStr: isoDay,
      dateLabel,
      daily: dailyCount,
      cumulative: runningTotal,
    });
  });

  return points;
}

function renderDelegateGraphs() {
  const points = computeRegistrationTimeline();
  const total = applicantsCache.length;
  const attendedCount = applicantsCache.filter((a) => a.status === "attended").length;

  // Update Summary Strip Numbers
  const statTotal = document.getElementById("graph-stat-total");
  const statAttended = document.getElementById("graph-stat-attended");
  const statPeak = document.getElementById("graph-stat-peak");

  const peakDaily = Math.max(...points.map((p) => p.daily), 1);
  if (statTotal) statTotal.textContent = `${total} Delegates`;
  if (statAttended) statAttended.textContent = `${attendedCount} (${total > 0 ? Math.round((attendedCount / total) * 100) : 0}%)`;
  if (statPeak) statPeak.textContent = `${peakDaily} signups / day`;

  // 1. Render Mini Sparkline (Metric 1)
  renderSparkline(points);

  // 2. Render Full Trajectory Graph
  renderFullGraph(points);
}

function renderSparkline(points) {
  const svg = document.getElementById("metric-sparkline-svg");
  if (!svg) return;

  const startEl = document.getElementById("metric-sparkline-start");
  const endEl = document.getElementById("metric-sparkline-end");

  if (startEl && points.length > 0) startEl.textContent = points[0].dateLabel;
  if (endEl && points.length > 0) endEl.textContent = points[points.length - 1].dateLabel;

  const w = 200;
  const h = 45;
  const padX = 6;
  const padY = 5;
  const maxVal = Math.max(...points.map((p) => p.cumulative), 1);
  const n = points.length;

  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(1, n - 1)) * (w - 2 * padX);
    const y = h - padY - (p.cumulative / maxVal) * (h - 2 * padY);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  const lineD = coords.reduce((acc, c, i) => (i === 0 ? `M ${c.x},${c.y}` : `${acc} L ${c.x},${c.y}`), "");
  const areaD = `${lineD} L ${coords[coords.length - 1].x},${h} L ${coords[0].x},${h} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="sparkline-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#CDF148" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#CDF148" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    <path d="${areaD}" fill="url(#sparkline-grad)" />
    <path d="${lineD}" fill="none" stroke="#CDF148" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="3" fill="#CDF148" />
  `;
}

function renderFullGraph(points) {
  const svg = document.getElementById("full-delegate-graph-svg");
  const labelsContainer = document.getElementById("full-graph-x-labels");
  const tooltip = document.getElementById("growth-graph-tooltip");
  if (!svg) return;

  const w = 800;
  const h = 180;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 30;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  const maxVal = Math.max(...points.map((p) => p.cumulative), 4);
  const maxDaily = Math.max(...points.map((p) => p.daily), 1);
  const n = points.length;

  const coords = points.map((p, i) => {
    const x = padLeft + (i / Math.max(1, n - 1)) * innerW;
    const y = padTop + (1 - p.cumulative / maxVal) * innerH;
    return { ...p, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });

  // Calculate curve and area
  const lineD = coords.reduce((acc, c, i) => (i === 0 ? `M ${c.x},${c.y}` : `${acc} L ${c.x},${c.y}`), "");
  const areaD = `${lineD} L ${coords[coords.length - 1].x},${h - padBottom} L ${coords[0].x},${h - padBottom} Z`;

  // Grid lines (3 horizontal levels)
  const gridLevels = [
    { label: `${maxVal}`, y: padTop },
    { label: `${Math.round(maxVal / 2)}`, y: padTop + innerH / 2 },
    { label: "0", y: h - padBottom },
  ];

  let gridSvg = gridLevels
    .map(
      (gl) => `
      <line x1="${padLeft}" y1="${gl.y}" x2="${w - padRight}" y2="${gl.y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
      <text x="${padLeft - 8}" y="${gl.y + 4}" fill="#71717a" font-size="10" font-family="Space Mono, monospace" text-anchor="end">${gl.label}</text>
    `
    )
    .join("");

  // Daily volume bars
  const barWidth = Math.max(8, Math.min(24, Math.floor(innerW / (n * 2.2))));
  const barsSvg = coords
    .filter((c) => c.daily > 0)
    .map((c) => {
      const barH = (c.daily / maxDaily) * (innerH * 0.45);
      const barY = h - padBottom - barH;
      const barX = c.x - barWidth / 2;
      return `
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="2" fill="rgba(205,241,72,0.2)" stroke="rgba(205,241,72,0.4)" stroke-width="1" class="transition-all hover:fill-primary-container/40" />
      `;
    })
    .join("");

  // Data point markers
  const pointsSvg = coords
    .map(
      (c, i) => `
      <g class="graph-point-marker cursor-pointer" data-idx="${i}">
        <circle cx="${c.x}" cy="${c.y}" r="8" fill="transparent" />
        <circle cx="${c.x}" cy="${c.y}" r="4" fill="#0c0d0e" stroke="#CDF148" stroke-width="2" class="transition-transform duration-200 hover:scale-150" />
      </g>
    `
    )
    .join("");

  svg.innerHTML = `
    <defs>
      <linearGradient id="full-graph-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#CDF148" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#CDF148" stop-opacity="0.0" />
      </linearGradient>
      <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#CDF148" flood-opacity="0.5" />
      </filter>
    </defs>
    ${gridSvg}
    ${barsSvg}
    <path d="${areaD}" fill="url(#full-graph-gradient)" />
    <path d="${lineD}" fill="none" stroke="#CDF148" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#neon-glow)" />
    ${pointsSvg}
  `;

  // Populate X-axis labels
  if (labelsContainer) {
    const step = Math.max(1, Math.floor(n / 6));
    const labelPoints = coords.filter((_, idx) => idx === 0 || idx === n - 1 || idx % step === 0);
    labelsContainer.innerHTML = labelPoints
      .map(
        (c) => `<span class="truncate max-w-[80px] text-center" title="${c.dateStr}">${escapeHtml(c.dateLabel)}</span>`
      )
      .join("");
  }

  // Attach tooltips
  if (tooltip) {
    svg.querySelectorAll(".graph-point-marker").forEach((marker) => {
      const idx = Number(marker.dataset.idx);
      const pt = coords[idx];
      if (!pt) return;

      marker.addEventListener("mouseenter", (e) => {
        const rect = svg.getBoundingClientRect();
        const ptXPercent = (pt.x / w) * 100;
        const ptYPercent = (pt.y / h) * 100;

        tooltip.innerHTML = `
          <div class="flex items-center gap-1.5 font-bold text-primary-container">
            <span>●</span> ${escapeHtml(pt.dateLabel)}
          </div>
          <div class="text-text-primary text-[11px] mt-0.5">
            <strong>${pt.cumulative}</strong> cumulative delegates
          </div>
          ${pt.daily > 0 ? `<div class="text-text-muted text-[10px]">+${pt.daily} registered on this day</div>` : ""}
        `;
        tooltip.style.left = `calc(${ptXPercent}% - 60px)`;
        tooltip.style.top = `calc(${ptYPercent}% - 55px)`;
        tooltip.style.opacity = "1";
      });

      marker.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
      });
    });
  }
}

function updateUniversityDropdownOptions() {
  const select = document.getElementById("applicant-uni-filter");
  if (!select) return;
  const currentVal = select.value;

  const universities = Array.from(
    new Set(applicantsCache.map((a) => (a.university || "").trim()).filter(Boolean))
  ).sort();

  select.innerHTML =
    `<option value="all">All Institutions (${applicantsCache.length})</option>` +
    universities
      .map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`)
      .join("");

  if (universities.includes(currentVal)) {
    select.value = currentVal;
  }
}

function renderApplicantsTable() {
  const tbody = document.getElementById("applicants-table-body");
  if (!tbody) return;

  const searchVal = (document.getElementById("applicant-search-input")?.value || "").toLowerCase().trim();
  const statusFilter = document.getElementById("applicant-status-filter")?.value || "all";
  const uniFilter = document.getElementById("applicant-uni-filter")?.value || "all";

  const filtered = applicantsCache.filter((a) => {
    // Search filter
    if (searchVal) {
      const matchSearch =
        (a.full_name || "").toLowerCase().includes(searchVal) ||
        (a.email || "").toLowerCase().includes(searchVal) ||
        (a.phone || "").toLowerCase().includes(searchVal) ||
        (a.university || "").toLowerCase().includes(searchVal) ||
        (a.faculty || "").toLowerCase().includes(searchVal);
      if (!matchSearch) return false;
    }

    // Status filter
    const status = a.status || "registered";
    if (statusFilter !== "all" && status !== statusFilter) {
      return false;
    }

    // University filter
    if (uniFilter !== "all" && (a.university || "").trim() !== uniFilter) {
      return false;
    }

    return true;
  });

  const countEl = document.getElementById("applicants-count");
  if (countEl) {
    countEl.textContent = `(${filtered.length} of ${applicantsCache.length})`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td class="p-4 text-text-muted text-center" colspan="9">No applicants found matching filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((a) => {
      const currentStatus = a.status || "registered";
      const statusBadgeStyles = {
        registered: "border-sky-500/40 text-sky-400 bg-sky-950/40",
        attended: "border-primary-container text-primary-container bg-primary-container/15 font-bold",
        vip: "border-amber-500/40 text-amber-400 bg-amber-950/40",
        cancelled: "border-rose-500/40 text-rose-400 bg-rose-950/40",
      };
      const badgeClass = statusBadgeStyles[currentStatus] || statusBadgeStyles.registered;

      return `
    <tr class="border-b border-surface-border/50 hover:bg-surface-card-hover/40 transition-colors">
      <td class="p-3 font-medium text-text-primary">${escapeHtml(a.full_name)}</td>
      <td class="p-3 font-label-code text-xs text-secondary">${escapeHtml(a.email)}</td>
      <td class="p-3 font-label-code text-xs text-text-muted">${escapeHtml(a.phone)}</td>
      <td class="p-3 text-xs">${escapeHtml(a.university) || "—"}</td>
      <td class="p-3 text-xs text-text-muted">${escapeHtml(a.faculty) || "—"}</td>
      <td class="p-3 text-text-muted font-label-code text-xs">${new Date(a.created_at).toLocaleDateString()}</td>
      <td class="p-3">
        <select class="applicant-status-select text-xs font-label-code rounded-lg px-2.5 py-1 border transition-all focus:outline-none ${badgeClass}" data-id="${a.id}">
          <option value="registered" ${currentStatus === "registered" ? "selected" : ""}>Registered</option>
          <option value="attended" ${currentStatus === "attended" ? "selected" : ""}>Attended (Checked In)</option>
          <option value="vip" ${currentStatus === "vip" ? "selected" : ""}>VIP Delegate</option>
          <option value="cancelled" ${currentStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td class="p-3 text-center text-xs">${a.confirmation_sent ? '<span class="text-primary-container font-bold">✓</span>' : '<span class="text-text-muted">—</span>'}</td>
      <td class="p-3 text-center text-xs">${a.reminder_sent_at ? '<span class="text-primary-container font-bold">✓</span>' : '<span class="text-text-muted">—</span>'}</td>
    </tr>`;
    })
    .join("");

  // Attach change listener to status selectors
  tbody.querySelectorAll(".applicant-status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const applicantId = sel.dataset.id;
      const newStatus = sel.value;

      // Update in memory
      const target = applicantsCache.find((x) => x.id === applicantId);
      if (target) {
        target.status = newStatus;
      }

      updateMetricsDashboard();
      renderApplicantsTable();

      if (supabaseClient) {
        try {
          await supabaseClient
            .from("applicants")
            .update({ status: newStatus })
            .eq("id", applicantId);
        } catch (err) {
          console.warn("Failed to persist applicant status:", err);
        }
      }
    });
  });
}

function initApplicantFilters() {
  const searchInput = document.getElementById("applicant-search-input");
  const statusFilter = document.getElementById("applicant-status-filter");
  const uniFilter = document.getElementById("applicant-uni-filter");
  const clearBtn = document.getElementById("clear-applicant-filters");

  if (searchInput) {
    searchInput.addEventListener("input", () => renderApplicantsTable());
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", () => renderApplicantsTable());
  }
  if (uniFilter) {
    uniFilter.addEventListener("change", () => renderApplicantsTable());
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "all";
      if (uniFilter) uniFilter.value = "all";
      renderApplicantsTable();
    });
  }
}

const SAMPLE_DELEGATES = [
  { id: "del-01", full_name: "Yassine Ben Amor", email: "yassine.ba@insat.ucar.tn", phone: "+216 98 421 803", university: "INSAT", faculty: "Computer Science & AI", status: "attended", confirmation_sent: true, reminder_sent_at: "2026-11-20T10:00:00Z", created_at: "2026-11-12T14:32:00Z" },
  { id: "del-02", full_name: "Sarra Mansouri", email: "sarra.mansouri@tbs.rnu.tn", phone: "+216 22 519 330", university: "Tunis Business School", faculty: "Business Analytics", status: "registered", confirmation_sent: true, reminder_sent_at: null, created_at: "2026-11-13T09:15:00Z" },
  { id: "del-03", full_name: "Dr. Mehdi Karray", email: "m.karray@dauphine.tn", phone: "+216 55 901 244", university: "Paris-Dauphine Tunis", faculty: "Executive Finance & AI", status: "vip", confirmation_sent: true, reminder_sent_at: "2026-11-20T10:00:00Z", created_at: "2026-11-14T11:40:00Z" },
  { id: "del-04", full_name: "Ines Riahi", email: "ines.riahi@enit.utm.tn", phone: "+216 24 118 792", university: "ENIT", faculty: "Telecommunications", status: "attended", confirmation_sent: true, reminder_sent_at: "2026-11-20T10:00:00Z", created_at: "2026-11-15T16:20:00Z" },
  { id: "del-05", full_name: "Karim Chaabane", email: "k.chaabane@esprit.tn", phone: "+216 97 340 551", university: "ESPRIT", faculty: "Software Engineering", status: "registered", confirmation_sent: true, reminder_sent_at: null, created_at: "2026-11-16T08:50:00Z" },
  { id: "del-06", full_name: "Nourhene Trabelsi", email: "nourhene.tr@msb.tn", phone: "+216 50 622 189", university: "MSB (Mediterranean School of Business)", faculty: "Strategy & Tech Leadership", status: "attended", confirmation_sent: true, reminder_sent_at: "2026-11-20T10:00:00Z", created_at: "2026-11-17T13:10:00Z" },
  { id: "del-07", full_name: "Amine Bouazizi", email: "amine.b@biat.com.tn", phone: "+216 99 715 004", university: "BIAT Labs", faculty: "Digital Banking", status: "vip", confirmation_sent: true, reminder_sent_at: "2026-11-20T10:00:00Z", created_at: "2026-11-18T10:05:00Z" },
  { id: "del-08", full_name: "Salma Haddad", email: "salma.haddad@insat.ucar.tn", phone: "+216 21 884 920", university: "INSAT", faculty: "Data Science", status: "registered", confirmation_sent: true, reminder_sent_at: null, created_at: "2026-11-19T17:45:00Z" }
];

const SAMPLE_PARTNERS = [
  { id: "part-01", company_name: "Telnet Holding", contact_name: "Mohamed Frikha", email: "partnerships@groupe-telnet.com", phone: "+216 71 860 233", message: "Interested in the Gold Tier sponsorship and participating in the AI Infrastructure panel.", status: "approved", created_at: "2026-11-10T11:00:00Z" },
  { id: "part-02", company_name: "InstaDeep Labs", contact_name: "Leila Baccouche", email: "l.baccouche@instadeep.com", phone: "+216 71 900 120", message: "Looking forward to hosting an executive technical workshop on decision-making models.", status: "contacted", created_at: "2026-11-14T15:20:00Z" },
  { id: "part-03", company_name: "Vermeg Tech", contact_name: "Tarek Jaziri", email: "tjaziri@vermeg.com", phone: "+216 70 020 500", message: "Interested in talent acquisition booth and connecting with AI engineering graduates.", status: "new", created_at: "2026-11-18T09:40:00Z" }
];

async function loadApplicants() {
  let records = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("applicants").select("*").order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        records = data;
      }
    } catch (e) {
      console.warn("Applicants fetch:", e);
    }
  }

  // If no live database rows exist yet, populate with realistic organizer samples
  if (records.length === 0) {
    records = [...SAMPLE_DELEGATES];
  }

  applicantsCache = records;
  updateUniversityDropdownOptions();
  updateMetricsDashboard();
  renderApplicantsTable();
}

document.getElementById("send-reminders-btn").addEventListener("click", async () => {
  if (!confirm(`Send a reminder email to all ${applicantsCache.length} registered applicants?`)) return;
  const statusEl = document.getElementById("reminders-status");
  statusEl.classList.remove("hidden");
  statusEl.textContent = "Sending reminders... this can take a minute for a large list.";
  const { data, error } = await supabaseClient.functions.invoke("send-reminders", { body: {} });
  if (error) {
    statusEl.textContent = "Error sending reminders: " + error.message;
    return;
  }
  statusEl.textContent = `Done — sent ${data.sent}/${data.total} reminder emails${data.failed ? `, ${data.failed} failed` : ""}.`;
  loadApplicants();
});

// 1-CLICK CSV EXPORT FOR CHECK-IN (APPLICANTS)
document.getElementById("export-applicants-btn").addEventListener("click", () => {
  const rows = [
    [
      "Full Name",
      "Email",
      "Phone",
      "University",
      "Faculty",
      "Status / Tag",
      "Check-in Verified",
      "Registered At",
      "Confirmation Sent",
      "Reminder Sent",
    ],
  ];

  applicantsCache.forEach((a) => {
    const isAttended = a.status === "attended" ? "YES" : "NO";
    rows.push([
      a.full_name,
      a.email,
      a.phone,
      a.university,
      a.faculty,
      a.status || "registered",
      isAttended,
      a.created_at,
      a.confirmation_sent ? "YES" : "NO",
      a.reminder_sent_at || "NO",
    ]);
  });

  const csv = rows
    .map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `shift-2026-delegates-checkin-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ---------------------------------------------------------------------------
// PARTNER APPLICATIONS & 1-CLICK CSV EXPORT
// ---------------------------------------------------------------------------
async function loadPartnerRequests() {
  const tbody = document.getElementById("partner-requests-table-body");
  let records = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("partner_applications").select("*").order("created_at", { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        records = data;
      }
    } catch (e) {
      console.warn("Partner requests fetch:", e);
    }
  }

  if (records.length === 0) {
    records = [...SAMPLE_PARTNERS];
  }

  partnerRequestsCache = records;
  document.getElementById("partner-requests-count").textContent = `(${partnerRequestsCache.length})`;
  updateMetricsDashboard();

  if (partnerRequestsCache.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td class="p-3 text-text-muted" colspan="7">No partner applications yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = partnerRequestsCache
    .map(
      (p) => `
    <tr class="border-b border-surface-border/50 align-top hover:bg-surface-card-hover/40 transition-colors">
      <td class="p-3 font-semibold text-text-primary">${escapeHtml(p.company_name)}</td>
      <td class="p-3 text-xs">${escapeHtml(p.contact_name)}</td>
      <td class="p-3 font-label-code text-xs text-secondary">${escapeHtml(p.email)}</td>
      <td class="p-3 font-label-code text-xs text-text-muted">${escapeHtml(p.phone)}</td>
      <td class="p-3 max-w-xs text-xs text-text-muted leading-relaxed">${escapeHtml(p.message)}</td>
      <td class="p-3">
        <select class="status-select font-label-code text-xs rounded-lg px-2 py-1 bg-surface-container border border-surface-border" data-id="${p.id}">
          ${["new", "contacted", "approved", "declined"]
            .map((s) => `<option value="${s}" ${p.status === s ? "selected" : ""}>${s}</option>`)
            .join("")}
        </select>
      </td>
      <td class="p-3 text-text-muted font-label-code text-xs">${new Date(p.created_at).toLocaleDateString()}</td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll(".status-select").forEach((sel) =>
    sel.addEventListener("change", async () => {
      const newStatus = sel.value;
      const target = partnerRequestsCache.find((x) => x.id === sel.dataset.id);
      if (target) target.status = newStatus;
      updateMetricsDashboard();

      await supabaseClient.from("partner_applications").update({ status: newStatus }).eq("id", sel.dataset.id);
    })
  );
}

// 1-CLICK CSV EXPORT FOR PARTNER APPLICATIONS
const exportPartnersBtn = document.getElementById("export-partners-btn");
if (exportPartnersBtn) {
  exportPartnersBtn.addEventListener("click", () => {
    const rows = [
      ["Company Name", "Contact Person", "Email", "Phone", "Status", "Message", "Application Date"],
    ];
    partnerRequestsCache.forEach((p) => {
      rows.push([
        p.company_name,
        p.contact_name,
        p.email,
        p.phone,
        p.status || "new",
        p.message,
        p.created_at,
      ]);
    });

    const csv = rows
      .map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `shift-2026-partner-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// ---------------------------------------------------------------------------
// AGENDA MANAGEMENT
// ---------------------------------------------------------------------------
let adminAgendaCache = [];
let adminAgendaFilter = "all";
let adminAgendaSearchQuery = "";

async function loadAgendaAdmin() {
  const listEl = document.getElementById("list-agenda");
  if (!listEl) return;

  listEl.innerHTML = `<div class="p-6 text-center text-text-muted font-label-code text-xs">Loading summit agenda...</div>`;

  try {
    const res = await fetch("/api/agenda");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        adminAgendaCache = json.data;
      }
    }
  } catch (err) {
    console.warn("Could not load from /api/agenda:", err);
  }

  // Fallback to localStorage if API failed or returned empty
  if (!adminAgendaCache.length) {
    try {
      const stored = localStorage.getItem("shift_agenda_items");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          adminAgendaCache = parsed;
        }
      }
    } catch (e) {}
  }

  // Fallback to static data file
  if (!adminAgendaCache.length) {
    try {
      const res = await fetch("/data/agenda.json");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) adminAgendaCache = data;
      }
    } catch (e) {}
  }

  renderAgendaAdminList();
}

function renderAgendaAdminList() {
  const listEl = document.getElementById("list-agenda");
  const countBadge = document.getElementById("agenda-count-badge");
  if (!listEl) return;

  if (countBadge) {
    countBadge.textContent = `${adminAgendaCache.length} Session${adminAgendaCache.length === 1 ? "" : "s"}`;
  }

  // Filter and search
  let filtered = adminAgendaCache.slice();
  if (adminAgendaFilter !== "all") {
    filtered = filtered.filter((item) => (item.type || "talks") === adminAgendaFilter);
  }
  if (adminAgendaSearchQuery) {
    const q = adminAgendaSearchQuery.toLowerCase();
    filtered = filtered.filter((item) =>
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.host_name && item.host_name.toLowerCase().includes(q)) ||
      (item.room && item.room.toLowerCase().includes(q)) ||
      (item.time && item.time.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="bg-surface-card border border-surface-border rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-text-muted text-[36px]">event_busy</span>
        <p class="font-headline-sm text-sm font-bold text-text-primary">No sessions match your search or filter</p>
        <p class="font-body-sm text-xs text-text-muted">Try choosing another category, clearing the search box, or click "+ Add Session".</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((item, index) => {
      const type = item.type || "talks";
      const typeColor =
        type === "workshop"
          ? "bg-glow-lime text-primary-container"
          : type === "networking"
          ? "bg-surface-container-high text-on-surface-variant"
          : "bg-surface-container-high text-secondary-fixed-dim";

      return `
      <div class="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-surface-border-active transition-all" data-id="${item.id}">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <div class="flex flex-col items-center justify-center p-2 rounded-lg bg-surface-container text-text-muted shrink-0 w-24 text-center">
            <span class="font-label-code text-xs text-primary-container font-bold">${escapeHtml(item.time || "TBD")}</span>
            <span class="text-[10px] font-label-badge uppercase ${item.published !== false ? "text-primary-container" : "text-text-muted"}">${item.published !== false ? "Live" : "Draft"}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-headline-sm text-sm sm:text-base font-bold text-text-primary">${escapeHtml(item.title)}</h4>
              <span class="font-label-badge text-[10px] px-2 py-0.5 rounded-full uppercase ${typeColor}">${escapeHtml(type)}</span>
              ${item.badge ? `<span class="font-label-code text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-secondary">${escapeHtml(item.badge)}</span>` : ""}
            </div>
            ${item.subtitle ? `<p class="font-body-sm text-xs text-text-muted truncate mt-0.5">${escapeHtml(item.subtitle)}</p>` : ""}
            <div class="flex items-center gap-3 text-[11px] font-label-code text-secondary mt-1 flex-wrap">
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-primary-container">person</span>${escapeHtml(item.host_name || "No speaker specified")}</span>
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-primary-container">meeting_room</span>${escapeHtml(item.room || "Grand Plenary Amphitheatre")}</span>
              <span class="text-text-muted text-[10px]">Order: ${item.sort_order ?? index + 1}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 self-end md:self-center">
          <button type="button" class="agenda-move-up-btn p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-muted hover:text-white transition-colors" data-id="${item.id}" title="Move earlier in day">
            <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
          <button type="button" class="agenda-move-down-btn p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-muted hover:text-white transition-colors" data-id="${item.id}" title="Move later in day">
            <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
          </button>
          <button type="button" class="agenda-edit-btn px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary text-xs font-label-code uppercase transition-colors flex items-center gap-1" data-id="${item.id}">
            <span class="material-symbols-outlined text-[16px] text-primary-container">edit</span>
            <span>Edit</span>
          </button>
          <button type="button" class="agenda-duplicate-btn px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-muted hover:text-white text-xs font-label-code uppercase transition-colors" data-id="${item.id}" title="Duplicate this session">
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
          </button>
          <button type="button" class="agenda-delete-btn p-1.5 rounded-lg bg-error-container/20 text-error hover:bg-error-container/30 transition-colors" data-id="${item.id}" title="Delete session">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>`;
    })
    .join("");

  // Attach row event listeners
  listEl.querySelectorAll(".agenda-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = adminAgendaCache.find((i) => i.id === btn.dataset.id);
      if (item) openAgendaForm(item);
    });
  });

  listEl.querySelectorAll(".agenda-duplicate-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      duplicateAgendaItem(btn.dataset.id);
    });
  });

  listEl.querySelectorAll(".agenda-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteAgendaItem(btn.dataset.id);
    });
  });

  listEl.querySelectorAll(".agenda-move-up-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      moveAgendaItem(btn.dataset.id, -1);
    });
  });

  listEl.querySelectorAll(".agenda-move-down-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      moveAgendaItem(btn.dataset.id, 1);
    });
  });
}

function openAgendaForm(item = null) {
  const formContainer = document.getElementById("form-agenda");
  const formTitle = document.getElementById("form-agenda-title");
  const statusEl = document.getElementById("agenda-form-status");

  if (!formContainer) return;
  if (statusEl) statusEl.classList.add("hidden");

  if (item) {
    if (formTitle) formTitle.textContent = `Edit Session: ${item.title || ""}`;
    document.getElementById("agenda-form-id").value = item.id || "";
    document.getElementById("agenda-form-time").value = item.time || "";
    document.getElementById("agenda-form-type").value = item.type || "talks";
    document.getElementById("agenda-form-badge").value = item.badge || "";
    document.getElementById("agenda-form-sort-order").value = item.sort_order ?? 1;
    document.getElementById("agenda-form-session-title").value = item.title || "";
    document.getElementById("agenda-form-subtitle").value = item.subtitle || "";
    document.getElementById("agenda-form-host-name").value = item.host_name || "";
    document.getElementById("agenda-form-host-role").value = item.host_role || "";
    document.getElementById("agenda-form-host-category").value = item.host_category || "";
    document.getElementById("agenda-form-host-initials").value = item.host_initials || "";
    document.getElementById("agenda-form-room").value = item.room || "";
    document.getElementById("agenda-form-start-iso").value = item.start_iso || "";
    document.getElementById("agenda-form-end-iso").value = item.end_iso || "";
    document.getElementById("agenda-form-overview").value = item.overview || "";
    document.getElementById("agenda-form-takeaways").value = Array.isArray(item.takeaways) ? item.takeaways.join("\n") : "";
    document.getElementById("agenda-form-published").checked = item.published !== false;
  } else {
    if (formTitle) formTitle.textContent = "Add Agenda Session";
    document.getElementById("agenda-form-id").value = "";
    document.getElementById("agenda-form-time").value = "";
    document.getElementById("agenda-form-type").value = "talks";
    document.getElementById("agenda-form-badge").value = "Speaker Talk";
    const nextOrder = adminAgendaCache.length ? Math.max(...adminAgendaCache.map((i) => Number(i.sort_order) || 0)) + 1 : 1;
    document.getElementById("agenda-form-sort-order").value = nextOrder;
    document.getElementById("agenda-form-session-title").value = "";
    document.getElementById("agenda-form-subtitle").value = "";
    document.getElementById("agenda-form-host-name").value = "";
    document.getElementById("agenda-form-host-role").value = "";
    document.getElementById("agenda-form-host-category").value = "Keynote Speaker";
    document.getElementById("agenda-form-host-initials").value = "";
    document.getElementById("agenda-form-room").value = "Grand Plenary Amphitheatre";
    document.getElementById("agenda-form-start-iso").value = "20261128T100000Z";
    document.getElementById("agenda-form-end-iso").value = "20261128T104500Z";
    document.getElementById("agenda-form-overview").value = "";
    document.getElementById("agenda-form-takeaways").value = "";
    document.getElementById("agenda-form-published").checked = true;
  }

  formContainer.classList.remove("hidden");
  formContainer.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeAgendaForm() {
  const formContainer = document.getElementById("form-agenda");
  if (formContainer) formContainer.classList.add("hidden");
}

async function saveAgendaList(newList) {
  adminAgendaCache = newList;
  localStorage.setItem("shift_agenda_items", JSON.stringify(adminAgendaCache));

  try {
    await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: adminAgendaCache }),
    });
  } catch (err) {
    console.warn("Could not persist to /api/agenda:", err);
  }

  renderAgendaAdminList();
}

async function handleAgendaFormSubmit(e) {
  e.preventDefault();
  const statusEl = document.getElementById("agenda-form-status");
  statusEl.classList.remove("hidden", "text-error");
  statusEl.classList.add("text-primary-container");
  statusEl.textContent = "Saving agenda session...";

  const id = document.getElementById("agenda-form-id").value || `agenda-${Date.now()}`;
  const time = document.getElementById("agenda-form-time").value.trim();
  const type = document.getElementById("agenda-form-type").value;
  const badge = document.getElementById("agenda-form-badge").value.trim();
  const sort_order = Number(document.getElementById("agenda-form-sort-order").value) || 1;
  const title = document.getElementById("agenda-form-session-title").value.trim();
  const subtitle = document.getElementById("agenda-form-subtitle").value.trim();
  const host_name = document.getElementById("agenda-form-host-name").value.trim();
  const host_role = document.getElementById("agenda-form-host-role").value.trim();
  const host_category = document.getElementById("agenda-form-host-category").value.trim();
  const host_initials = document.getElementById("agenda-form-host-initials").value.trim().toUpperCase() || initials(host_name);
  const room = document.getElementById("agenda-form-room").value.trim();
  const start_iso = document.getElementById("agenda-form-start-iso").value.trim();
  const end_iso = document.getElementById("agenda-form-end-iso").value.trim();
  const overview = document.getElementById("agenda-form-overview").value.trim();
  const takeaways = document
    .getElementById("agenda-form-takeaways")
    .value.split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const published = document.getElementById("agenda-form-published").checked;

  const sessionObj = {
    id,
    time,
    type,
    badge,
    sort_order,
    title,
    subtitle,
    host_name,
    host_role,
    host_category,
    host_initials,
    room,
    start_iso,
    end_iso,
    overview,
    takeaways,
    published,
  };

  const existingIdx = adminAgendaCache.findIndex((i) => i.id === id);
  let updatedList;
  if (existingIdx >= 0) {
    updatedList = [...adminAgendaCache];
    updatedList[existingIdx] = sessionObj;
  } else {
    updatedList = [...adminAgendaCache, sessionObj];
  }

  // Sort by sort_order
  updatedList.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  await saveAgendaList(updatedList);

  statusEl.textContent = "Session successfully saved! Live schedule updated.";
  setTimeout(() => {
    closeAgendaForm();
  }, 700);
}

async function deleteAgendaItem(id) {
  const item = adminAgendaCache.find((i) => i.id === id);
  const name = item ? `"${item.title}"` : "this session";
  if (!confirm(`Are you sure you want to delete ${name} from the summit agenda? This cannot be undone.`)) {
    return;
  }

  const updatedList = adminAgendaCache.filter((i) => i.id !== id);
  await saveAgendaList(updatedList);
}

async function duplicateAgendaItem(id) {
  const item = adminAgendaCache.find((i) => i.id === id);
  if (!item) return;

  const copy = {
    ...item,
    id: `agenda-${Date.now()}`,
    title: `${item.title} (Copy)`,
    sort_order: (Number(item.sort_order) || 0) + 1,
  };

  openAgendaForm(copy);
}

async function moveAgendaItem(id, direction) {
  const idx = adminAgendaCache.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= adminAgendaCache.length) return;

  const list = [...adminAgendaCache];
  const temp = list[idx];
  list[idx] = list[targetIdx];
  list[targetIdx] = temp;

  // Reassign sequential sort_orders
  list.forEach((item, i) => {
    item.sort_order = (i + 1) * 10;
  });

  await saveAgendaList(list);
}

async function resetDefaultAgenda() {
  if (!confirm("Reset the entire agenda back to the curated 12 default summit sessions? Any custom sessions will be overwritten.")) {
    return;
  }

  try {
    const res = await fetch("/data/agenda.json");
    if (res.ok) {
      const defaultData = await res.json();
      if (Array.isArray(defaultData)) {
        await saveAgendaList(defaultData);
        alert("Agenda reset to the default 12 summit sessions successfully.");
      }
    }
  } catch (err) {
    alert("Could not load default agenda data.");
  }
}

let agendaAdminInitialized = false;

function initAgendaAdmin() {
  if (!agendaAdminInitialized) {
    agendaAdminInitialized = true;
    const addBtn = document.getElementById("agenda-add-btn");
    if (addBtn) addBtn.addEventListener("click", () => openAgendaForm(null));

    const resetBtn = document.getElementById("agenda-reset-default-btn");
    if (resetBtn) resetBtn.addEventListener("click", resetDefaultAgenda);

    const closeBtn = document.getElementById("agenda-form-close-x");
    if (closeBtn) closeBtn.addEventListener("click", closeAgendaForm);

    const cancelBtn = document.getElementById("agenda-form-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", closeAgendaForm);

    const editForm = document.getElementById("agenda-edit-form");
    if (editForm) editForm.addEventListener("submit", handleAgendaFormSubmit);

    // Filter Buttons
    const filterBtns = document.querySelectorAll(".admin-agenda-filter-btn");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        adminAgendaFilter = btn.dataset.filter || "all";
        filterBtns.forEach((b) => {
          if (b === btn) {
            b.className = "admin-agenda-filter-btn px-3 py-1.5 rounded-md font-label-code text-xs uppercase tracking-wider transition-all bg-primary-container text-on-primary font-bold";
          } else {
            b.className = "admin-agenda-filter-btn px-3 py-1.5 rounded-md font-label-code text-xs uppercase tracking-wider transition-all text-text-muted hover:text-text-primary";
          }
        });
        renderAgendaAdminList();
      });
    });

    // Search input
    const searchInput = document.getElementById("admin-agenda-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        adminAgendaSearchQuery = e.target.value.trim();
        renderAgendaAdminList();
      });
    }
  }

  loadAgendaAdmin();
}

// ---------------------------------------------------------------------------
// LOAD EVERYTHING
// ---------------------------------------------------------------------------
function loadAll() {
  loadEntity("speakers");
  loadEntity("team_members");
  loadEntity("partners");
  initAgendaAdmin();
  loadApplicants();
  loadPartnerRequests();
  initApplicantFilters();
}

checkAuth();
