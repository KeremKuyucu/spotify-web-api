import { NextResponse } from "next/server"
import { createSpotifyApiInstance, scopes } from "@/lib/spotify"

export async function GET() {
  try {
    const spotifyApi = createSpotifyApiInstance()
    const LOGIN_URL = spotifyApi.createAuthorizeURL(scopes, "state")
    return NextResponse.redirect(LOGIN_URL)
  } catch (error: any) {
    console.error("Error in /api/auth/login:", error.message)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
