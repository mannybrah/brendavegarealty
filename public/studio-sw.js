self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Brenda Vega Studio", {
      body: data.body || "",
      icon: "/images/studio-icon-192.png",
      badge: "/images/studio-icon-192.png",
      data: { url: data.url || "/studio" },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/studio";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes("/studio")) { c.focus(); c.navigate(url); return; }
      return clients.openWindow(url);
    })
  );
});
