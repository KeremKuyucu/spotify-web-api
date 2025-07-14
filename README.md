# Spotify Kontrol Paneli

Bu proje, Next.js, React ve Firebase kullanarak kendi Spotify hesabınızı kontrol etmenizi sağlayan bir web uygulamasıdır. Ayrıca, harici uygulamaların Spotify hesabınızı API istekleri aracılığıyla yönetebilmesi için kişiselleştirilmiş bir API token'ı (User App Token) sağlar.

## Özellikler

*   Spotify hesabınıza güvenli giriş (OAuth 2.0).
*   Çalan şarkıyı, sanatçıyı ve albümü görüntüleme.
*   Şarkıyı çalma, duraklatma, ileri/geri sarma.
*   Ses seviyesini ayarlama.
*   Mevcut cihazları görüntüleme ve oynatmayı cihazlar arasında aktarma.
*   Her kullanıcı için benzersiz, güvenli bir "Uygulama Token'ı" oluşturma.
*   Harici uygulamaların bu token ile Spotify hesabını kontrol etmesini sağlayan bir API endpoint'i.
*   API'nin nasıl kullanılacağını açıklayan kapsamlı API belgeleri.

## Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

### 1. Gereksinimler

*   Node.js (v18 veya üzeri önerilir)
*   npm veya yarn
*   Bir Spotify Geliştirici Hesabı (uygulama oluşturmak için)
*   Bir Firebase Projesi (Firestore veritabanı için)

### 2. Spotify Uygulaması Oluşturma

1.  [Spotify Geliştirici Paneli](https://developer.spotify.com/dashboard/applications) adresine gidin ve yeni bir uygulama oluşturun.
2.  Uygulamanızın `Client ID` ve `Client Secret` değerlerini not alın.
3.  Uygulama ayarlarında `Edit Settings`'e tıklayın ve `Redirect URIs` bölümüne aşağıdaki URL'yi ekleyin:
    *   Yerel geliştirme için: `http://localhost:3000/api/auth/callback`
    *   Vercel'e dağıtım yapacaksanız: `https://[SİZİN_VERCEL_URL'NİZ]/api/auth/callback` (Örn: ``https://keremkk-spotify.vercel.app/api/auth/callback`)

### 3. Firebase Projesi Kurulumu

1.  [Firebase Konsolu](https://console.firebase.google.com/) adresine gidin ve yeni bir proje oluşturun veya mevcut bir projeyi seçin.
2.  Projenizde Firestore Database'i etkinleştirin (başlangıç modunu "Test modu" olarak seçebilirsiniz, ancak daha sonra güvenlik kurallarını ayarlayacağız).
3.  Sol menüden `Project settings` (Proje ayarları) > `Service accounts` (Servis hesapları) bölümüne gidin.
4.  `Generate new private key` (Yeni özel anahtar oluştur) düğmesine tıklayın. Bu, bir JSON dosyası indirecektir. Bu dosyanın içeriğini kopyalayın.

### 4. Ortam Değişkenlerini Ayarlama

Proje kök dizininde `.env.local` adında bir dosya oluşturun ve aşağıdaki değişkenleri Spotify ve Firebase bilgilerinizle doldurun:

\`\`\`dotenv
# Spotify API Kimlik Bilgileri
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Firebase Admin SDK Servis Hesabı Anahtarı
# İndirdiğiniz JSON dosyasının içeriğini tek bir satırda, kaçış karakterleri ile buraya yapıştırın.
# Örnek: {"type": "service_account", "project_id": "...", "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----\\n", ...}
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "your-project-id", "private_key_id": "your-private-key-id", "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----\\n", "client_email": "your-client-email@your-project-id.iam.gserviceaccount.com", "client_id": "your-client-id", "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token", "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs", "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-client-email%40your-project-id.iam.gserviceaccount.com"}'

# Vercel Ortam Değişkeni (İsteğe Bağlı, API Belgeleri için)
# Eğer Vercel'e dağıtım yapıyorsanız, bu değişken Vercel tarafından otomatik olarak ayarlanır.
# Yerel geliştirme için manuel olarak ayarlayabilirsiniz.
NEXT_PUBLIC_VERCEL_URL=http://localhost:3000
\`\`\`

**Önemli:** `FIREBASE_SERVICE_ACCOUNT_KEY` değişkeninin değerini tek bir satırda ve tüm çift tırnakları (`"`) ters eğik çizgi (`\`) ile kaçırarak (`\"`) yapıştırdığınızdan emin olun.

### 5. Bağımlılıkları Yükleme

Proje dizininde terminali açın ve bağımlılıkları yükleyin:

\`\`\`bash
npm install
# veya
yarn install
\`\`\`

### 6. Projeyi Çalıştırma

Geliştirme sunucusunu başlatın:

\`\`\`bash
npm run dev
# veya
yarn dev
\`\`\`

Uygulama şimdi `http://localhost:3000` adresinde çalışıyor olmalıdır.

## Firebase Güvenlik Kuralları

`userTokens` koleksiyonunuzdaki hassas `refreshToken`'ları korumak için Firebase Firestore güvenlik kurallarınızı aşağıdaki gibi ayarlamanız **şiddetle tavsiye edilir**. Bu, istemci tarafındaki doğrudan erişimi engeller ve yalnızca sunucu tarafındaki (Admin SDK) kodunuzun bu verilere erişmesine izin verir.

Firebase Konsolu > Firestore Database > Kurallar sekmesine gidin ve aşağıdaki kuralları ekleyin:

\`\`\`firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // userTokens koleksiyonuna istemci tarafından tüm erişimi engelle
    match /userTokens/{userAppToken} {
      allow read, write: if false;
    }

    // Mevcut diğer kurallarınız (users, links, apiTokens vb.) buraya devam eder.
    // Örnek:
    // match /users/{userId} {
    //   allow read, write: if request.auth != null && request.auth.uid == userId;
    //   // ... diğer admin kuralları
    // }
    // match /links/{linkId} {
    //   // ... link kuralları
    // }
    // match /apiTokens/{tokenId} {
    //   // ... apiTokens kuralları
    // }
  }
}
\`\`\`

## API Kullanımı

Uygulamanız, Spotify hesabınızı harici uygulamalar aracılığıyla kontrol etmenizi sağlayan bir API endpoint'i sunar. API belgelerine uygulamanın ana sayfasından erişebilirsiniz.

**Endpoint:** `[UYGULAMA_URL'NİZ]/api/control`
**Metod:** `POST`
**Başlıklar:**
*   `Content-Type: application/json`
*   `X-User-App-Token: [SİZİN_UYGULAMA_TOKENİNİZ]` (Bu token'ı uygulamaya giriş yaptıktan sonra ana sayfada bulabilirsiniz.)

Desteklenen aksiyonlar ve örnek `curl` komutları için lütfen uygulamanın API belgeleri sayfasına bakın.

## Katkıda Bulunma

Katkılarınızı memnuniyetle karşılarız! Lütfen bir pull request göndermeden önce sorunları veya özellik isteklerini tartışmak için bir issue açın.

## Lisans

Bu proje [GNU Genel Kamu Lisansı v3.0 (GPL-3.0)](LICENSE) altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.
