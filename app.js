/**
 * Contact: edit index.html.
 * Projects: PROJECTS — optional `date` (ISO); `images` show on detail page; `description` uses blank lines for paragraphs. Lines starting with `## ` become section headings.
 * Art: ART_IMAGES — first viewport batch only, then more on scroll (IntersectionObserver).
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
    description: `As college students, we've all been to lectures where the professor doesn't realize their audience is completely lost, where we leave the building with more questions than answers and feel confused and frustrated.

Similarly in professional settings, the brightest ideas can be undermined by subpar pitches and unclear explanations. The result of such scenarios are missed opportunities to close deals and students who gain little to nothing from lectures.

Attention drives impact; commanding it is a difficult skill. Whether you're doing a simple project presentation for a class or hosting a Ted Talk, you need to read visual cues from the audience and respond in real time to effectively engage your listeners. Dynamically adjusting tone, phrasing, and content on the fly is a crucial yet formidable skill to obtain, and even the most skilled speakers often struggle to address the audience in its entirety.

Such struggles motivated us to build SpeakEasy, an AI agent that gives you detailed audience analytics and live feedback based on reactions while you speak, so you can give more engaging and responsive presentations.

## What it does

SpeakEasy is an AI agent that gives you detailed analytics and actionable insights into how engaged your audience is. Using computer vision, the webcam feature continuously analyzes each audience member's emotional state and attention level through sentiment analysis and gaze detection. Simultaneously, our platform is capable of live transcription of the speaker's words through Fish Audio, providing valuable context when giving speaker insights. Live sentiment analysis and transcription data is then integrated through a Claude-based agent that informs you which people seem confused, which parts of your speech were poorly received, and what you can do to regain your audience's attention. A multitude of analytics present further fruitful information regarding the presenter's performance and the crowd's reaction over time.

## How we built it

SpeakEasy is built on a FastAPI backend and React frontend that processes real-time video and audio streams through a dual-pipeline architecture.

The core of our speech processing relies on Fish Audio's advanced ASR system, which provides high-accuracy and low-latency speech-to-text transcription with overlapping audio chunks to ensure no words are missed. Fish Audio handles the complex task of converting continuous speech into text, which is then integrated into our custom post-processing AI pipeline that refines the transcripts for accuracy and coherence while removing overlapping words.

The visual analysis pipeline uses OpenFace integrated with RetinaFace for face detection and a multitask learning model for emotion and gaze analysis. We implemented a dual-speed processing system that provides fast face detection every 200ms and detailed facial emotion analysis every 7 seconds.

Gaze analysis and emotion analysis are implemented by augmenting the model with linear heads to extract gaze and classify a probability distribution over 8 emotions. But what does it mean for people to be attending to something else? Since we have a head in our model that outputs gaze, defined by a yaw and a pitch, we can compute a unit vector that represents the direction of a person's gaze.

Then, we can define a region of attention that represents what people should be attending to. In the case of SpeakEasy, the region of attention would be defined as the speaker, or a slideshow that he would be utilizing. Then, we can compute a unit vector that represents the direction from the person's eyes to this region of attention. We can then take the cosine similarity between their gaze vector and the "true" vector, and scale this to [0, 1] to acquire a probability metric for attention.

At the end, Claude AI analyzes the combined audio transcripts and visual data to generate real-time presenter recommendations, all streamed directly to the dashboard via SSE.

## Challenges we ran into

At first, Fish Audio's transcription was missing spoken words because of small delays between the audio chunks we sent to it. In addition, the output was muddled by external noises that were causing the transcription to become inaccurate and incoherent. We solved this by including overlap between audio chunks that were passed into Fish Audio. The output would then go through a Claude-based post-processing layer to clean and assess coherence before displaying to the user, removing words that were recorded in the previous chunk as well as filler words and noise.

One challenge was being able to accurately and efficiently capture the sentiment and attention scores for each individual person detected in frame. Sentiment and attention are inherently complex attributes, making accurate detection quite difficult. However, we came up with a two step approach to handling both the efficiency bottlenecks and the accuracy issues:

In the first stage, we would rapidly run a large scale one-shot bounding box detection model for all the faces in frame. By running this algorithm independently of sentiment analysis and attention, we would be able to report bounding box detection much more seamlessly to the front end.

Then, once we had acquired the bounding boxes, we would crop the image to each individual face based on the predicted bounding boxes, and then feed that image into the model once again utilizing linear layers after a convolutional net to project sentiments and gaze, thereby allowing the model to analyze only one face at a time to produce more accurate results.

Another challenge was with the overall architecture of the project. We initially had a single large API route in the backend that would call Fish Audio, the computer vision model, and Claude all in the same place.

However, the latency this resulted in made SpeakEasy effectively useless, and we wanted different components of the dashboard to be able to update independently.

To fix this, we restructured the platform to have most of the logic on the frontend and split up the backend into several smaller API routes. When called on, each route replies with raw data, which is then filtered and displayed appropriately by each React component.

## Accomplishments that we're proud of

Overall, we are incredibly proud of our final project, as we built a working multimodal, real-time system that unites computer vision, audio transcription, and language modeling into one cohesive pipeline.

Throughout the process of creating SpeakEasy, architecting the flow was one of the most difficult yet rewarding parts. With multiple moving parts, designing the system to integrate everything coherently was essential in realizing our vision for the platform.

We also take pride in the level of polish we achieved on both the frontend and backend. From designing an intuitive dashboard that visualizes real-time audience engagement to fine-tuning Fish Audio's transcription pipeline and integrating Claude's contextual reasoning, every piece was built with user experience and performance in mind.

Of course, none of this would've been possible without our teamwork and adaptability. We applaud ourselves for actively communicating our ideas, progress, and needs, as doing so has been crucial to our efficacy.

## What we learned

We learned a lot about processing multimodal inputs through agentic workflows. LLMs are extremely powerful, but they still have core limitations that prevent them from being able to fully one-shot platforms with features as complex and intricate as SpeakEasy.

Throughout the hackathon, we operated with a philosophy that treats LLMs as a tool to be used rather than a black box to be thrown at everything. We integrated them in various parts of Speakeasy but maintained a strong non-LLM fundamental structure throughout.

## What's next for SpeakEasy

We'd like to refine our algorithms and analytics to be more accurate by integrating data like intonation and other vocal cues to give more comprehensive feedback for the presenter. With two cameras, we could also give feedback on body language and hand gestures, significantly enhancing speakers' stage presence.

Currently, the speaker receives feedback from observing the screen's streamed advice, which may distract them and decrease the quality of their presentation. With Fish Audio's text-to-speech capabilities, we can connect our current platform to earbuds so that the speaker can privately listen to recommendations.

Additionally, Fish Audio's distinct emotion control in voice generation inspires us. We envision SpeakEasy to including a feature that directs your emotions by showing first-hand what you would and should sound like in order to hype up the crowd or command the audience, which is decided in response to overall attention and confusion in the audience.`,
    thumb: "images/projects/speakeasy-1.jpg",
    images: [
      "images/projects/speakeasy-1.jpg",
      "images/projects/speakeasy-2.jpg",
      "images/projects/speakeasy-3.png",
    ],
  },
  {
    id: "dubflow",
    title: "dubflow",
    short: "a context-aware desktop focus companion",
    description: `DubFlow is a smart focus tracker that keeps you accountable in the cutest way possible. It's a desktop app/overlay that uses both webcam video and window monitoring to recognize when you're focused or distracted. Your on-screen companion, Dubs (the UW mascot), reacts in real time to your behavior. DubFlow has a main dashboard that allows users to start new focus sessions, view focus analytics, control Dubs, and view past session history. Once a focus session is started, the Dubs overlay appears and begins monitoring your focus in real-time.

There are two ways to trigger a distracted state: looking away from the screen or switching to a distracting app/website. Dubs will then respond with a context-aware message like: "Only 20 minutes remain for those integrals, so put that phone away before I eat it." The session is visualized on the progress bar, with yellow segments indicating distracted periods and purple segments indicating focused periods.

DubFlow is built with SvelteKit and Electron. The architecture combines multiple data sources to create a complete picture of your focus state.

The vision processing component uses OpenCV locally for real-time eye tracking and AWS Rekognition for detailed context analysis. Rekognition detects distracting objects in the frame such as phones, drinks, or other devices. For window monitoring, we use get-windows to track active applications and websites.

All this context is piped to an AWS Bedrock-hosted LLM, which generates relevant and concise messages that keep you focused. The messages are displayed on-screen, spoken aloud through ElevenLabs, and sent to the user's phone via Pushover notifications.`,
    thumb: "images/projects/dubflow-1.jpg",
    images: [
      "images/projects/dubflow-1.jpg",
      "images/projects/dubflow-2.png",
      "images/projects/dubflow-3.png",
    ],
  },
  {
    id: "orbit",
    title: "orbit",
    short: "ai-powered hyperlocal networking ",
    description: `Orbit is a hyperlocal networking app that helps users discover and connect with nearby professionals. It combines real-time location, AI-powered semantic search, and an intuitive interface to make networking at conferences, hackathons, and other events more seamless and engaging.

Networking at large events is kinda hard. You meet interesting people in passing, but exchanging contact information feels awkward. Even when you do connect, it's easy to forget who someone was or what they were working on.

We built Orbit to solve this by creating a faster, more intuitive way to discover and connect with people who are physically nearby. The original idea was for events, but the system we built could work anywhere, like coffee shops, coworking spaces, or college campuses.`,
    thumb: "images/projects/orbit-0.png",
    images: [
      "images/projects/orbit-0.png",
      "images/projects/orbit-1.png",
      "images/projects/orbit-2.png",
    ],
  },
  {
    id: "resumeRAG",
    title: "resumeRAG",
    short:
      "graphRAG visualizations for recruiter workflows",
    description: `Recruiters often waste time on irrelevant matches or miss strong candidates entirely, resulting in slower hiring and overlooked talent. ResumeRAG tackles the broken resume filtering process by moving beyond traditional keyword search to a graph-based approach using GraphRAG that actually understands relationships between skills, roles, and experiences.

Our solution builds a knowledge graph of resumes using GraphRAG, then lets users query it in natural language to discover and visualize relevant information. We implemented this with Python, GraphRAG, FastAPI, and React, layering LLM-driven context and visualization on top to make resume search more accurate, transparent, and useful.

What's next for ResumeRAG would be allowing users to upload their own resume database, allowing them to clearly and efficiently identify talent from within their own hiring processes.`,
    thumb: "images/projects/resumerag-4.png",
    images: [
      "images/projects/resumerag-1.png",
      "images/projects/resumerag-2.png",
      "images/projects/resumerag-3.png",
      "images/projects/resumerag-4.png",
    ],
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
    body: `A shorter piece.`,
  },
  {
    slug: "draft-on-something-you-read",
    title: "Draft on something you read",
    date: "2025-11-02",
    body: "Placeholder body for a post I haven’t finished yet.",
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
  const raw = (window.location.hash || "").replace(/^#/, "").trim();
  const segments = raw.split("/").filter(Boolean);

  if (segments.length === 0) return { view: "home" };

  const head = segments[0].toLowerCase();

  if (head === "home" && segments.length === 1) return { view: "home" };

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
  if (segments.length === 1 && ["art", "contact"].includes(head)) {
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
    .map((chunk) => {
      const lines = chunk.split("\n");
      const first = lines[0] || "";
      if (first.startsWith("## ")) {
        const title = first.slice(3).trim();
        const rest = lines.slice(1).join("\n").trim();
        let html = `<h2 class="writing-article-subheading">${escapeHtml(title)}</h2>`;
        if (rest)
          html += `<p>${escapeHtml(rest).replace(/\n/g, "<br />")}</p>`;
        return html;
      }
      return `<p>${escapeHtml(chunk).replace(/\n/g, "<br />")}</p>`;
    })
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
    mainEl.classList.toggle("main--home", view === "home");
  }

  $all(".section").forEach((el) => el.classList.remove("is-active"));
  const active = sectionNodeForView(view);
  if (active) active.classList.add("is-active");

  updateNavCurrent(view);
  setDocumentTitle(view, { post, project });

  if (view === "home" && window.location.hash) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }

  if (
    view === "home" ||
    view === "projects" ||
    view === "art" ||
    view === "project-post"
  ) {
    window.scrollTo(0, 0);
  }

  if (view === "art") {
    ensureArtGridForView();
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

let artImagesAppended = 0;
let artScrollObserver = null;

function getArtColumnCount() {
  if (window.matchMedia("(max-width: 28rem)").matches) return 1;
  if (window.matchMedia("(max-width: 48rem)").matches) return 2;
  return 3;
}

/** Rough count of images that fit in the initial viewport (matches .art-grid column breakpoints). */
function estimateArtViewportBatchSize() {
  const cols = getArtColumnCount();
  const vh = window.innerHeight;
  const overhead = 140;
  const available = Math.max(200, vh - overhead);
  const rowGuess = 220;
  const rows = Math.max(2, Math.ceil(available / rowGuess));
  return Math.min(ART_IMAGES.length, cols * rows + cols);
}

