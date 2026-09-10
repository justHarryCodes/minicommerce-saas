// Minimal service worker: push notifications + PWA installability.
//
// Deliberately NOT an offline-first cache — this is a live e-commerce site
// with prices/stock/orders that change constantly; caching pages would risk
// showing stale data, which is worse than no offline support at all. The
// fetch handler below exists only because it's part of what some browsers'
// installability checks look for, not to serve cached content — every
// request just passes straight through to the network.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
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
