import { NextResponse } from "next/server"
import { createSpotifyApiInstance } from "@/lib/spotify"
import { db } from "@/lib/firebase"

export async function POST(req: Request) {
  // X-User-App-Token başlığını kontrol et
  const userAppToken = req.headers.get("X-User-App-Token")
  const { action, payload } = await req.json()

  if (!userAppToken) {
    return NextResponse.json({ error: "User App Token missing" }, { status: 401 })
  }

  // User App Token'ı kullanarak Firebase'deki userTokens koleksiyonunda ilgili belgeyi bul
  // userAppToken artık belge ID'si değil, belgenin içindeki bir alan.
  const querySnapshot = await db.collection("userTokens").where("userAppToken", "==", userAppToken).limit(1).get()

  if (querySnapshot.empty) {
    return NextResponse.json(
      {
        error:
          "Invalid User App Token or token not found. Please log in via the web app first to generate a valid token.",
      },
      { status: 401 },
    )
  }

  const docSnap = querySnapshot.docs[0]
  const spotifyRefreshToken = docSnap.data()?.refreshToken

  if (!spotifyRefreshToken) {
    return NextResponse.json(
      { error: "Spotify refresh token is empty for this User App Token. Please log in via the web app first." },
      { status: 400 },
    )
  }

  const spotifyApi = createSpotifyApiInstance()
  spotifyApi.setRefreshToken(spotifyRefreshToken)

  try {
    // Access token'ı yenile
    const refreshData = await spotifyApi.refreshAccessToken()
    const spotifyAccessToken = refreshData.body.access_token
    spotifyApi.setAccessToken(spotifyAccessToken)

    let responseBody: any
    let statusCode = 200

    switch (action) {
      case "getPlaybackState":
        const playbackState = await spotifyApi.getMyCurrentPlaybackState()
        responseBody = playbackState.body
        if (Object.keys(responseBody).length === 0) {
          statusCode = 204 // No content
        }
        break
      case "getDevices":
        const devices = await spotifyApi.getMyDevices()
        responseBody = devices.body
        break
      case "play":
        await spotifyApi.play(payload)
        statusCode = 204
        break
      case "pause":
        await spotifyApi.pause(payload)
        statusCode = 204
        break
      case "next":
        await spotifyApi.skipToNext(payload)
        statusCode = 204
        break
      case "previous":
        await spotifyApi.skipToPrevious(payload)
        statusCode = 204
        break
      case "setVolume":
        await spotifyApi.setVolume(payload.volume_percent, { device_id: payload.device_id })
        statusCode = 204
        break
      case "transferPlayback":
        if (!payload.device_ids || payload.device_ids.length === 0) {
          return NextResponse.json({ error: "Device IDs are required for transfer playback" }, { status: 400 })
        }
        await spotifyApi.transferMyPlayback(payload.device_ids, { play: payload.play })
        statusCode = 204
        break
      case "logout": // Logout aksiyonu
        // Kullanıcının Spotify ID'sini bulup o belgeyi silmeliyiz
        // Bu durumda, userAppToken'dan spotifyUserId'yi alıp silme işlemi yapmalıyız.
        // Ancak, bu endpoint'e sadece userAppToken geldiği için,
        // logout işlemi için spotifyUserId'yi de Firebase'den çekmemiz gerekir.
        // Veya logout işlemini sadece web arayüzünden yapmasını bekleyebiliriz.
        // Şimdilik, sadece refresh token'ı silmek yerine, tüm belgeyi silmek için
        // belge referansını kullanabiliriz.
        await docSnap.ref.delete() // Bulunan belgeyi sil
        responseBody = { message: "Logged out successfully." }
        statusCode = 200
        break
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json(responseBody, { status: statusCode })
  } catch (error: any) {
    console.error(`Error in /api/control for action ${action}:`, error)
    return NextResponse.json(
      { error: error.message || "Internal Server Error", details: error.body || null },
      { status: error.statusCode || 500 },
    )
  }
}
