# Üniversitelerin Alan Bazında Yetkinlik Analizi · 2026

TÜBİTAK’ın 2026 dönemi **Üniversitelerin Alan Bazında Yetkinlik Analizi** raporundaki verileri
işlenebilir dosyalara ve Plotly tabanlı interaktif bir web sitesine dönüştürür.

## Veri dosyaları (`data/`)

| Dosya | Kayıt | Sütunlar |
|---|---|---|
| `yetkinlik_alan.csv` / `.json` | 14.149 | `alan`, `alt`, `uni`, `kalite`, `hacim` |
| `yetkinlik_universite.csv` / `.json` | 14.074 | `uni`, `alan`, `alt`, `kalite`, `hacim` |
| `meta.json` | — | ana alanlar, alt alanlar, üniversite listeleri, sayılar |

### Şema

- **kalite**: 0–60 arası kalite puanı (kalite göstergeleri, %60 ağırlık).
- **hacim**: 0–40 arası hacım puanı (hacim göstergeleri, %40 ağırlık).
- **Alan görünümü** (`yetkinlik_alan`): üniversiteler seçili **alt alan içinde** birbirleriyle karşılaştırılır.
- **Üniversite görünümü** (`yetkinlik_universite`): alt alanlar **üniversitenin kendi içinde** karşılaştırılır.

> Bu iki görünümdeki puanlar farklı normalizasyonlara sahiptir; birbirleriyle doğrudan kıyaslanmamalıdır.

- CSV dosyaları UTF-8 BOM’lu ve virgül ayraçlıdır (Excel uyumlu).
- Site içi CSV indirmeleri Excel-TR uyumu için noktalı virgül (`;`) ayraçlıdır.

## Web sitesi

```
index.html            → ana sayfa (sekmeler, filtreler, grafikler)
assets/app.js         → uygulama mantığı (Plotly)
assets/styles.css     → stiller
assets/data.js        → sitede kullanılan kompakt veri (üretilir)
vendor/plotly.min.js  → Plotly.js 2.35.2 (yerel, çevrimdışı çalışır)
tools/build_data.py   → data/*.json → assets/data.js
```

### Sekmeler

1. **Alan Bazlı** — Ana Alan → Alt Alan → (isteğe bağlı) üniversite vurgusu; X=Kalite, Y=Hacım dağılım grafiği.
2. **Üniversite Bazlı** — Bir üniversitenin alt alanları; üniversite içi karşılaştırma.
3. **Üniversite Karşılaştırma** — İki üniversite dropdown’ı, ardından ana alan ve alt alan seçilir.
   Üstte **kim önde** kartları ve kazanan vurgusu (toplam puan = kalite + hacım) gösterilir.
   Alt alan **Tümü** ise alt alan bazında toplam puan farkı grafiği (sağ = 1. üni, sol = 2. üni);
   tek bir alt alan seçilirse iki üniversitenin yığılmış kalite + hacım barları gösterilir.

Sekmeler doğrudan bağlantı ile açılabilir: `#alan`, `#universite`, `#karsilastirma`
(ör. `index.html#karsilastirma`).

### Mobil görünüm

680px altındaki ekranlarda Plotly grafikleri yerine **dokunmatik kart listeleri** kullanılır
(küçük noktalara basmak yerine okunaklı satırlar, yatay kaydırma yok):

- **Alan Bazlı:** üniversiteler hacım sırasıyla listelenir; kalite/hacım çubukları ve kartlara dokunarak vurgulama.
- **Üniversite Bazlı:** alt alanlar ana alana göre **açılır gruplar** içinde gösterilir.
- **Karşılaştırma:** üstte kazanan kartları, altta alt alan bazında "kim önde" listesi.

Listeler ilk 15/12 satırla sınırlıdır; **Tümünü göster** ile genişletilir. Ekran büyütüldüğünde
aynı veriler otomatik olarak Plotly grafiklerine döner.

### Canlı site

GitHub Pages: <https://06ergin06.github.io/tubitak-alan-bazli-analiz/>

`main` branch'ine push yapıldığında Pages sitesi otomatik güncellenir.

### Çalıştırma

- `index.html` dosyasını doğrudan tarayıcıda açabilirsiniz (file://).
- veya bir sunucu ile:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

### Veri güncelleme

`data/*.json` dosyalarını düzenledikten sonra site verisini yeniden üretin:

```bash
python3 tools/build_data.py
```

## Kaynak

TÜBİTAK, *Üniversitelerin Alan Bazında Yetkinlik Analizi 2026*
<https://tubitak.gov.tr/tr/kurumsal/politikalar/universitelerin-alan-bazli-yetkinlik-analizi>

Veriler, TÜBİTAK’ın resmi interaktif aracının sayfa kaynağındaki gömülü veri setlerinden
birebir alınmıştır (OCR kullanılmamıştır).
