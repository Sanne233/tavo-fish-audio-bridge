import { timingSafeEqual } from "node:crypto";

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const DEFAULT_MODEL = "s2.1-pro-free";
const ALLOWED_MODELS = new Set([
  "s2.1-pro-free",
  "s2.1-pro",
  "s2-pro",
  "s1",
  "drama-3",
]);
const ALLOWED_FORMATS = new Set(["mp3", "wav", "pcm", "opus"]);

function cors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Cache-Control", "no-store");
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getBearerToken(request) {
  const value = request.headers.authorization || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function normalizeFormat(value) {
  const format = String(value || "mp3").toLowerCase();
  return ALLOWED_FORMATS.has(format) ? format : "mp3";
}

function normalizeModel(value) {
  const requested = String(value || "").toLowerCase();
  if (ALLOWED_MODELS.has(requested)) return requested;

  const configured = String(process.env.FISH_MODEL || DEFAULT_MODEL).toLowerCase();
  return ALLOWED_MODELS.has(configured) ? configured : DEFAULT_MODEL;
}

function contentTypeFor(format) {
  return {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    pcm: "audio/pcm",
    opus: "audio/opus",
  }[format];
}

export default async function handler(request, response) {
  cors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const fishApiKey = process.env.FISH_AUDIO_API_KEY || "";
  const proxyToken = process.env.TAVO_PROXY_TOKEN || "";

  if (!fishApiKey || !proxyToken) {
    response.status(503).json({
      error: "Bridge is not configured",
      hint: "Set FISH_AUDIO_API_KEY and TAVO_PROXY_TOKEN in Vercel.",
    });
    return;
  }

  if (!secureEqual(getBearerToken(request), proxyToken)) {
    response.status(401).json({ error: "Invalid bridge token" });
    return;
  }

  const body = request.body || {};
  const text = String(body.input ?? body.text ?? "").trim();
  const referenceId = String(
    body.voice ?? body.reference_id ?? process.env.FISH_REFERENCE_ID ?? "",
  ).trim();
  const format = normalizeFormat(body.response_format ?? body.format);
  const model = normalizeModel(body.model);

  if (!text) {
    response.status(400).json({ error: "Missing input text" });
    return;
  }

  if (!referenceId) {
    response.status(400).json({
      error: "Missing Fish Audio voice reference_id",
      hint: "Set a Tavo voice ID or FISH_REFERENCE_ID in Vercel.",
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const fishResponse = await fetch(FISH_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fishApiKey}`,
        "Content-Type": "application/json",
        Accept: contentTypeFor(format),
        model,
      },
      body: JSON.stringify({
        text,
        reference_id: referenceId,
        format,
      }),
      signal: controller.signal,
    });

    if (!fishResponse.ok) {
      const details = (await fishResponse.text()).slice(0, 2_000);
      response.status(fishResponse.status).json({
        error: "Fish Audio request failed",
        status: fishResponse.status,
        details,
      });
      return;
    }

    const audio = Buffer.from(await fishResponse.arrayBuffer());
    response.setHeader(
      "Content-Type",
      fishResponse.headers.get("content-type") || contentTypeFor(format),
    );
    response.setHeader("Content-Length", String(audio.length));
    response.status(200).send(audio);
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    response.status(timedOut ? 504 : 502).json({
      error: timedOut ? "Fish Audio request timed out" : "Bridge request failed",
    });
  } finally {
    clearTimeout(timeout);
  }
}
