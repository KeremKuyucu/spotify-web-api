import { NextResponse } from "next/server"
import { createSpotifyApiInstance } from "@/lib/spotify"
import { db } from "@/lib/firebase"
import crypto from "crypto"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code) {
    return NextResponse.json({ error: "Authorization code missing" }, { status: 400 })
  }

  try {
    const spotifyApi = createSpotifyApiInstance()
    const data = await spotifyApi.authorizationCodeGrant(code)
    const { access_token, refresh_token, expires_in } = data.body

    // Spotify kullanıcı bilgilerini al
    spotifyApi.setAccessToken(access_token)
    const userProfile = await spotifyApi.getMe()
    const spotifyUserId = userProfile.body.id
    const userEmail = userProfile.body.email || null // E-posta adresini al

    // Her kullanıcı için benzersiz bir uygulama token'ı oluştur
    const userAppToken = crypto.randomBytes(32).toString("hex") // 64 karakterli hex string

    // Refresh token, userAppToken ve e-postayı Firebase'e kaydet
    // Belge ID'si olarak Spotify kullanıcı ID'sini kullanıyoruz.
    // Bu, aynı kullanıcının tekrar giriş yapması durumunda mevcut kaydın üzerine yazılmasını sağlar.
    await db.collection("userTokens").doc(spotifyUserId).set({
      refreshToken: refresh_token,
      userAppToken: userAppToken, // Yeni oluşturulan token'ı kaydet
      email: userEmail, // E-posta adresini kaydet
      lastUpdated: new Date(),
    })

    // Tarayıcıyı token'larla ve userAppToken ile ana sayfaya yönlendir
    const redirectUrl = new URL("/", url.origin)
    redirectUrl.searchParams.set("access_token", access_token)
    redirectUrl.searchParams.set("refresh_token", refresh_token)
    redirectUrl.searchParams.set("expires_in", expires_in.toString())
    redirectUrl.searchParams.set("user_app_token", userAppToken) // Yeni token'ı ekle

    return NextResponse.redirect(redirectUrl.toString())
  } catch (error: any) {
    console.error("Error during Spotify callback:", error.message)
    const redirectUrl = new URL("/", url.origin)
    redirectUrl.searchParams.set("error", error.message || "Failed to get tokens")
    return NextResponse.redirect(redirectUrl.toString())
  }
}
