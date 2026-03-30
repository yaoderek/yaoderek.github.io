/**
 * Contact: edit index.html.
 * Projects: PROJECTS below.
 * Art: ART_IMAGES — paths only; grid is 3 per row in CSS.
 * Writing posts: WRITINGS — each needs slug, title, date, body (paragraphs separated by blank lines).
 */

const ART_IMAGES = [
  "images/art/art-1.png",
  "images/art/art-2.png",
  "images/art/art-3.png",
  "images/art/art-04.png",
  "images/art/art-05.png",
  "images/art/art-06.png",
  "images/art/art-07.png",
  "images/art/art-08.png",
  "images/art/art-09.png",
  "images/art/art-10.png",
  "images/art/art-11.png",
  "images/art/art-12.png",
  "images/art/art-13.png",
  "images/art/art-14.png",
  "images/art/art-15.png",
  "images/art/art-16.png",
  "images/art/art-17.png",
  "images/art/art-18.png",
  "images/art/art-19.png",
  "images/art/art-20.png",
  "images/art/art-21.png",
  "images/art/art-22.png",
  "images/art/art-23.png",
  "images/art/art-24.png",
];

/** Most recent first; grid reads top-to-bottom, oldest at bottom. */
const PROJECTS = [
  {
    id: "speakeasy",
    title: "speakeasy",
    short: "Most recent project — add a one-line summary.",
    description:
      "Longer write-up for speakeasy: problem, what you built, tools, and outcomes. Swap thumb/images for real screenshots when you have them.",
    thumb: "images/placeholder-1.svg",
    images: [
      "images/placeholder-1.svg",
      "images/placeholder-2.svg",
    ],
  },
  {
    id: "dubflow",
    title: "dubflow",
    short: "One-line description for dubflow.",
    description:
      "Detail view copy for dubflow. Replace with your narrative and image paths.",
    thumb: "images/placeholder-2.svg",
    images: ["images/placeholder-2.svg", "images/placeholder-3.svg"],
  },
  {
    id: "orbit",
    title: "orbit",
    short: "One-line description for orbit.",
    description: "Detail view copy for orbit.",
    thumb: "images/placeholder-3.svg",
    images: ["images/placeholder-3.svg", "images/placeholder-1.svg"],
  },
  {
    id: "resumeRAG",
    title: "resumeRAG",
    short: "One-line description for resumeRAG.",
    description: "Detail view copy for resumeRAG.",
    thumb: "images/placeholder-1.svg",
    images: ["images/placeholder-1.svg", "images/placeholder-3.svg"],
  },
  {
    id: "forklift",
    title: "forklift",
    short: "Oldest listed project — one-line summary.",
    description: "Detail view copy for forklift.",
    thumb: "images/placeholder-2.svg",
    images: ["images/placeholder-2.svg"],
  },
];

const WRITINGS = [
  {
    slug: "rue",
    title: "Rue",
    date: "2026-03-01",
    body: `Walking back from the train I took a street I don’t usually use. The light was flat and the sidewalks were uneven in a way that made you look down. Someone had pinned a notice to a lamppost with a single staple; the wind had started to tear it so only half the headline was legible.

I thought about how often we patch over things instead of replacing them—a staple through paper, a sentence added to a draft that doesn’t quite match the tone but carries the fact you need. Later, warm indoors, I wrote a few paragraphs that won’t go anywhere public. They helped anyway.

If this were a real post you’d keep going: quotes, a clear argument, links, whatever fits. The page is meant to hold as much text as you want; break paragraphs with blank lines in the body string and they’ll render as separate blocks.`,
  },
  {
    slug: "first-note",
    title: "First note",
    date: "2026-01-15",
    body: `A shorter piece. One paragraph is fine.

Add another if you like.`,
  },
  {
    slug: "draft-on-something-you-read",
    title: "Draft on something you read",
    date: "2025-11-02",
    body: "Placeholder body for a post you haven’t finished yet.",
  },
  {
    slug: "short-thought",
    title: "Short thought",
    date: "2025-08-20",
    body: "A single line can be enough.",
  },
];

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

const sections = {
  home: $("#section-home"),
  projects: $("#section-projects"),
  art: $("#section-art"),
  writing: $("#section-writing"),
  writingArticle: $("#section-writing-article"),
  contact: $("#section-contact"),
};

const mainEl = $("main");
const navLinks = $all(".site-nav a[data-section]");

function writingBySlug(slug) {
  return WRITINGS.find((w) => w.slug === slug);
}

function parseHash() {
  const raw = (window.location.hash || "#home").slice(1);
  const path = raw.trim().toLowerCase();
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "writing" && parts.length >= 2) {
    const slug = parts.slice(1).join("/");
    return { view: "writing-post", slug };
  }
  if (parts[0] === "writing") {
    return { view: "writing-list", slug: null };
  }
  if (
    parts.length === 1 &&
    ["home", "projects", "art", "contact"].includes(parts[0])
  ) {
    return { view: parts[0], slug: null };
  }
  return { view: "home", slug: null };
}

function sectionNodeForView(view) {
  if (view === "home") return sections.home;
  if (view === "projects") return sections.projects;
  if (view === "art") return sections.art;
  if (view === "writing-list") return sections.writing;
  if (view === "writing-post") return sections.writingArticle;
  if (view === "contact") return sections.contact;
  return sections.home;
}

function setDocumentTitle(view, post) {
  const base = "Derek Yao";
  if (view === "home") document.title = base;
  else if (view === "writing-post" && post)
    document.title = `${base} — ${post.title}`;
  else if (view === "writing-list") document.title = `${base} — Writing`;
  else if (view === "projects") document.title = `${base} — Projects`;
  else if (view === "art") document.title = `${base} — Art`;
  else if (view === "contact") document.title = `${base} — Contact`;
  else document.title = base;
}

