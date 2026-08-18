// Background service worker for Citrus Status

browser.runtime.onInstalled.addListener(() => {
  console.log("Citrus Status installed.");
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "getAllStatuses") {
    browser.storage.local.get(["citrus_statuses"]).then(data => {
      sendResponse(data.citrus_statuses || {});
    });
    return true;
  }

  if (msg && msg.type === "setStatus") {
    const newStatus = msg.status;

    browser.storage.local.get(["citrus_statuses"]).then(data => {
      const map = data.citrus_statuses || {};

      for (const contestName in newStatus) {
        map[contestName] = {
          ...(map[contestName] || {}),
          ...newStatus[contestName]
        };
      }

      return browser.storage.local.set({
        citrus_statuses: map
      });
    }).then(() => {
      sendResponse({ ok: true });
    });

    return true;
  }
});
