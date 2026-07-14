/**
 * Production server for luminus-demo-site.
 *
 * Serves the Vite-built static files and proxies /services/* → Salesforce org
 * and /cdp-api/* → Data Cloud tenant, injecting server-side Bearer tokens so
 * credentials never reach the browser.
 *
 * Required environment variables:
 *   SF_INSTANCE_URL   e.g. https://orgfarm-0786059127.test1.my.pc-rnd.salesforce.com
 *   SF_CDP_URL        e.g. https://g-zt9nzrmmzw0nzsg5sdkn3bh1.pc-rnd.c360a.salesforce.com
 *   SF_CLIENT_ID      Connected App consumer key
 *   SF_USERNAME       API user login
 *   SF_PRIVATE_KEY    Full PEM string (newlines as \n or literal)
 */

import http from 'http'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import crypto from 'crypto'
import https from 'https'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Credentials ─────────────────────────────────────────────────────────────

const INSTANCE_URL = (process.env.SF_INSTANCE_URL || '').replace(/\/$/, '')
const CDP_URL      = (process.env.SF_CDP_URL      || '').replace(/\/$/, '')
const CLIENT_ID    = process.env.SF_CLIENT_ID    || ''
const USERNAME     = process.env.SF_USERNAME     || ''
// Accept both literal newlines and escaped \n (common when pasting PEM into env var fields)
const PRIVATE_KEY  = (process.env.SF_PRIVATE_KEY || '').replace(/\\n/g, '\n')

if (!INSTANCE_URL || !CDP_URL || !CLIENT_ID || !USERNAME || !PRIVATE_KEY) {
  console.error('[server] Missing required env vars: SF_INSTANCE_URL, SF_CDP_URL, SF_CLIENT_ID, SF_USERNAME, SF_PRIVATE_KEY')
  process.exit(1)
}

// ── Token helpers ────────────────────────────────────────────────────────────

let _coreCache = null  // { token, fetchedAt }
let _cdpCache  = null

function makeJWT() {
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: CLIENT_ID,
    sub: USERNAME,
    aud: `${INSTANCE_URL}/services/oauth2/token`,
    exp: Math.floor(Date.now() / 1000) + 300,
  })).toString('base64url')
  const input = `${header}.${payload}`
  const signer = crypto.createSign('SHA256')
  signer.update(input)
  return `${input}.${signer.sign(PRIVATE_KEY, 'base64url')}`
}

function postForm(url, params, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString()
    const u    = new URL(url)
    const opts = {
      hostname: u.hostname,
      port:     u.port || 443,
      path:     u.pathname + u.search,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        ...extraHeaders,
      },
    }
    const req = https.request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) }
        catch { reject(new Error(`Non-JSON response: ${raw.slice(0, 200)}`)) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function getCoreToken() {
  const now = Date.now()
  if (_coreCache && now - _coreCache.fetchedAt < 4 * 60 * 1000) return _coreCache.token
  const resp = await postForm(`${INSTANCE_URL}/services/oauth2/token`, {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion:  makeJWT(),
  })
  if (!resp.access_token) throw new Error(`Core token failed: ${JSON.stringify(resp)}`)
  _coreCache = { token: resp.access_token, fetchedAt: now }
  console.log('[server] core token refreshed')
  return resp.access_token
}

async function getCdpToken() {
  const now = Date.now()
  if (_cdpCache && now - _cdpCache.fetchedAt < 4 * 60 * 1000) return _cdpCache.token
  const core = await getCoreToken()
  const resp = await postForm(`${INSTANCE_URL}/services/a360/token`, {
    grant_type:        'urn:salesforce:grant-type:external:cdp',
    subject_token:     core,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
  }, { Authorization: `Bearer ${core}` })
  if (!resp.access_token) throw new Error(`CDP token failed: ${JSON.stringify(resp)}`)
  _cdpCache = { token: resp.access_token, fetchedAt: now }
  console.log('[server] CDP token refreshed')
  return resp.access_token
}

// ── Express app ──────────────────────────────────────────────────────────────

const app = express()

// ── Web event tracker ────────────────────────────────────────────────────────
// POSTs a single page-view / click event to the LMN_WebEvents_CRM ingest stream.
// Always responds 2xx so the browser never sees an error from tracking.
// express.json() is scoped to this route only — applying it globally would consume
// the request body before http-proxy-middleware can forward it to /cdp-api.

function httpsPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u    = new URL(url)
    const buf  = Buffer.from(JSON.stringify(body))
    const opts = {
      hostname: u.hostname,
      port:     u.port || 443,
      path:     u.pathname + u.search,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': buf.length, ...headers },
    }
    const req = https.request(opts, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => resolve({ status: res.statusCode, body: raw }))
    })
    req.on('error', reject)
    req.write(buf)
    req.end()
  })
}

