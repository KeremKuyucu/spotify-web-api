import SpotifyWebApi from "spotify-web-api-node"

export const scopes: string[] = [
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
]

export function createSpotifyApiInstance() {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Spotify API ortam değişkenleri eksik. Lütfen SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET ve SPOTIFY_REDIRECT_URI'yi Vercel ortam değişkenlerinde ayarlayın.",
    )
  }

  return new SpotifyWebApi({
    clientId,
    clientSecret,
    redirectUri,
  })
}
