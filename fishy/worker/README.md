# Fishy Friends bot brain (Cloudflare Worker)

Lets players talk to the 🤖 bots with their voice. The game records a short clip, this Worker turns it
into text with Whisper, then a Llama model writes a short kid-safe reply. Both run on Cloudflare
Workers AI, which has a free daily allowance (10,000 "neurons" per day).

## Deploy (Cloudflare dashboard, no command line needed)

1. Sign up / log in at https://dash.cloudflare.com (the free plan is fine).
2. Go to **Workers & Pages** → **Create** → **Create Worker**. Name it `fishy-bots` and click **Deploy**.
3. Click **Edit code**, delete the sample code, paste in everything from `worker.js`, then **Deploy**.
4. Go to the Worker's **Settings** → **Bindings** → **Add** → **Workers AI**. Set the variable name to `AI` and save.
5. Copy the Worker's address, e.g. `https://fishy-bots.<your-subdomain>.workers.dev`.
   Opening it in a browser should show `{"ok":true,...}`.
6. Put that address into `AI_URL` near the "VOICE CHAT WITH BOTS" section of `fishy/index.html`
   (or ask Claude to do it).

## Notes
- Only requests from `https://adamfowlerit.github.io` are accepted (change `ALLOWED_ORIGINS` if the game moves).
- Each player IP is limited to 20 chats per 10 minutes (per Worker instance) so the free allowance isn't burnt.
- If the daily free allowance runs out, bot chat stops until it resets (midnight UTC); the game keeps working.
- Usage shows in the Cloudflare dashboard under **AI** → **Workers AI**.