app.post('/track', express.json(), async (req, res) => {
  const { session_id, email, page_url, page_category, event_type } = req.body ?? {}
  try {
    const cdpToken = await getCdpToken()
    const event = {
      event_id:      crypto.randomUUID(),
      session_id:    session_id    ?? '',
      email:         email         ?? '',
      page_url:      page_url      ?? '',
      page_category: page_category ?? '',
      event_type:    event_type    ?? 'page_view',
      event_time:    new Date().toISOString(),
    }
    const ingest = await httpsPost(
      `${CDP_URL}/api/v1/ingest/sources/LMN_WebEvents_CRM`,
      { data: [event] },
      { Authorization: `Bearer ${cdpToken}` },
    )
    if (ingest.status >= 400) {
      console.warn('[track] CDP', ingest.status, ingest.body.slice(0, 200))
    } else {
      console.log('[track]', event_type, page_url, email || '(anon)')
    }
  } catch (e) {
    console.warn('[track] error:', e.message)
  }
  res.json({ ok: true })
})

// Strip browser cookies from all API proxy routes early — the c360a Web SDK accumulates
// cookies on the same domain and the browser sends them with every fetch, which can push
// total header size past Node's limit and cause HTTP 431 before the proxy even runs.
function stripCookies(req, _res, next) { delete req.headers.cookie; next() }

// Inject core Bearer token then proxy to Salesforce org.
// Express strips the /services mount prefix from req.url, so we rewrite it back
// otherwise requests hit /data/v62.0/... instead of /services/data/v62.0/...
app.use('/services', stripCookies, async (req, res, next) => {
  try { req._sfToken = await getCoreToken() } catch (e) { return res.status(502).json({ error: e.message }) }
  next()
}, createProxyMiddleware({
  target:       INSTANCE_URL,
  changeOrigin: true,
  secure:       true,
  pathRewrite:  { '^': '/services' },
  on: {
    proxyReq: (proxyReq, req) => proxyReq.setHeader('Authorization', `Bearer ${req._sfToken}`),
  },
}))

// Inject CDP Bearer token then proxy to Data Cloud tenant
app.use('/cdp-api', stripCookies, async (req, res, next) => {
  try { req._cdpToken = await getCdpToken() } catch (e) { return res.status(502).json({ error: e.message }) }
  next()
}, createProxyMiddleware({
  target:       CDP_URL,
  changeOrigin: true,
  secure:       true,
  pathRewrite:  { '^/cdp-api': '' },
  on: {
    proxyReq: (proxyReq, req) => {
      proxyReq.setHeader('Authorization', `Bearer ${req._cdpToken}`)
      proxyReq.removeHeader('origin')
      proxyReq.removeHeader('referer')
    },
  },
}))

// Static files + SPA fallback
const DIST = join(__dirname, 'dist')
app.use(express.static(DIST))
app.get('*', (_req, res) => res.sendFile(join(DIST, 'index.html')))

// ── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '8080', 10)
// Set maxHeaderSize in-process so it takes effect regardless of the start command
http.createServer({ maxHeaderSize: 65536 }, app).listen(PORT, () => {
  console.log(`[server] luminus-demo running on http://0.0.0.0:${PORT}`)
  console.log(`[server] org: ${INSTANCE_URL}`)
  getCoreToken().catch(e => console.warn('[server] token warm-up failed:', e.message))
})
