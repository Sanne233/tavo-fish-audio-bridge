export default function handler(_request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    ok: true,
    service: "Tavo Fish Audio Bridge",
    endpoint: "/v1/audio/speech",
    configured: Boolean(
      process.env.FISH_AUDIO_API_KEY && process.env.TAVO_PROXY_TOKEN,
    ),
  });
}
