import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'

const INSTANCE_URL      = 'https://orgfarm-0786059127.test1.my.pc-rnd.salesforce.com'
const CDP_URL           = 'https://g-zt9nzrmmzw0nzsg5sdkn3bh1.pc-rnd.c360a.salesforce.com'
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
    plugins: [react(), tailwindcss()],
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
                  // CDP rejects requests that carry browser Origin headers
                  proxyReq.removeHeader('origin')
                  proxyReq.removeHeader('referer')
                })
              },
            },
          }
        : undefined,
    },
  }
})
