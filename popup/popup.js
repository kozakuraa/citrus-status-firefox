function setText(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = value;
  }
}

function openUrl(id, url) {
  const el = document.getElementById(id);

  if (el) {
    el.href = url;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setText("year", new Date().getFullYear());

  openUrl(
    "githubRepo",
    "https://github.com/Imaginatorix/Citrus-Status"
  );
});
