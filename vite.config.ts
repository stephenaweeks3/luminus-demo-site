import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'
import https from 'https'
import { randomUUID } from 'crypto'

const INSTANCE_URL      = 'https://orgfarm-6687f3a8e3.test1.my.pc-rnd.salesforce.com'
const CDP_URL           = 'https://mftdcmrzgyytcmjtmmztqyzxmm.pc-rnd.c360a.salesforce.com'
const INGEST_OBJ        = 'LmnWebeventsCrm'
const INGEST_SOURCE     = 'LMN_WebEvents_CRM'
const CORE_TOKEN_SCRIPT = path.resolve(__dirname, '../scripts/_get_core_token.py')
const CDP_TOKEN_SCRIPT  = path.resolve(__dirname, '../scripts/_get_cdp_token.py')

interface TokenCache { token: string; fetchedAt: number }
let _coreCache: TokenCache | null = null
let _cdpCache:  TokenCache | null = null

function mintToken(script: string, cache: TokenCache | null, label: string): { token: string; cache: TokenCache | null } {
  const now = Date.now()
  if (cache && now - cache.fetchedAt < 4 * 60 * 1000) return { token: cache.token, cache }
  try {
    const tok = execSync(`python3 "${script}"`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    if (!tok) throw new Error('empty token')
    console.log(`[vite] ${label} token refreshed`)
    const newCache = { token: tok, fetchedAt: now }
    return { token: tok, cache: newCache }
  } catch (e) {
    console.warn(`[vite] ${label} token refresh failed:`, e)
    // Don't cache failures — retry on next request rather than serving empty token for 4 min
    return { token: cache?.token ?? '', cache: cache ?? null }
  }
}

function getCoreToken(): string {
  const { token, cache } = mintToken(CORE_TOKEN_SCRIPT, _coreCache, 'core')
  _coreCache = cache
  return token
}

function getCdpToken(): string {
  const { token, cache } = mintToken(CDP_TOKEN_SCRIPT, _cdpCache, 'CDP')
  _cdpCache = cache
  return token
}

function httpRequest(
  method: string, urlStr: string, token: string,
  body: unknown, contentType = 'application/json'
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body)
    const buf = Buffer.from(payload, 'utf-8')
    const u = new URL(urlStr)
    const req = https.request({
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search, method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType, 'Content-Length': buf.length },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString()
        try { resolve(JSON.parse(text) as Record<string, unknown>) } catch { resolve({}) }
      })
    })
    req.on('error', reject)
    req.end(buf)
  })
}

async function ingestEvent(evt: Record<string, string>): Promise<void> {
  const token = getCdpToken()
  const eventId = randomUUID()
  const eventTime = new Date().toISOString()
  const job = await httpRequest('POST', `${CDP_URL}/api/v1/ingest/jobs`, token, {
    object: INGEST_OBJ, sourceName: INGEST_SOURCE, operation: 'upsert',
  })
  const jobId = (job as { id?: string }).id
  if (!jobId) { console.warn('[track] no jobId:', JSON.stringify(job)); return }
  const fields = [eventId, evt.session_id, evt.email, evt.page_url, evt.page_category, evt.event_type, eventTime]
  const csv = `event_id,session_id,email,page_url,page_category,event_type,event_time\r\n` +
    fields.map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n'
  await httpRequest('PUT', `${CDP_URL}/api/v1/ingest/jobs/${jobId}/batches`, token, csv, 'text/csv')
  await httpRequest('PATCH', `${CDP_URL}/api/v1/ingest/jobs/${jobId}`, token, { state: 'UploadComplete' })
  console.log(`[track] ingested ${evt.event_type} for ${evt.email} → job ${jobId}`)
}

const trackPlugin = {
  name: 'lmn-track',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/track', (req: any, res: any) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
      let raw = ''
      req.on('data', (c: Buffer) => { raw += c.toString() })
      req.on('end', () => {
        res.statusCode = 202
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
        try {
          const evt = JSON.parse(raw) as Record<string, string>
          ingestEvent(evt).catch(e => console.warn('[track] ingest error:', e))
        } catch (e) {
          console.warn('[track] body parse error:', e)
        }
      })
    })
  },
}

export default defineConfig(() => {
  const initialToken = getCoreToken()
  const hasOrg = Boolean(initialToken)

  if (hasOrg) {
    console.log(`[vite] org: ${INSTANCE_URL}`)
  } else {
    console.warn('[vite] could not obtain org token — proxying disabled')
  }

  return {
    base: './',
    plugins: [react(), tailwindcss(), trackPlugin],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: Number(process.env.PORT ?? 3000),
      strictPort: false,
      open: true,
      proxy: hasOrg
        ? {
            '/services': {
              target: INSTANCE_URL,
              changeOrigin: true,
              secure: true,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${getCoreToken()}`)
                  proxyReq.removeHeader('cookie')
                })
              },
            },
            '/cdp-api': {
              target: CDP_URL,
              changeOrigin: true,
              secure: true,
              rewrite: (p) => p.replace(/^\/cdp-api/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${getCdpToken()}`)
                  proxyReq.removeHeader('origin')
                  proxyReq.removeHeader('referer')
                  proxyReq.removeHeader('cookie')
                })
              },
            },
          }
        : undefined,
    },
    preview: {
      port: Number(process.env.PORT ?? 4173),
      strictPort: false,
      proxy: hasOrg
        ? {
            '/services': {
              target: INSTANCE_URL,
              changeOrigin: true,
              secure: true,
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${getCoreToken()}`)
                  proxyReq.removeHeader('cookie')
                })
              },
            },
            '/cdp-api': {
              target: CDP_URL,
              changeOrigin: true,
              secure: true,
              rewrite: (p) => p.replace(/^\/cdp-api/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Authorization', `Bearer ${getCdpToken()}`)
                  proxyReq.removeHeader('origin')
                  proxyReq.removeHeader('referer')
                  proxyReq.removeHeader('cookie')
                })
              },
            },
          }
        : undefined,
    },
  }
})
