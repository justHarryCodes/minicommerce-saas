// Minimal service worker: push notifications + PWA installability.
//
// Deliberately NOT an offline-first cache — this is a live e-commerce site
// with prices/stock/orders that change constantly; caching pages would risk
// showing stale data, which is worse than no offline support at all.
//
// No fetch handler. There used to be a pure-passthrough one here
// (`event.respondWith(fetch(event.request))`), added only because some
// browsers' installability checks historically wanted *a* fetch handler
// present — it wasn't meant to change any behavior. It broke page
// navigation instead: a navigation's event.request has mode "navigate",
// and the Fetch API does not allow calling fetch() with a request whose
// mode is "navigate" — re-issuing that exact request object throws
// TypeError: Failed to fetch, which surfaced as a full Next.js application
// error on every route this service worker controlled (reproduced:
// visiting /admin hard-failed with exactly this error, sw.js:19). Modern
// Chrome no longer requires a fetch handler for installability, so the
// fix is removing it outright rather than special-casing navigation mode
// — a passthrough handler adds no functionality either way, only risk.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Duka", body: event.data.text() };
  }

  const { title, body, url, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Duka", {
      body: body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: url || "/", ...data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus an already-open tab on the same origin instead of opening a
      // duplicate, if one exists.
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
