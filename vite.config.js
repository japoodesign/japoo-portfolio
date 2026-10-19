import { loadEnv } from 'vite'
import { nowPlaying } from './server/now-playing.mjs'

// Dev-only middleware so /api/now-playing works locally (production uses api/now-playing.js).
// The Spotify keys are read from .env (no VITE_ prefix, so they are never bundled into the browser code).
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: './',
    build: { rollupOptions: { input: { main: 'index.html', studio: 'studio-v13.html', v9: 'studio-v9.html', v8: 'studio-v8.html' } } },
    server: { port: Number(process.env.PORT) || 5173, strictPort: false },
    plugins: [
      {
        name: 'spotify-now-playing',
        configureServer(server) {
          server.middlewares.use('/api/now-playing', async (_req, res) => {
            const data = await nowPlaying(env)
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'no-store')
            res.end(JSON.stringify(data))
          })
        }
      }
    ]
  }
}
