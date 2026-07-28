# redzikowski.com — strona ofertowa + panel

Strona ofertowa (React + Vite) i lekki CMS na Node/Express. Wszystkie treści strony
głównej oraz dowolna liczba podstron są edytowalne z panelu `/admin`.

## Uruchomienie lokalne

API (osobny terminal):

```bash
SETTINGS_ENCRYPTION_KEY=dev-secret DATA_DIR=./data PORT=3001 node server/index.mjs
```

Frontend:

```bash
npm run dev
```

Vite proxuje `/api` i `/uploads` na `http://localhost:3001` (można nadpisać zmienną `API_URL`).

## Produkcja

Wdrożenie idzie automatycznie z gałęzi `main` (`.github/workflows/deploy-homepage.yml`):
pliki lądują w `/opt/apps/homepage`, a workflow uruchamia `docker compose up -d --build`.

- `homepage` — nginx z zbudowanym frontendem, basic auth na `/admin` i `/api/admin/`
- `homepage_api` — Express z danymi na wolumenie

**Katalog trwały: `/opt/apps/homepage-persist`.** Krok kopiujący czyści `/opt/apps/homepage`
przy każdym wdrożeniu, więc rzeczy, które mają przetrwać, leżą obok:

| Ścieżka | Zawartość |
| --- | --- |
| `homepage-persist/env` | `SETTINGS_ENCRYPTION_KEY` i `HOMEPAGE_DATA_DIR`, kopiowane do `.env` przed startem |
| `homepage-persist/data` | Treści, podstrony, zgłoszenia i wgrane zdjęcia |

Klucz generuje się sam przy pierwszym wdrożeniu i potem się nie zmienia.
Podmiana go unieważnia zapisane hasło skrzynki — trzeba je wtedy wpisać ponownie w panelu.

## Panel `/admin`

| Zakładka | Do czego służy |
| --- | --- |
| Pulpit | Liczby, ostatnie zgłoszenia, skróty |
| Zgłoszenia | Wiadomości z formularza: statusy, filtry, szybka odpowiedź, usuwanie |
| Podstrony | Tworzenie stron oferty: adres, zajawka, zdjęcie główne, bloki treści, kolejność, publikacja |
| Treści strony | Wszystkie teksty strony głównej — od nagłówka po widełki w konfiguratorze |
| Zdjęcia | Biblioteka mediów: upload przeciągnięciem, kopiowanie adresu, usuwanie |
| Odebrane / Wysłane | Podgląd skrzynki IMAP i historia wysyłek |
| Poczta | Dane IMAP/SMTP; hasło szyfrowane AES-256-GCM przed zapisem |

### Bloki podstron

`tekst`, `zdjęcie`, `galeria`, `lista atutów`, `liczby`, `cytat`, `wezwanie do działania`.
Bloki można dowolnie dodawać, przestawiać i usuwać. Opublikowana strona jest dostępna
pod `/p/<adres>` i pojawia się w menu, w sekcji oferty na stronie głównej oraz w stopce.

## Dane

Katalog wskazany przez `HOMEPAGE_DATA_DIR` (lokalnie `./data`):

| Plik | Zawartość |
| --- | --- |
| `content.json` | Treści strony głównej (braki uzupełnia `server/content.default.json`) |
| `pages.json` | Podstrony CMS |
| `submissions.json` | Zgłoszenia z formularza |
| `outbox.json` | Historia wysłanych powiadomień |
| `mail-settings.json` | Konfiguracja poczty (hasło zaszyfrowane) |
| `uploads/` | Zdjęcia wgrane w panelu |

## API

Publiczne: `GET /api/content`, `GET /api/pages/:slug`, `POST /api/contact`.
Administracyjne (za basic auth): `/api/admin/*` — zgłoszenia, treści, podstrony, media, poczta.
