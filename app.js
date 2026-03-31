/**
 * Contact: edit index.html.
 * Projects: PROJECTS — optional `date` (ISO); `images` show on detail page; `description` uses blank lines for paragraphs.
 * Art: ART_IMAGES.
 * Writing: WRITINGS.
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
    short: "attention is all you need",
    description:
      "Longer write-up for speakeasy: problem, what you built, tools, and outcomes. Swap thumb/images for real screenshots when you have them.\n\nAdd more paragraphs with a blank line between them.",
    thumb: "images/placeholder-1.svg",
    images: [
      "images/placeholder-1.svg",
      "images/placeholder-2.svg",
    ],
  },
  {
    id: "dubflow",
    title: "dubflow",
    short: "a context-aware desktop focus companion",
    description:
      "Detail view copy for dubflow. Replace with your narrative and image paths.",
    thumb: "images/placeholder-2.svg",
    images: ["images/placeholder-2.svg", "images/placeholder-3.svg"],
  },
  {
    id: "orbit",
    title: "orbit",
    short: "ai-powered hyperlocal networking ",
    description: "Detail view copy for orbit.",
    thumb: "images/placeholder-3.svg",
    images: ["images/placeholder-3.svg", "images/placeholder-1.svg"],
  },
  {
    id: "resumeRAG",
    title: "resumeRAG",
    short: "graphRAG visualizations for recruiter workflows.",
    description: "Detail view copy for resumeRAG.",
    thumb: "images/placeholder-1.svg",
    images: ["images/placeholder-1.svg", "images/placeholder-3.svg"],
  },
  {
    id: "forklift",
    title: "forklift",
    short: "your ai-powered shortcut to open source",
    description:
      "Forklift is an ai-powered platform that helps users find repositories, understand codebases, discover issues, and start contributing.",
    thumb: "images/projects/forklift-1.png",
    images: [
      "images/projects/forklift-1.png",
      "images/projects/forklift-2.png",
      "images/projects/forklift-3.png",
      "images/projects/forklift-4.png",
      "images/projects/forklift-5.png",
    ],
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
  projectArticle: $("#section-project-article"),
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

function projectById(id) {
  const lower = id.toLowerCase();
  return PROJECTS.find((p) => p.id.toLowerCase() === lower);
}

function parseHash() {
  const raw = (window.location.hash || "#home").slice(1).trim();
  const segments = raw.split("/").filter(Boolean);
  const head = (segments[0] || "home").toLowerCase();

  if (head === "writing") {
    if (segments.length >= 2) {
      return {
        view: "writing-post",
        slug: segments.slice(1).join("/").toLowerCase(),
      };
    }
    return { view: "writing-list" };
  }
  if (head === "projects") {
    if (segments.length >= 2) {
      return { view: "project-post", projectId: segments.slice(1).join("/") };
    }
    return { view: "projects" };
  }
  if (segments.length === 1 && ["home", "art", "contact"].includes(head)) {
    return { view: head };
  }
  return { view: "home" };
}

function sectionNodeForView(view) {
  if (view === "home") return sections.home;
  if (view === "projects") return sections.projects;
  if (view === "project-post") return sections.projectArticle;
  if (view === "art") return sections.art;
  if (view === "writing-list") return sections.writing;
  if (view === "writing-post") return sections.writingArticle;
  if (view === "contact") return sections.contact;
  return sections.home;
}

function setDocumentTitle(view, { post, project } = {}) {
  const base = "Derek Yao";
  if (view === "writing-post" && post)
    document.title = `${base} — ${post.title}`;
  else if (view === "project-post" && project)
    document.title = `${base} — ${project.title}`;
  else if (view === "writing-list") document.title = `${base} — Writing`;
  else if (view === "projects") document.title = `${base} — Projects`;
  else if (view === "art") document.title = `${base} — Art`;
  else if (view === "contact") document.title = `${base} — Contact`;
  else if (view === "home") document.title = base;
  else document.title = base;
}

function updateNavCurrent(view) {
  navLinks.forEach((a) => {
    const sec = a.dataset.section;
    const writingActive =
      sec === "writing" &&
      (view === "writing-list" || view === "writing-post");
    const projectsActive =
      sec === "projects" && (view === "projects" || view === "project-post");
    if (writingActive || projectsActive || sec === view) {
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

let projectCarouselIndex = 0;

function projectCarouselStepPx() {
  const track = $("#project-carousel-track");
  if (!track) return 0;
  const slide = track.querySelector(".project-carousel-slide");
  if (!slide) return 0;
  const styles = getComputedStyle(track);
  const gap = parseFloat(styles.gap || styles.columnGap) || 0;
  return slide.getBoundingClientRect().width + gap;
}

function updateProjectCarousel() {
  const track = $("#project-carousel-track");
  const prev = $("#project-carousel-prev");
  const next = $("#project-carousel-next");
  const counter = $("#project-carousel-counter");
  const counterRow = $(".project-carousel-counter-row");
  const slides = track ? $all(".project-carousel-slide", track) : [];
  const n = slides.length;

  if (!track) return;

  if (n === 0) {
    if (counter) counter.textContent = "";
    return;
  }

  projectCarouselIndex = Math.min(Math.max(0, projectCarouselIndex), n - 1);

  const step = projectCarouselStepPx();
  track.style.transform =
    step > 0 ? `translateX(${-projectCarouselIndex * step}px)` : "none";

  if (counter) counter.textContent = `${projectCarouselIndex + 1} / ${n}`;
  if (prev) prev.disabled = projectCarouselIndex <= 0;
  if (next) next.disabled = projectCarouselIndex >= n - 1;

  const hideNav = n <= 1;
  if (prev) prev.hidden = hideNav;
  if (next) next.hidden = hideNav;
  if (counterRow) counterRow.hidden = hideNav;
}

function populateProjectArticle(project) {
  const gallery = $("#project-article-gallery");
  const track = $("#project-carousel-track");
  const titleEl = $("#project-article-title");
  const metaEl = $("#project-article-meta");
  const bodyEl = $("#project-article-body");
  const images = project.images || [];

  if (gallery && track) {
    if (images.length === 0) {
      gallery.hidden = true;
      track.innerHTML = "";
    } else {
      gallery.hidden = false;
      track.innerHTML = images
        .map(
          (src) =>
            `<div class="project-carousel-slide"><img src="${escapeHtml(src)}" alt="" loading="lazy" /></div>`
        )
        .join("");
      const n = images.length;
      $all(".project-carousel-slide", track).forEach((el) => {
        el.classList.toggle("project-carousel-slide--solo", n === 1);
      });
      projectCarouselIndex = 0;

      const imgs = $all("img", track);
      requestAnimationFrame(() => updateProjectCarousel());

      Promise.all(
        imgs.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) resolve();
              else {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
              }
            })
        )
      ).then(() => {
        requestAnimationFrame(() => updateProjectCarousel());
      });
    }
  }

  if (titleEl) titleEl.textContent = project.title;
  if (metaEl) {
    if (project.date) {
      metaEl.innerHTML = `<time datetime="${escapeHtml(project.date)}">${escapeHtml(formatDate(project.date))}</time>`;
    } else {
      metaEl.textContent = "";
    }
  }
  if (bodyEl) bodyEl.innerHTML = bodyToParagraphHtml(project.description);
}

function showView(route) {
  let view = route.view;
  let post = null;
  let project = null;

  if (view === "writing-post") {
    post = writingBySlug(route.slug);
    if (!post) {
      history.replaceState(null, "", `${location.pathname}${location.search}#writing`);
      view = "writing-list";
    } else {
      populateWritingArticle(post);
    }
  }

  if (view === "project-post") {
    project = projectById(route.projectId);
    if (!project) {
      history.replaceState(null, "", `${location.pathname}${location.search}#projects`);
      view = "projects";
    } else {
      populateProjectArticle(project);
    }
  }

  if (mainEl) {
    mainEl.classList.toggle("main--article", view === "writing-post");
    mainEl.classList.toggle("main--project-article", view === "project-post");
  }

  $all(".section").forEach((el) => el.classList.remove("is-active"));
  const active = sectionNodeForView(view);
  if (active) active.classList.add("is-active");

  updateNavCurrent(view);
  setDocumentTitle(view, { post, project });

  if (view === "projects" || view === "art" || view === "project-post") {
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
    const a = document.createElement("a");
    a.href = `#projects/${encodeURIComponent(p.id)}`;
    a.className = "project-card";
    a.setAttribute("aria-label", `Open project: ${p.title}`);
    a.innerHTML = `
      <div class="project-card-img-wrap">
        <img src="${p.thumb}" alt="" loading="lazy" />
      </div>
      <div class="project-card-inner">
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.short)}</p>
      </div>
    `;
    li.appendChild(a);
    grid.appendChild(li);
  });
}

function renderWritings() {
  const list = $("#writings-list");
  if (!list) return;
  list.innerHTML = "";
  WRITINGS.sort((a, b) => b.date.localeCompare(a.date)).forEach((w) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#writing/${encodeURIComponent(w.slug)}`;
    link.innerHTML = `
      <span class="title">${escapeHtml(w.title)}</span>
      <time datetime="${escapeHtml(w.date)}">${escapeHtml(formatDate(w.date))}</time>
    `;
    li.appendChild(link);
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

renderProjects();
renderWritings();
renderArtGrid();
window.addEventListener("hashchange", onHashChange);
onHashChange();

$("#project-carousel-prev")?.addEventListener("click", () => {
  if (projectCarouselIndex > 0) {
    projectCarouselIndex -= 1;
    updateProjectCarousel();
  }
});

$("#project-carousel-next")?.addEventListener("click", () => {
  const track = $("#project-carousel-track");
  const n = track ? $all(".project-carousel-slide", track).length : 0;
  if (projectCarouselIndex < n - 1) {
    projectCarouselIndex += 1;
    updateProjectCarousel();
  }
});

window.addEventListener("resize", () => {
  if (sections.projectArticle?.classList.contains("is-active")) {
    updateProjectCarousel();
  }
});

function initCustomCursor() {
  const el = document.getElementById("custom-cursor");
  if (!el) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.documentElement.classList.add("has-custom-cursor");

  document.addEventListener("mousemove", (e) => {
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
  });

  document.addEventListener("mousedown", () => {
    el.classList.remove("is-clicking");
    void el.offsetWidth;
    el.classList.add("is-clicking");
  });

  el.addEventListener("animationend", () => {
    el.classList.remove("is-clicking");
  });
}

initCustomCursor();
