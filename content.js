/**
 * Citrus Status content script
 * Adds emojis next to problem links and fraction summary on activity pages.
 */

const VERDICT_TO_EMOJI = new Map([
  ["AC", "✅"],
  ["WA", "❌"],
  ["TLE", "⏰"],
  ["MLE", "💾"],
  ["IR", "⚠️"],
  ["CE", "👀"],
]);

function saveStatus(status) {
  browser.runtime.sendMessage({
    type: "setStatus",
    status
  });
}

function getAllStatuses() {
  return browser.runtime.sendMessage({
    type: "getAllStatuses"
  }).then(map => map || {});
}

/** --- Emoji injection for problems page --- */
function inferProblemId(anchor) {
  return anchor.getAttribute("href");
}

async function extractVerdictText(row) {
  // Visit the submissions link in the row
  const link = row.querySelector("a[href*='/submissions/']");
  if (!link) return null;

  // Fetch the submissions page
  const res = await fetch(link.href);
  if (!res.ok) return null;
  const html = await res.text();

  // Loop all submissions and find verdict text
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll(".submission-row");

  let verdict = null;

  for (const row of rows) {
    const verdictCell = row.querySelector("div.state > span.status");
    if (verdictCell) {
      const verdictText = verdictCell.innerText;

      if (VERDICT_TO_EMOJI.has(verdictText)) {
        if (!verdict) {
          verdict = verdictText;
        } else if (verdictText === "AC" && verdict !== "AC") {
          verdict = "AC";
        } else if (
          verdictText === "WA" &&
          !["AC", "WA"].includes(verdict)
        ) {
          verdict = "WA";
        } else if (
          verdictText === "TLE" &&
          !["AC", "WA", "TLE"].includes(verdict)
        ) {
          verdict = "TLE";
        } else if (
          verdictText === "MLE" &&
          !["AC", "WA", "TLE", "MLE"].includes(verdict)
        ) {
          verdict = "MLE";
        } else if (
          verdictText === "IR" &&
          !["AC", "WA", "TLE", "MLE", "IR"].includes(verdict)
        ) {
          verdict = "IR";
        } else if (
          verdictText === "CE" &&
          !["AC", "WA", "TLE", "MLE", "IR", "CE"].includes(verdict)
        ) {
          verdict = "CE";
        }
      }
    }
  }

  return verdict;
}

function applyEmoji(anchor, emoji) {
  if (!anchor || !emoji) return;

  const span = document.createElement("span");
  span.className = "citrus-status-emoji";
  span.textContent = emoji;
  anchor.prepend(span);
}

function upsertSummary(container, solved, total) {
  if (!container) return;

  const text = `${solved}/${total} solved`;

  const badge = document.createElement("span");
  badge.className = "citrus-activity-summary";
  badge.textContent = text;
  container.append(badge);
}

/** --- Page-specific scans --- */
async function scanProblemsPage() {
  const map = await getAllStatuses();

  let contest_name = document.querySelector(
    "#contest-info > a[href*='/contest/']"
  );

  if (contest_name) {
    contest_name = contest_name.getAttribute("href");
  }

  const anchors = Array.from(
    document.querySelectorAll("td.problem a[href*='/problem/']")
  );

  let solvedCount = 0;
  let totalCount = 0;
  const problem_status = {};

  for (const anchor of anchors) {
    const row = anchor.closest("tr") || anchor.parentElement;
    const problemId = inferProblemId(anchor);

    let verdictKey = await extractVerdictText(row);

    if (
      !verdictKey &&
      map[contest_name] &&
      map[contest_name][problemId]
    ) {
      verdictKey = map[contest_name][problemId].status;
    }

    const emoji = VERDICT_TO_EMOJI.get(verdictKey || "");

    if (emoji) {
      applyEmoji(anchor, emoji);
    }

    problem_status[problemId] = {
      status: verdictKey || ""
    };

    totalCount++;

    if (verdictKey === "AC") {
      solvedCount++;
    }
  }

  if (totalCount > 0) {
    const container = document.querySelector("div.tabs > h2");

    upsertSummary(
      container,
      solvedCount,
      totalCount
    );

    const status = {
      [contest_name]: problem_status
    };

    saveStatus(status);
  }
}

async function scanContestsPage() {
  const activityLabel = document.querySelector(
    "div.content-description > h4"
  );

  if (
    activityLabel &&
    activityLabel.textContent === "Activities Currently Joined"
  ) {
    activityLabel.textContent = "Activities Recently Joined";
  }

  const map = await getAllStatuses();

  const contests = document.querySelectorAll("div.contest-block");

  contests.forEach(contest => {
    const contest_link = contest.querySelector(
      "a[href*='/contest/']"
    );

    if (!contest_link) return;

    const contest_name = contest_link.getAttribute("href");

    let solved = 0;
    let total = 0;

    for (const problemId in (map[contest_name] || {})) {
      const status = map[contest_name][problemId].status;

      if (status === "AC") {
        solved++;
      }

      total++;
    }

    if (total > 0) {
      upsertSummary(
        contest_link,
        solved,
        total
      );
    }
  });
}

function run() {
  const path = window.location.pathname;

  if (path === "/problems/") {
    scanProblemsPage();
  } else if (path === "/contests/") {
    scanContestsPage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
