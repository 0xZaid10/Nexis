import { Router, type IRouter } from "express";

const router: IRouter = Router();
const NEXIS_BASE = "http://34.163.214.137:3000";

router.use(async (req, res) => {
  const qs = Object.keys(req.query).length
    ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
    : "";
  const url = `${NEXIS_BASE}${req.path}${qs}`;

  // Sync research can take 1–10 min; all other calls should be fast
  const isSync = req.path.includes("/sync");
  const timeoutMs = isSync ? 660_000 : 60_000;

  try {
    const isBody = ["POST", "PUT", "PATCH"].includes(req.method.toUpperCase());
    const upstream = await fetch(url, {
      method: req.method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...(isBody ? { body: JSON.stringify(req.body) } : {}),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    res.status(upstream.status).json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upstream unavailable";
    req.log.error({ err, url }, "Nexis proxy error");
    res.status(502).json({ error: msg });
  }
});

export default router;
