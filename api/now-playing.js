// Vercel / serverless entry — same logic as the dev middleware in vite.config.js
import { nowPlaying } from '../server/now-playing.mjs'

export default async function handler(req, res) {
  const data = await nowPlaying(process.env)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json(data)
}
