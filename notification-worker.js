/* Notifications only: no caching, tracking, push subscription, or background timers. */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  let target;
  try {
    target = new URL(event.notification.data?.url || self.registration.scope);
    if (target.origin !== self.location.origin || !target.href.startsWith(self.registration.scope)) {
      target = new URL(self.registration.scope);
    }
  } catch (_) { target = new URL(self.registration.scope); }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => client.url === target.href);
    if (existing) return existing.focus();
    return self.clients.openWindow(target.href);
  })());
});
