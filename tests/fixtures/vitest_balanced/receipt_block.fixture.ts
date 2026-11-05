const until = Date.now() + 60_000;
while (Date.now() < until) {
  // Deliberately occupy the worker so the parent can prove the durable start survives a kill.
}
