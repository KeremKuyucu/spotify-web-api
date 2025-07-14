"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Loader2,
  Laptop,
  Smartphone,
  Speaker,
  Copy,
  Eye,
  EyeOff,
  VolumeIcon as VolumeUp,
  VolumeIcon as VolumeDown,
  FastForward,
  Rewind,
} from "lucide-react"
import Image from "next/image"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatDuration } from "@/lib/utils"

interface SpotifyDevice {
  id: string
  is_active: boolean
  is_private_session: boolean
  is_restricted: boolean
  name: string
  type: string
  volume_percent: number
}

export default function SpotifyController() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [userAppToken, setUserAppToken] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState<number>(50)
  const [progressMs, setProgressMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const { toast } = useToast()
  const [showUserAppToken, setShowUserAppToken] = useState(false)

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playerPollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Oynatma durumunu getiren ana fonksiyon
  const fetchPlaybackState = useCallback(
    async (token: string) => {
      setError(null)
      try {
        const res = await fetch("/api/spotify/me/player", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (res.status === 204) {
          setCurrentTrack(null)
          setIsPlaying(false)
          setProgressMs(0)
          setDurationMs(0)
          setActiveDeviceId(null)
          // Şarkı yoksa veya duraklatıldıysa progress intervalini temizle
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          return
        }
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(`Failed to fetch playback state: ${errorData.error?.message || res.statusText}`)
        }
        const data = await res.json()

        // Şarkı değiştiyse veya oynatma durumu değiştiyse progress intervalini sıfırla
        if (!currentTrack || data.item.id !== currentTrack.id || data.is_playing !== isPlaying) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
        }

        setCurrentTrack(data.item)
        setIsPlaying(data.is_playing)
        setVolume(data.device?.volume_percent || 0)
        setProgressMs(data.progress_ms || 0)
        setDurationMs(data.item?.duration_ms || 0)
        setActiveDeviceId(data.device?.id || null)

        // Eğer şarkı çalıyorsa ve ilerleme intervali yoksa veya sıfırlandıysa başlat
        if (data.is_playing && !progressIntervalRef.current) {
          const startTime = Date.now() - data.progress_ms // Spotify'dan gelen progress'e göre başlangıç zamanını ayarla
          progressIntervalRef.current = setInterval(() => {
            setProgressMs((prev) => {
              const newProgress = Date.now() - startTime // Yeni progress'i hesapla
              return newProgress < data.item.duration_ms ? newProgress : data.item.duration_ms
            })
          }, 1000) // Her saniye güncelle
        } else if (!data.is_playing && progressIntervalRef.current) {
          // Şarkı duraklatıldıysa veya bittiyse intervali temizle
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      } catch (err: any) {
        console.error("Error fetching playback state:", err)
        setError(err.message || "Failed to fetch current playback state.")
        setCurrentTrack(null)
        setIsPlaying(false)
        setProgressMs(0)
        setDurationMs(0)
        setActiveDeviceId(null)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }
    },
    [currentTrack, isPlaying], // currentTrack ve isPlaying değiştiğinde useCallback'i yenile
  )

  // Cihazları getiren fonksiyon
  const fetchAvailableDevices = useCallback(async (token: string) => {
    setError(null)
    try {
      const res = await fetch("/api/spotify/me/player/devices", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(`Failed to fetch devices: ${errorData.error?.message || res.statusText}`)
      }
      const data = await res.json()
      setAvailableDevices(data.devices || [])
    } catch (err: any) {
      console.error("Error fetching devices:", err)
      setError(err.message || "Failed to fetch available devices.")
      setAvailableDevices([])
    }
  }, [])

  // Player polling'ini başlatan/sıfırlayan yardımcı fonksiyon
  const startPlayerPolling = useCallback(
    (token: string) => {
      if (playerPollingIntervalRef.current) {
        clearInterval(playerPollingIntervalRef.current)
      }
      // Hemen bir kez fetch yap
      fetchPlaybackState(token)
      // Sonra her 5 saniyede bir tekrarla
      playerPollingIntervalRef.current = setInterval(() => {
        fetchPlaybackState(token)
      }, 5000) // 5 saniye
    },
    [fetchPlaybackState],
  )

  const initializeSession = useCallback(
    async (token: string | null, refresh: string | null, appToken: string | null) => {
      try {
        if (token) {
          setAccessToken(token)
          setRefreshToken(refresh)
          setUserAppToken(appToken)
          setIsLoggedIn(true)
          startPlayerPolling(token) // Giriş yapıldığında polling'i başlat
        } else if (refresh) {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken: refresh }),
          })
          if (!refreshRes.ok) {
            const errorText = await refreshRes.text()
            console.error("Refresh API call failed:", refreshRes.status, errorText)
            throw new Error(`Failed to refresh token: ${refreshRes.status} - ${errorText}`)
          }
          const refreshData = await refreshRes.json()
          if (refreshData.accessToken) {
            localStorage.setItem("spotify_access_token", refreshData.accessToken)
            setAccessToken(refreshData.accessToken)
            setRefreshToken(refresh)
            setUserAppToken(appToken)
            setIsLoggedIn(true)
            startPlayerPolling(refreshData.accessToken) // Token yenilendiğinde polling'i başlat
          } else {
            setError("Yenileme token'ı geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.")
            handleLogout()
          }
        } else {
          setIsLoggedIn(false)
        }
      } catch (err) {
        console.error("Error during session initialization:", err)
        setError("Oturum başlatılırken bir hata oluştu. Lütfen tekrar giriş yapın.")
        handleLogout()
      } finally {
        setIsInitialLoading(false)
      }
    },
    [startPlayerPolling], // startPlayerPolling bağımlılığı eklendi
  )

  // URL parametrelerini ve localStorage'ı kontrol eden useEffect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlAccessToken = params.get("access_token")
    const urlRefreshToken = params.get("refresh_token")
    const urlUserAppToken = params.get("user_app_token")
    const urlError = params.get("error")

    if (urlError) {
      setError(urlError)
      setIsInitialLoading(false)
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (urlAccessToken && urlRefreshToken && urlUserAppToken) {
      localStorage.setItem("spotify_access_token", urlAccessToken)
      localStorage.setItem("spotify_refresh_token", urlRefreshToken)
      localStorage.setItem("spotify_user_app_token", urlUserAppToken)
      initializeSession(urlAccessToken, urlRefreshToken, urlUserAppToken)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      const storedAccessToken = localStorage.getItem("spotify_access_token")
      const storedRefreshToken = localStorage.getItem("spotify_refresh_token")
      const storedUserAppToken = localStorage.getItem("spotify_user_app_token")

      if (storedAccessToken || storedRefreshToken || storedUserAppToken) {
        initializeSession(storedAccessToken, storedRefreshToken, storedUserAppToken)
      } else {
        setIsInitialLoading(false)
      }
    }
  }, [initializeSession])

  // Component unmount olduğunda veya bağımlılıklar değiştiğinde tüm intervalleri temizle
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (playerPollingIntervalRef.current) {
        clearInterval(playerPollingIntervalRef.current)
      }
    }
  }, [])

  const handleLogin = () => {
    window.location.href = "/api/auth/login"
  }

  const handleLogout = () => {
    localStorage.removeItem("spotify_access_token")
    localStorage.removeItem("spotify_refresh_token")
    localStorage.removeItem("spotify_user_app_token")
    setAccessToken(null)
    setRefreshToken(null)
    setUserAppToken(null)
    setIsLoggedIn(false)
    setCurrentTrack(null)
    setIsPlaying(false)
    setError(null)
    setAvailableDevices([])
    setActiveDeviceId(null)
    setProgressMs(0)
    setDurationMs(0)
    // Tüm intervalleri temizle
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (playerPollingIntervalRef.current) {
      clearInterval(playerPollingIntervalRef.current)
      playerPollingIntervalRef.current = null
    }
    toast({
      title: "Çıkış Yapıldı",
      description: "Spotify hesabınızın bağlantısı kesildi.",
    })
  }

  const makeSpotifyApiCall = async (endpoint: string, method = "GET", body?: any) => {
    if (!accessToken) {
      setError("Not authenticated. Please log in.")
      return null
    }

    setIsActionLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/spotify/${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (res.status === 401) {
        if (!refreshToken) {
          setError("Refresh token not available. Please log in again.")
          handleLogout()
          return null
        }
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        })
        const refreshData = await refreshRes.json()
        if (refreshData.accessToken) {
          localStorage.setItem("spotify_access_token", refreshData.accessToken)
          setAccessToken(refreshData.accessToken)
          const retryRes = await fetch(`/api/spotify/${endpoint}`, {
            method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshData.accessToken}`,
            },
            body: body ? JSON.stringify(body) : undefined,
          })
          if (!retryRes.ok) {
            const errorData = await retryRes.json()
            throw new Error(`Spotify API retry failed: ${errorData.error?.message || retryRes.statusText}`)
          }
          return retryRes
        } else {
          setError("Failed to refresh token. Please log in again.")
          handleLogout()
          return null
        }
      }

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(`Spotify API error: ${errorData.error?.message || res.statusText}`)
      }

      return res
    } catch (err: any) {
      console.error("Spotify API call failed:", err)
      setError(err.message || "An unknown error occurred with Spotify API.")
      return null
    } finally {
      setIsActionLoading(false)
    }
  }

  // Oynatma kontrol fonksiyonları
  const togglePlayback = async () => {
    setError(null)
    const originalIsPlaying = isPlaying
    setIsPlaying(!isPlaying) // Optimistic update
    const res = await makeSpotifyApiCall(`me/player/${originalIsPlaying ? "pause" : "play"}`, "PUT", {
      device_id: activeDeviceId,
    })
    if (!res?.ok) {
      setIsPlaying(originalIsPlaying) // Revert on error
    }
    if (accessToken) startPlayerPolling(accessToken) // Eylem sonrası polling'i sıfırla
  }

  const skipToNext = async () => {
    setError(null)
    const res = await makeSpotifyApiCall("me/player/next", "POST", { device_id: activeDeviceId })
    if (res?.ok) {
      if (accessToken) startPlayerPolling(accessToken) // Eylem sonrası polling'i sıfırla
    }
  }

  const skipToPrevious = async () => {
    setError(null)
    const res = await makeSpotifyApiCall("me/player/previous", "POST", { device_id: activeDeviceId })
    if (res?.ok) {
      if (accessToken) startPlayerPolling(accessToken) // Eylem sonrası polling'i sıfırla
    }
  }

  const handleVolumeUp = async () => {
    setError(null)
    const newVolume = Math.min(volume + 10, 100) // %10 artır, max 100
    setVolume(newVolume) // Optimistic update
    const res = await makeSpotifyApiCall(`me/player/volume?volume_percent=${newVolume}`, "PUT", {
      device_id: activeDeviceId,
    })
    if (!res?.ok) {
      if (accessToken) startPlayerPolling(accessToken) // Hata durumunda polling'i sıfırla
    }
  }

  const handleVolumeDown = async () => {
    setError(null)
    const newVolume = Math.max(volume - 10, 0) // %10 azalt, min 0
    setVolume(newVolume) // Optimistic update
    const res = await makeSpotifyApiCall(`me/player/volume?volume_percent=${newVolume}`, "PUT", {
      device_id: activeDeviceId,
    })
    if (!res?.ok) {
      if (accessToken) startPlayerPolling(accessToken) // Hata durumunda polling'i sıfırla
    }
  }

  const handleSeekForward = async () => {
    setError(null)
    const newPositionMs = Math.min(progressMs + 10000, durationMs) // 10 saniye ileri
    setProgressMs(newPositionMs) // Optimistic update
    const res = await makeSpotifyApiCall("me/player/seek", "PUT", {
      position_ms: newPositionMs,
      device_id: activeDeviceId,
    })
    if (!res?.ok) {
      if (accessToken) startPlayerPolling(accessToken) // Hata durumunda polling'i sıfırla
    } else {
      // Başarılı olursa, yerel ilerleme intervalini sıfırla ve yeniden başlat
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (isPlaying && currentTrack) {
        const startTime = Date.now() - newPositionMs // Yeni pozisyondan başlat
        progressIntervalRef.current = setInterval(() => {
          setProgressMs((prev) => {
            const updatedProgress = Date.now() - startTime
            return updatedProgress < durationMs ? updatedProgress : durationMs
          })
        }, 1000)
      }
    }
  }

  const handleSeekBackward = async () => {
    setError(null)
    const newPositionMs = Math.max(progressMs - 10000, 0) // 10 saniye geri
    setProgressMs(newPositionMs) // Optimistic update
    const res = await makeSpotifyApiCall("me/player/seek", "PUT", {
      position_ms: newPositionMs,
      device_id: activeDeviceId,
    })
    if (!res?.ok) {
      if (accessToken) startPlayerPolling(accessToken) // Hata durumunda polling'i sıfırla
    } else {
      // Başarılı olursa, yerel ilerleme intervalini sıfırla ve yeniden başlat
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (isPlaying && currentTrack) {
        const startTime = Date.now() - newPositionMs // Yeni pozisyondan başlat
        progressIntervalRef.current = setInterval(() => {
          setProgressMs((prev) => {
            const updatedProgress = Date.now() - startTime
            return updatedProgress < durationMs ? updatedProgress : durationMs
          })
        }, 1000)
      }
    }
  }

  const transferPlayback = async (deviceId: string) => {
    setError(null)
    const originalActiveDeviceId = activeDeviceId
    setActiveDeviceId(deviceId) // Optimistic update
    const res = await makeSpotifyApiCall("me/player/transfer", "PUT", {
      device_ids: [deviceId],
      play: isPlaying,
    })
    if (!res?.ok) {
      setActiveDeviceId(originalActiveDeviceId) // Revert on error
    }
    if (accessToken) startPlayerPolling(accessToken) // Eylem sonrası polling'i sıfırla
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "Computer":
        return <Laptop className="h-4 w-4" />
      case "Smartphone":
        return <Smartphone className="h-4 w-4" />
      case "Speaker":
        return <Speaker className="h-4 w-4" />
      default:
        return <Speaker className="h-4 w-4" />
    }
  }

  const copyUserAppToken = () => {
    if (userAppToken) {
      navigator.clipboard.writeText(userAppToken)
      toast({
        title: "Kopyalandı!",
        description: "Uygulama token'ı panoya kopyalandı.",
      })
    }
  }

  const toggleUserAppTokenVisibility = () => {
    setShowUserAppToken((prev) => !prev)
  }

  // Cihaz seçme düğmesine tıklandığında cihazları yeniden yükle
  const handleDeviceDropdownClick = () => {
    console.log("Cihaz Seç düğmesine tıklandı.") // Debug log
    if (accessToken) {
      console.log("AccessToken mevcut, cihazlar getiriliyor...") // Debug log
      fetchAvailableDevices(accessToken)
    } else {
      console.log("AccessToken mevcut değil, cihazlar getirilemiyor.") // Debug log
      toast({
        title: "Hata",
        description: "Cihazları listelemek için lütfen giriş yapın.",
        variant: "destructive",
      })
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-700 dark:text-gray-300">Yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg relative">
        {isActionLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        )}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Spotify Kontrol Paneli</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Kendi Spotify hesabınızı yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isLoggedIn ? (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-gray-700 dark:text-gray-300">Spotify hesabınıza bağlanmak için giriş yapın.</p>
              <Button onClick={handleLogin} className="w-full bg-green-500 hover:bg-green-600 text-white">
                Spotify ile Giriş Yap
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Hata!</strong>
                  <span className="block sm:inline"> {error}</span>
                </div>
              )}

              {userAppToken && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative break-words">
                  <p className="font-bold mb-2">Uygulama Token'ınız:</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono flex-grow overflow-hidden text-ellipsis">
                      {showUserAppToken ? userAppToken : "********************************"}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={copyUserAppToken} aria-label="Token'ı Kopyala">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleUserAppTokenVisibility}
                        aria-label={showUserAppToken ? "Token'ı Gizle" : "Token'ı Göster"}
                      >
                        {showUserAppToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs mt-2">
                    Bu token'ı harici uygulamalarınızda Spotify hesabınızı kontrol etmek için kullanabilirsiniz. Güvenli
                    bir yerde saklayın!
                  </p>
                </div>
              )}

              {currentTrack ? (
                <div className="flex flex-col items-center space-y-4">
                  {currentTrack.album.images[0] && (
                    <Image
                      src={currentTrack.album.images[0].url || "/placeholder.svg"}
                      alt={`${currentTrack.album.name} album art`}
                      width={200}
                      height={200}
                      className="rounded-md shadow-md"
                    />
                  )}
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{currentTrack.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {currentTrack.artists.map((artist: any) => artist.name).join(", ")}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">{currentTrack.album.name}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipToPrevious}
                      aria-label="Önceki Şarkı"
                      disabled={isActionLoading}
                    >
                      <SkipBack className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </Button>
                    <Button
                      size="lg"
                      className="rounded-full bg-green-500 hover:bg-green-600 text-white"
                      onClick={togglePlayback}
                      aria-label={isPlaying ? "Duraklat" : "Çal"}
                      disabled={isActionLoading}
                    >
                      {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={skipToNext}
                      aria-label="Sonraki Şarkı"
                      disabled={isActionLoading}
                    >
                      <SkipForward className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </Button>
                  </div>
                  {/* Şarkı İlerleme Kontrolleri */}
                  <div className="flex items-center w-full max-w-xs space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSeekBackward}
                      aria-label="10 Saniye Geri Sar"
                      disabled={isActionLoading || !currentTrack}
                    >
                      <Rewind className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                      {formatDuration(progressMs)}
                    </span>
                    <div className="h-1 flex-grow bg-gray-200 rounded-full dark:bg-gray-700">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(progressMs / durationMs) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                      {formatDuration(durationMs)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSeekForward}
                      aria-label="10 Saniye İleri Sar"
                      disabled={isActionLoading || !currentTrack}
                    >
                      <FastForward className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </Button>
                  </div>
                  {/* Ses Seviyesi Kontrolü */}
                  <div className="flex items-center w-full max-w-xs space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVolumeDown}
                      aria-label="Sesi Azalt"
                      disabled={isActionLoading}
                    >
                      <VolumeDown className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </Button>
                    {volume === 0 ? (
                      <VolumeX className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums flex-grow text-center">
                      {volume}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVolumeUp}
                      aria-label="Sesi Artır"
                      disabled={isActionLoading}
                    >
                      <VolumeUp className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </Button>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {/* Cihaz Seç düğmesine onClick ekledik */}
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        disabled={isActionLoading}
                        onClick={handleDeviceDropdownClick} // Buraya eklendi
                      >
                        Cihaz Seç:{" "}
                        {activeDeviceId
                          ? availableDevices.find((d) => d.id === activeDeviceId)?.name || "Bilinmeyen Cihaz"
                          : "Yok"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      {availableDevices.length > 0 ? (
                        availableDevices.map((device) => (
                          <DropdownMenuItem
                            key={device.id}
                            onClick={() => transferPlayback(device.id)}
                            disabled={device.is_active || isActionLoading}
                            className="flex items-center gap-2"
                          >
                            {getDeviceIcon(device.type)}
                            {device.name} {device.is_active && "(Aktif)"}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>Cihaz bulunamadı</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="text-center text-gray-700 dark:text-gray-300">
                  Şu anda hiçbir şey çalmıyor veya aktif bir cihazınız yok. Spotify uygulamanızda bir şeyler çalmayı
                  deneyin.
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {/* Cihaz Seç düğmesine onClick ekledik */}
                      <Button
                        variant="outline"
                        className="w-full mt-4 bg-transparent"
                        disabled={isActionLoading}
                        onClick={handleDeviceDropdownClick} // Buraya eklendi
                      >
                        Cihaz Seç:{" "}
                        {activeDeviceId
                          ? availableDevices.find((d) => d.id === activeDeviceId)?.name || "Bilinmeyen Cihaz"
                          : "Yok"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      {availableDevices.length > 0 ? (
                        availableDevices.map((device) => (
                          <DropdownMenuItem
                            key={device.id}
                            onClick={() => transferPlayback(device.id)}
                            disabled={device.is_active || isActionLoading}
                            className="flex items-center gap-2"
                          >
                            {getDeviceIcon(device.type)}
                            {device.name} {device.is_active && "(Aktif)"}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled>Cihaz bulunamadı</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
        </CardContent>
        {isLoggedIn && (
          <CardFooter className="flex flex-col gap-2 pt-4">
            {userAppToken && ( // Sadece userAppToken varsa API belgeleri linkini göster
              <Link href="/api-docs" passHref className="w-full">
                <Button variant="outline" className="w-full bg-transparent">
                  API Belgeleri
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600 bg-transparent"
              disabled={isActionLoading}
            >
              Çıkış Yap
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
