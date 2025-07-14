import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function ApiDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000" // Vercel URL'sini veya yerel URL'yi kullan

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-3xl bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">API Belgeleri</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Spotify hesabınızı harici uygulamalarla kontrol etmek için API'mizi kullanın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Uygulama Token'ınız (User App Token)
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Spotify hesabınıza giriş yaptığınızda size özel olarak oluşturulan benzersiz bir token'dır. Bu token,
              harici uygulamaların sizin adınıza Spotify API'ye güvenli bir şekilde istek göndermesini sağlar.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              **Bu token'ı kimseyle paylaşmayın!** Spotify kontrol panelinizde (ana sayfada) bu token'ı bulabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. API Endpoint'i</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Tüm kontrol istekleri aşağıdaki endpoint'e `POST` metodu ile gönderilmelidir:
            </p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto">
              {baseUrl}/api/control
            </code>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              İstek başlıklarına (`Headers`) `Content-Type: application/json` ve `X-User-App-Token: [SİZİN_TOKENİNİZ]`
              eklemeyi unutmayın.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Desteklenen Aksiyonlar</h2>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              3.1. Oynatma Durumunu Al (getPlaybackState)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Şu anki oynatma durumunu, çalan şarkıyı ve aktif cihazı döndürür.
            </p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "getPlaybackState" }'`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">
              3.2. Cihazları Al (getDevices)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Hesabınızla ilişkili tüm kullanılabilir cihazları döndürür.
            </p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "getDevices" }'`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">3.3. Çal (play)</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Mevcut şarkıyı çalmaya başlar veya belirli bir cihazda çalmayı başlatır.
            </p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "play", "payload": { "device_id": "cihaz_id_buraya" } }'
# device_id isteğe bağlıdır. Belirtilmezse, aktif cihazda oynatılır.`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">3.4. Duraklat (pause)</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Mevcut şarkıyı duraklatır.</p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "pause", "payload": { "device_id": "cihaz_id_buraya" } }'
# device_id isteğe bağlıdır.`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">3.5. Sonraki Şarkı (next)</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Oynatma listesindeki bir sonraki şarkıya geçer.</p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "next", "payload": { "device_id": "cihaz_id_buraya" } }'
# device_id isteğe bağlıdır.`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">
              3.6. Önceki Şarkı (previous)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Oynatma listesindeki bir önceki şarkıya geçer.</p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "previous", "payload": { "device_id": "cihaz_id_buraya" } }'
# device_id isteğe bağlıdır.`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">
              3.7. Ses Seviyesini Ayarla (setVolume)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">Aktif cihazın ses seviyesini ayarlar (0-100 arası).</p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "setVolume", "payload": { "volume_percent": 75, "device_id": "cihaz_id_buraya" } }'
# device_id isteğe bağlıdır.`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">
              3.8. Oynatmayı Cihaza Aktar (transferPlayback)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Oynatmayı belirli bir cihaza aktarır. İsteğe bağlı olarak aktarıldığında çalmaya başlayabilir.
            </p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "transferPlayback", "payload": { "device_ids": ["cihaz_id_buraya"], "play": true } }'
# play isteğe bağlıdır (varsayılan false).`}
            </code>

            <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-6 mb-2">3.9. Çıkış Yap (logout)</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Spotify hesabınızın bağlantısını keser ve Firebase'deki refresh token'ınızı siler.
            </p>
            <code className="block bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">
              {`curl -X POST \\
  https://keremkk-spotify.vercel.app/api/control \\
  -H "Content-Type: application/json" \\
  -H "X-User-App-Token: [SİZİN_TOKENİNİZ]" \\
  -d '{ "action": "logout" }'`}
            </code>
          </section>
        </CardContent>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <Link href="/" passHref>
            <Button variant="outline" className="w-full bg-transparent">
              <ChevronLeft className="h-4 w-4 mr-2" /> Kontrol Paneline Geri Dön
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
