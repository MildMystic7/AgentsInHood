# Vercel migration checklist

The production website must be imported from:

- GitHub owner: `MildMystic7`
- Repository: `AgentsInHood`
- Production branch: `main`
- Framework preset: `Next.js`
- Root directory: repository root

## 1. Create and import

1. Sign in to the new MildMystic Vercel account.
2. Connect the `MildMystic7` GitHub account.
3. Import `MildMystic7/AgentsInHood`.
4. Keep the default Next.js build command (`npm run build`) and output settings.
5. Do not change the root directory to `worker`; `.vercelignore` already excludes it.

## 2. Required production variable

```env
NEXT_PUBLIC_SITE_URL=https://www.agentsinhood.xyz
```

Add this to Production, Preview, and Development.

## 3. Optional website services

Add only the services currently in use:

```env
ARENA_LIVE_LLM=false
KV_REST_API_URL=
KV_REST_API_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
NOTIFY_SECRET=
NEXT_PUBLIC_TELEGRAM_URL=
```

The mainnet private key and Uniswap API key belong only in the Railway worker. They must never be
added to Vercel.

After the Railway worker is deployed and its public status endpoint is verified, add this
server-only variable:

```env
MAINNET_WORKER_STATUS_URL=https://YOUR-WORKER/mainnet/status
```

## 4. Validate before moving the domain

Open the generated Vercel preview URL and confirm:

- `/` loads the arena.
- `/docs` loads.
- `/verify` says `Preparing mainnet pilot` or `Mainnet dry run`, never `Live` prematurely.
- `/api/agents/summary` returns JSON.
- `/api/agents/history` returns JSON.
- `/api/mainnet/status` returns JSON and exposes no secret.
- Page source and network responses contain no private key.

## 5. Move the domain

1. Remove `agentsinhood.xyz` and `www.agentsinhood.xyz` from the previous Vercel project.
2. Add both domains to the new MildMystic Vercel project.
3. Make `www.agentsinhood.xyz` the primary domain.
4. Redirect the apex domain to `www`.
5. Apply the exact DNS records Vercel shows in the new project.
6. Wait for Vercel to show `Valid Configuration` and issue TLS certificates.

Do not delete the old project until the custom domain, `/verify`, and the API routes have all been
checked in production.
