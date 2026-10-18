console.log("[worker] started");

// Placeholder keep-alive until a queue consumer is wired in.
const keepAlive = setInterval(() => {}, 1 << 30);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(keepAlive);
    process.exit(0);
  });
}
