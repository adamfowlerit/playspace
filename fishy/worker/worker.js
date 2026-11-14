// Fishy Friends bot brain: Cloudflare Worker using Workers AI.
// POST /talk  (multipart form: audio=WAV, bot, zone, player, history=JSON)  ->  {heard, reply}
// Needs an AI binding named "AI" (Worker > Settings > Bindings > Add > Workers AI).

const ALLOWED_ORIGINS = ['https://adamfowlerit.github.io'];
const STT_MODEL = '@cf/openai/whisper';
const CHAT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const LIMIT = 20, WINDOW_MS = 10 * 60 * 1000;   // max chats per player IP per 10 minutes
const hits = new Map();                         // simple per-instance rate limit

const clean = (v, n = 40) => String(v || '').replace(/[^\p{L}\p{N} '\-!?.,]/gu, '').slice(0, n).trim();

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'fishy-friends-bots' });
    if (req.method !== 'POST' || url.pathname !== '/talk') return json({ error: 'not found' }, 404);
    if (!ok) return json({ error: 'forbidden' }, 403);

    // rate limit
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
    if (list.length >= LIMIT) return json({ error: 'rate limit' }, 429);
    list.push(now); hits.set(ip, list);

    let form;
    try { form = await req.formData(); } catch { return json({ error: 'bad request' }, 400); }
    const audio = form.get('audio');
    if (!audio || typeof audio === 'string' || audio.size > 800000) return json({ error: 'bad audio' }, 400);

    // 1) speech to text
    let heard = '';
    try {
      const stt = await env.AI.run(STT_MODEL, { audio: [...new Uint8Array(await audio.arrayBuffer())] });
      heard = String(stt?.text || '').trim().slice(0, 300);
    } catch (e) { return json({ error: 'speech failed' }, 502); }
    if (!heard) return json({ heard: '', reply: "Sorry, I didn't catch that. Can you say it again?" });

    // 2) kid-safe reply in character
    const bot = clean(form.get('bot')) || 'Buddy';
    const zone = clean(form.get('zone')) || 'Sunny Cove';
    const player = clean(form.get('player'), 12) || 'friend';
    let history = [];
    try { history = JSON.parse(String(form.get('history') || '[]')).slice(-6); } catch {}

    const system = `You are ${bot}, a friendly cartoon gorilla bot in a kids' fishing game called Fishy Friends. You are fishing at ${zone}. ` +
      `You are a computer bot, not a real person, and you say so if asked. You are talking with a player called ${player}, who is probably a child. ` +
      `Reply in one or two short, cheerful sentences, under 35 words, using simple words. Talk about fishing, the fish in the game, nature, silly jokes and having fun. ` +
      `Game tips you know: hold to charge a cast and let go, click when the bobber dips, hold to reel but let go when the fish pulls or the line snaps, ` +
      `longer casts find rarer fish, better rods cast further, better bait finds rarer fish, the Travel board unlocks new places. ` +
      `Never ask for or repeat personal information such as real names, age, address, school, phone numbers or passwords, and tell them to keep those secret if they share them. ` +
      `Never talk about anything scary, violent, rude, romantic or grown-up; if asked, kindly change the subject back to fishing. ` +
      `Do not use emojis, lists or special characters, because your reply is read out loud.`;
    const messages = [{ role: 'system', content: system }];
    for (const h of history) {
      const t = String(h?.t || '').slice(0, 300);
      if (t) messages.push({ role: h?.r === 'b' ? 'assistant' : 'user', content: t });
    }
    messages.push({ role: 'user', content: heard });

    let reply = '';
    try {
      const out = await env.AI.run(CHAT_MODEL, { messages, max_tokens: 90, temperature: 0.7 });
      reply = String(out?.response || '').replace(/[*_#`]/g, '').trim().slice(0, 300);
    } catch (e) { return json({ error: 'reply failed', heard }, 502); }

    return json({ heard, reply: reply || "Let's keep fishing!" });
  },
};
