// Server-side Spotify "now playing" lookup.
// Credentials come from environment variables and never reach the browser:
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN   (see SPOTIFY_SETUP.md)
let cached = { token: null, expires: 0 }

async function accessToken(env) {
  if (cached.token && Date.now() < cached.expires - 30_000) return cached.token
  const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN })
  })
  if (!r.ok) throw new Error(`token ${r.status}`)
  const j = await r.json()
  cached = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 }
  return cached.token
}

const shape = (item, isPlaying, progressMs) => ({
  configured: true, isPlaying, progressMs: progressMs || 0, durationMs: item.duration_ms,
  title: item.name, artist: item.artists.map(a => a.name).join(', '),
  albumImageUrl: item.album?.images?.[1]?.url || item.album?.images?.[0]?.url || null,
  songUrl: item.external_urls?.spotify || null
})

export async function nowPlaying(env = process.env) {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) return { configured: false }
  try {
    const token = await accessToken(env)
    const headers = { Authorization: `Bearer ${token}` }
    const now = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers })
    if (now.status === 200) {
      const d = await now.json()
      if (d.item) return shape(d.item, d.is_playing, d.progress_ms)
    }
    // nothing playing: fall back to the last track she played
    const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers })
    if (recent.ok) {
      const d = await recent.json()
      if (d.items?.[0]) return shape(d.items[0].track, false, 0)
    }
    return { configured: true, isPlaying: false }
  } catch (e) {
    return { configured: false, error: String(e.message || e) }
  }
}
