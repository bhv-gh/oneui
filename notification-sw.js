self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const message = {
        type: 'NOTIFICATION_ACTION',
        action: action || 'focus',
        taskId: data.taskId,
      };

      for (const client of clientList) {
        client.postMessage(message);
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
