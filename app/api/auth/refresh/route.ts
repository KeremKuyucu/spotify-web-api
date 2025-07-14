import { NextResponse } from "next/server"
import { createSpotifyApiInstance } from "@/lib/spotify"

export async function POST(req: Request) {
  const { refreshToken } = await req.json()

  console.log("Refresh API received request. Refresh token:", refreshToken ? "present" : "missing")

  if (!refreshToken) {
    console.error("Refresh token missing in request body.")
    return NextResponse.json({ error: "Refresh token missing" }, { status: 400 })
  }

  try {
    const spotifyApi = createSpotifyApiInstance()
    spotifyApi.setRefreshToken(refreshToken)

    const data = await spotifyApi.refreshAccessToken()
    const { access_token, expires_in } = data.body

    console.log("Successfully refreshed token. New access token length:", access_token.length)

    return NextResponse.json({
      accessToken: access_token,
      expiresIn: expires_in,
    })
  } catch (error: any) {
    console.error("Error refreshing Spotify access token:", error.message, error.body)
    return NextResponse.json({ error: error.message || "Failed to refresh token" }, { status: error.statusCode || 500 })
  }
}