function getArtScrollBatchSize() {
  return Math.max(getArtColumnCount() * 2, 6);
}

function appendArtImageBatch(count) {
  const grid = $("#art-grid");
  if (!grid || count <= 0) return;
  const end = Math.min(artImagesAppended + count, ART_IMAGES.length);
  for (let i = artImagesAppended; i < end; i++) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = ART_IMAGES[i];
    grid.appendChild(img);
  }
  artImagesAppended = end;
  setupArtScrollLoad();
}

function setupArtScrollLoad() {
  if (artScrollObserver) {
    artScrollObserver.disconnect();
    artScrollObserver = null;
  }
  if (artImagesAppended >= ART_IMAGES.length) return;
  const grid = $("#art-grid");
  const imgs = grid ? grid.querySelectorAll("img") : [];
  const last = imgs[imgs.length - 1];
  if (!last) return;

  artScrollObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      if (artScrollObserver) {
        artScrollObserver.disconnect();
        artScrollObserver = null;
      }
      appendArtImageBatch(getArtScrollBatchSize());
    },
    { root: null, rootMargin: "280px", threshold: 0.01 }
  );
  artScrollObserver.observe(last);
}

/** First visit to Art: load a viewport-sized batch; further images load as the user scrolls. */
function ensureArtGridForView() {
  if (ART_IMAGES.length === 0) return;
  if (artImagesAppended === 0) {
    appendArtImageBatch(estimateArtViewportBatchSize());
  } else if (artImagesAppended < ART_IMAGES.length) {
    setupArtScrollLoad();
  }
}

renderProjects();
renderWritings();
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
  if (
    sections.art?.classList.contains("is-active") &&
    artImagesAppended < ART_IMAGES.length
  ) {
    setupArtScrollLoad();
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
