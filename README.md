# redzikowski.com – strona ofertowa + panel

Strona ofertowa (React + Vite) i lekki CMS na Node/Express. Treści strony głównej,
portfolio i dowolna liczba podstron są edytowalne z panelu `/admin`.

Oprawa wizualna jest wspólna z Arcadią: tło `GlyphField` (siatka znaków z falami po
kliknięciu). Reszta to własny system: ciepła czerń, płaskie złoto, Newsreader / Hanken Grotesk /
JetBrains Mono. Font monospace niesie wyłącznie dane techniczne – wersje, rozmiary
plików, platformy i daty wydań.

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

- `homepage` – nginx z zbudowanym frontendem
- `homepage_api` – Express z danymi na wolumenie i wspólnym uwierzytelnianiem panelu
- `homepage_gallery` – publiczna galeria i jej API, uruchamiane z tego samego repozytorium pod `/galeria`

**Katalog trwały: `/opt/apps/homepage-persist`.** Krok kopiujący czyści `/opt/apps/homepage`
przy każdym wdrożeniu, więc rzeczy, które mają przetrwać, leżą obok:

| Ścieżka | Zawartość |
| --- | --- |
| `homepage-persist/env` | Klucze i ścieżki danych, kopiowane do `.env` przed startem |
| `homepage-persist/data` | Treści, podstrony, zgłoszenia i wgrane zdjęcia |
| `homepage-persist/gallery` | Baza SQLite galerii, oryginały zdjęć i miniatury |

Klucz generuje się sam przy pierwszym wdrożeniu i potem się nie zmienia.
Podmiana go unieważnia zapisane hasło skrzynki – trzeba je wtedy wpisać ponownie w panelu.

## Panel `/admin`

Przy pierwszym wejściu panel prosi wyłącznie o nazwę administratora i hasło. Pierwsza
osoba, która zakończy ten krok, tworzy konto administratora; kolejne wejścia pokazują
zwykłe logowanie. Adres e-mail nie jest wymagany. Hasło jest skrótowane przez `scrypt`,
a dostęp do `/api/admin/*` wymaga bezpiecznej sesji w ciasteczku `HttpOnly`.
Ta sama sesja otwiera zakładkę **Galeria** oraz pełny widok `/galeria/admin`, bez
drugiego logowania i bez osobnego hasła galerii.

| Zakładka | Do czego służy |
| --- | --- |
| Pulpit | Liczby, ostatnie zgłoszenia, skróty |
| Zgłoszenia | Wiadomości z formularza: statusy, filtry, szybka odpowiedź, usuwanie |
| Portfolio | Prace: strony i aplikacje, zrzuty ekranu, pliki do pobrania, wydania z GitHuba |
| Podstrony | Tworzenie stron oferty: adres, zajawka, zdjęcie główne, bloki treści, kolejność, publikacja |
| Treści strony | Teksty strony głównej i katalogu – hero, nagłówki sekcji, zakres, proces, FAQ, kontakt |
| Zdjęcia | Biblioteka mediów: upload przeciągnięciem, kopiowanie adresu, usuwanie |
| Galeria | Portfolio fotograficzne, albumy klientów, metadane i upload zdjęć |
| Odebrane / Wysłane | Podgląd skrzynki IMAP i historia wysyłek |
| Poczta | Dane IMAP/SMTP; hasło szyfrowane AES-256-GCM przed zapisem |

### Bloki podstron

`tekst`, `zdjęcie`, `galeria`, `lista atutów`, `liczby`, `cytat`, `wezwanie do działania`.
Bloki można dowolnie dodawać, przestawiać i usuwać. Opublikowana strona jest dostępna
pod `/p/<adres>` i pojawia się w menu, w sekcji oferty na stronie głównej oraz w stopce.

## Portfolio

Portfolio jest osobnym zbiorem danych (`projects.json`), a nie częścią treści strony.
Każda praca jest jednego z dwóch rodzajów:

- **strona** – dowodem jest działający adres; można go ukryć, wtedy strona pisze,
  że prezentacja jest na życzenie,
- **aplikacja** – dowodem są pliki do pobrania; opcjonalnie ma też własną stronę.

Pliki aplikacji biorą się z jednego z trzech źródeł (`releaseSource`):

| Źródło | Zachowanie |
| --- | --- |
| `github` | Serwer pobiera najnowsze wydanie z `owner/nazwa` i sam rozpoznaje platformy po nazwach plików |
| `manual` | Lista wpisana ręcznie w panelu: platforma, wersja, rozmiar, adres |
| `none` | Bez sekcji pobierania |

Strona główna pokazuje do pięciu prac zaznaczonych jako wybrane; całe portfolio
stoi pod `/portfolio`, a każda praca ma własny adres `/portfolio/<slug>`.

### Wydania z GitHuba

Bez tokenu serwer czyta tylko repozytoria publiczne i linkuje wprost do plików na
GitHubie. Token wpisany w panelu (zakładka Realizacje) otwiera także repozytoria
prywatne – ich pliki idą wtedy przez `/api/projects/:slug/asset/:id`, bo adresy
`browser_download_url` wymagają autoryzacji. Token jest szyfrowany AES-256-GCM tym
samym kluczem co hasło poczty i nigdy nie opuszcza serwera.

Odpowiedzi GitHuba lądują w `releases.json` z czasem życia 30 minut, więc strona nie
odpytuje API przy każdym wejściu. Gdy odświeżenie się nie powiedzie, serwer podaje
ostatni udany wynik, a panel pokazuje powód błędu przy pracy.

## Dane

Katalog wskazany przez `HOMEPAGE_DATA_DIR` (lokalnie `./data`):

| Plik | Zawartość |
| --- | --- |
| `content.json` | Treści strony głównej (braki uzupełnia `server/content.default.json`) |
| `pages.json` | Podstrony CMS |
| `projects.json` | Prace w portfolio |
| `releases.json` | Cache wydań z GitHuba |
| `integrations.json` | Token GitHuba (zaszyfrowany) |
| `submissions.json` | Zgłoszenia z formularza |
| `outbox.json` | Historia wysłanych powiadomień |
| `mail-settings.json` | Konfiguracja poczty (hasło zaszyfrowane) |
| `admin.json` | Nazwa administratora, skrót hasła i wersja sesji |
| `uploads/` | Zdjęcia wgrane w panelu |

## API

Publiczne: `GET /api/content`, `GET /api/pages/:slug`, `GET /api/projects/:slug`,
`GET /api/projects/:slug/asset/:id`, `POST /api/contact`.
Uwierzytelnianie: `/api/auth/status`, `/api/auth/setup`, `/api/auth/login`, `/api/auth/logout`.
Administracyjne (za sesją): `/api/admin/*` – zgłoszenia, treści, realizacje, podstrony,
media, poczta i token GitHuba.
