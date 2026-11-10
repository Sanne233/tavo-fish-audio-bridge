import assert from "node:assert/strict";
import handler from "../api/speech.js";

process.env.FISH_AUDIO_API_KEY = "fish-test-key";
process.env.TAVO_PROXY_TOKEN = "bridge-test-token";
process.env.FISH_REFERENCE_ID = "default-voice";
process.env.FISH_MODEL = "s2.1-pro-free";

function createResponse() {
  return {
    headers: new Map(),
    statusCode: 200,
    body: undefined,
    setHeader(key, value) {
      this.headers.set(key.toLowerCase(), value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
    end() {
      return this;
    },
  };
}

const unauthorized = createResponse();
await handler(
  { method: "POST", headers: {}, body: { input: "你好", voice: "voice-1" } },
  unauthorized,
);
assert.equal(unauthorized.statusCode, 401);

let forwarded;
globalThis.fetch = async (url, options) => {
  forwarded = { url, options };
  return new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
};

const success = createResponse();
await handler(
  {
    method: "POST",
    headers: { authorization: "Bearer bridge-test-token" },
    body: {
      input: "你好",
      voice: "fish-reference-id",
      model: "s2.1-pro-free",
      response_format: "mp3",
    },
  },
  success,
);

assert.equal(success.statusCode, 200);
assert.equal(forwarded.url, "https://api.fish.audio/v1/tts");
assert.equal(forwarded.options.headers.Authorization, "Bearer fish-test-key");
assert.equal(forwarded.options.headers.model, "s2.1-pro-free");
assert.deepEqual(JSON.parse(forwarded.options.body), {
  text: "你好",
  reference_id: "fish-reference-id",
  format: "mp3",
});
assert.deepEqual([...success.body], [1, 2, 3]);

console.log("speech bridge tests passed");