function updateNavCurrent(view) {
  navLinks.forEach((a) => {
    const sec = a.dataset.section;
    const writingActive =
      sec === "writing" &&
      (view === "writing-list" || view === "writing-post");
    if (writingActive || sec === view) {
      a.setAttribute("aria-current", "page");
    } else {
      a.removeAttribute("aria-current");
    }
  });
}

function bodyToParagraphHtml(body) {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function populateWritingArticle(post) {
  const titleEl = $("#writing-article-title");
  const dateEl = $("#writing-article-date");
  const bodyEl = $("#writing-article-body");
  if (titleEl) titleEl.textContent = post.title;
  if (dateEl) {
    dateEl.dateTime = post.date;
    dateEl.textContent = formatDate(post.date);
  }
  if (bodyEl) bodyEl.innerHTML = bodyToParagraphHtml(post.body);
}

function showView(route) {
  let view = route.view;
  let post = null;

  if (view === "writing-post") {
    post = writingBySlug(route.slug);
    if (!post) {
      const url = `${location.pathname}${location.search}#writing`;
      history.replaceState(null, "", url);
      view = "writing-list";
    } else {
      populateWritingArticle(post);
    }
  }

  if (mainEl) {
    mainEl.classList.toggle("main--writing-article", view === "writing-post");
  }

  $all(".section").forEach((el) => el.classList.remove("is-active"));
  const active = sectionNodeForView(view);
  if (active) active.classList.add("is-active");

  updateNavCurrent(view);
  setDocumentTitle(view, post);

  if (view === "projects" || view === "art") {
    window.scrollTo(0, 0);
  }
}

function onHashChange() {
  showView(parseHash());
}

function renderProjects() {
  const grid = $("#project-grid");
  if (!grid) return;
  grid.innerHTML = "";
  PROJECTS.forEach((p) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "project-card";
    btn.dataset.projectId = p.id;
    btn.setAttribute("aria-label", `Open project: ${p.title}`);
    btn.innerHTML = `
      <div class="project-card-img-wrap">
        <img src="${p.thumb}" alt="" loading="lazy" />
      </div>
      <div class="project-card-inner">
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.short)}</p>
      </div>
    `;
    li.appendChild(btn);
    grid.appendChild(li);
  });
}

function renderWritings() {
  const list = $("#writings-list");
  if (!list) return;
  list.innerHTML = "";
  WRITINGS.sort((a, b) => b.date.localeCompare(a.date)).forEach((w) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#writing/${encodeURIComponent(w.slug)}`;
    a.innerHTML = `
      <span class="title">${escapeHtml(w.title)}</span>
      <time datetime="${escapeHtml(w.date)}">${escapeHtml(formatDate(w.date))}</time>
    `;
    li.appendChild(a);
    list.appendChild(li);
  });
}

function renderArtGrid() {
  const grid = $("#art-grid");
  if (!grid) return;
  grid.innerHTML = ART_IMAGES.map(
    (src) => `<img src="${escapeHtml(src)}" alt="" loading="lazy" />`
  ).join("");
}

/* Modal + carousel */
const backdrop = $("#project-modal");
const modalTitle = $("#modal-title");
const modalDescription = $("#modal-description");
const carouselTrack = $("#carousel-track");
const btnPrev = $("#carousel-prev");
const btnNext = $("#carousel-next");
const counter = $("#carousel-counter");
const btnClose = $("#modal-close");

let carouselIndex = 0;
let carouselImages = [];

function setCarouselTransform() {
  if (!carouselTrack) return;
  carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;
  const n = carouselImages.length;
  if (counter) counter.textContent = n ? `${carouselIndex + 1} / ${n}` : "0 / 0";
  if (btnPrev) btnPrev.disabled = carouselIndex <= 0;
  if (btnNext) btnNext.disabled = carouselIndex >= n - 1;
}

function openModal(project) {
  if (!backdrop) return;
  carouselImages = project.images.slice();
  carouselIndex = 0;
  if (modalTitle) modalTitle.textContent = project.title;
  if (modalDescription) modalDescription.textContent = project.description;
  if (carouselTrack) {
    carouselTrack.innerHTML = carouselImages
      .map(
        (src) => `
      <div class="carousel-slide" role="group" aria-roledescription="slide">
        <img src="${src}" alt="" />
      </div>
    `
      )
      .join("");
  }
  setCarouselTransform();
  backdrop.hidden = false;
  btnClose?.focus();
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!backdrop) return;
  backdrop.hidden = true;
  document.body.style.overflow = "";
}

function projectById(id) {
  return PROJECTS.find((p) => p.id === id);
}

/* Init */
renderProjects();
renderWritings();
renderArtGrid();
window.addEventListener("hashchange", onHashChange);
onHashChange();

$("#project-grid")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".project-card[data-project-id]");
  if (!btn) return;
  const p = projectById(btn.dataset.projectId);
  if (p) openModal(p);
});

btnPrev?.addEventListener("click", () => {
  if (carouselIndex > 0) {
    carouselIndex -= 1;
    setCarouselTransform();
  }
});

btnNext?.addEventListener("click", () => {
  if (carouselIndex < carouselImages.length - 1) {
    carouselIndex += 1;
    setCarouselTransform();
  }
});

btnClose?.addEventListener("click", closeModal);

backdrop?.addEventListener("click", (e) => {
  if (e.target === backdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (backdrop && !backdrop.hidden && e.key === "Escape") closeModal();
});
