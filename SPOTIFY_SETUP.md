# Spotify "now playing" setup

The radio shows what you are listening to using the same Spotify Web API calls as
alagappan17/spotify-react-widget, but the keys stay on the server (that repo hard-codes them in
browser code, which exposes them — don't copy that).

1. https://developer.spotify.com/dashboard → Create app. Redirect URI: `http://127.0.0.1:8888/callback`.
2. Open this URL (replace CLIENT_ID), approve, and copy the `code` from the redirected address:
   `https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-currently-playing%20user-read-recently-played`
3. Exchange it for a refresh token:
   ```
   curl -X POST https://accounts.spotify.com/api/token \
     -u CLIENT_ID:CLIENT_SECRET \
     -d grant_type=authorization_code -d code=THE_CODE \
     -d redirect_uri=http://127.0.0.1:8888/callback
   ```
4. Put `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` in `.env` (see `.env.example`),
   restart `npm run dev`. In production set the same three variables on the host.

Until these are set, the music panel simply says it isn't connected and tapping the radio still plays
the playlist set by `SPOTIFY_EMBED` in the scene file.
