import { NextResponse } from "next/server"
import { createSpotifyApiInstance } from "@/lib/spotify"

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  const accessToken = req.headers.get("Authorization")?.split(" ")[1]

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const spotifyApi = createSpotifyApiInstance()
  spotifyApi.setAccessToken(accessToken)

  try {
    let responseBody: any
    let statusCode = 200

    if (path === "me/player") {
      const data = await spotifyApi.getMyCurrentPlaybackState()
      responseBody = data.body
      if (Object.keys(responseBody).length === 0) {
        statusCode = 204 // No content
      }
    } else if (path === "me/player/devices") {
      const data = await spotifyApi.getMyDevices()
      responseBody = data.body
    } else {
      // Genel bir Spotify API çağrısı için
      // spotify-web-api-node'da getGeneric veya benzeri bir metod yok,
      // bu yüzden sadece bilinen endpoint'leri işliyoruz.
      // Eğer daha fazla genel endpoint'e ihtiyacınız varsa, buraya eklemelisiniz.
      return NextResponse.json(
        { error: "Not Found", details: `Unknown GET endpoint: /api/spotify/${path}` },
        { status: 404 },
      )
    }

    return NextResponse.json(responseBody, { status: statusCode })
  } catch (error: any) {
    console.error(`Error fetching Spotify API for ${path}:`, error)
    return NextResponse.json(
      { error: error.message || "Spotify API error", details: error.body || null },
      { status: error.statusCode || 500 },
    )
  }
}

export async function PUT(req: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  const accessToken = req.headers.get("Authorization")?.split(" ")[1]
  const body = await req.json().catch(() => ({}))

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const spotifyApi = createSpotifyApiInstance()
  spotifyApi.setAccessToken(accessToken)

  try {
    let response: any
    const statusCode = 204 // Spotify API often returns 204 No Content for successful PUTs

    if (path === "me/player/play") {
      response = await spotifyApi.play({ device_id: body.device_id })
    } else if (path === "me/player/pause") {
      response = await spotifyApi.pause({ device_id: body.device_id })
    } else if (path === "me/player/volume") {
      const url = new URL(req.url)
      const volumePercent = url.searchParams.get("volume_percent")
      if (volumePercent) {
        response = await spotifyApi.setVolume(Number.parseInt(volumePercent), { device_id: body.device_id })
      } else {
        throw new Error("Volume percentage missing for volume control.")
      }
    } else if (path === "me/player/transfer") {
      if (!body.device_ids || body.device_ids.length === 0) {
        return NextResponse.json({ error: "Device IDs are required for transfer playback" }, { status: 400 })
      }
      response = await spotifyApi.transferMyPlayback(body.device_ids, { play: body.play })
    } else if (path === "me/player/seek") {
      // Yeni seek endpoint'i
      if (typeof body.position_ms !== "number") {
        return NextResponse.json({ error: "position_ms is required for seeking" }, { status: 400 })
      }
      response = await spotifyApi.seek(body.position_ms, { device_id: body.device_id })
    } else {
      return NextResponse.json(
        { error: "Not Found", details: `Unknown PUT endpoint: /api/spotify/${path}` },
        { status: 404 },
      )
    }

    return NextResponse.json(response?.body || {}, { status: response?.statusCode || statusCode })
  } catch (error: any) {
    console.error(`Error putting to Spotify API for ${path}:`, error)
    return NextResponse.json(
      { error: error.message || "Spotify API error", details: error.body || null },
      { status: error.statusCode || 500 },
    )
  }
}

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/")
  const accessToken = req.headers.get("Authorization")?.split(" ")[1]
  const body = await req.json().catch(() => ({}))

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const spotifyApi = createSpotifyApiInstance()
  spotifyApi.setAccessToken(accessToken)

  try {
    let response: any
    const statusCode = 204 // Spotify API often returns 204 No Content for successful POSTs

    if (path === "me/player/next") {
      response = await spotifyApi.skipToNext({ device_id: body.device_id })
    } else if (path === "me/player/previous") {
      response = await spotifyApi.skipToPrevious({ device_id: body.device_id })
    } else {
      return NextResponse.json(
        { error: "Not Found", details: `Unknown POST endpoint: /api/spotify/${path}` },
        { status: 404 },
      )
    }
    return NextResponse.json(response?.body || {}, { status: response?.statusCode || statusCode })
  } catch (error: any) {
    console.error(`Error posting to Spotify API for ${path}:`, error)
    return NextResponse.json(
      { error: error.message || "Spotify API error", details: error.body || null },
      { status: error.statusCode || 500 },
    )
  }
}
