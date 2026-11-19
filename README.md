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
| Analityka | Odsłony, unikalni odwiedzający, sesje, odrzucenia, czas, źródła, urządzenia, pora dnia i pobrania aplikacji |
| Zgłoszenia | Wiadomości z formularza: statusy, filtry, szybka odpowiedź, usuwanie |
| Przydatne linki | Polecane strony: szybkie dodawanie po adresie, import wielu naraz, kategorie, tagi, wyróżnienia, licznik przejść |
| Portfolio | Prace: strony i aplikacje, zrzuty ekranu, pliki do pobrania, wydania z GitHuba |
| Podstrony | Tworzenie stron oferty: adres, zajawka, zdjęcie główne, bloki treści, kolejność, publikacja |
| Treści strony | Teksty strony głównej i katalogu – hero, nagłówki sekcji, zakres, proces, FAQ, kontakt |
| Zdjęcia | Biblioteka mediów: upload przeciągnięciem, kopiowanie adresu, usuwanie |
| Galeria | Portfolio fotograficzne, albumy klientów, metadane i upload zdjęć |
| Odebrane / Wysłane | Podgląd skrzynki IMAP i historia wysyłek |
| Poczta | Dane IMAP/SMTP; hasło szyfrowane AES-256-GCM przed zapisem |

Menu panelu jest pogrupowane: **Aplikacje** (Zarządzanie aplikacjami → GRAŃ, Raporty błędów,
Sugestie i zgłoszenia, Testerzy, Pobieranie), **Strona** (portfolio, podstrony, treści, galeria)
i **Poczta**. Zgłoszenia z formularza kontaktowego zostają na górze, poza grupami.

## Aplikacje: konta użytkowników i punkty na mapie

`/admin/aplikacje/<slug>/<sekcja>` (dawne `/admin/punkty-na-mapie` przekierowuje do GRANI):

- **Przegląd** – liczba kont (aktywne, czekające na aktywację, nowe, korzystające w 7/30 dni,
  platformy), wpisy do moderacji, zdjęcia i zajęte miejsce.
- **Punkty na mapie** – moderacja punktów, komentarzy i zdjęć, odpowiedzi „GRAŃ”, zgłoszenia,
  podpowiedzi punktów leżących blisko siebie i **scalanie** (komentarze, zdjęcia i oceny
  przechodzą do drugiego punktu).
- **Użytkownicy** – konta: aktywacja ręczna, ponowny link, blokada (wylogowuje), usunięcie.
- **Ustawienia** – moderacja, limit zdjęć od jednej osoby (domyślnie 3 na punkt), promień
  scalania, adres obsługi i **własne konto SMTP aplikacji** (puste – wiadomości idą ze skrzynki
  strony), próbna wiadomość.

Konta (`server/app-accounts.mjs`, dane `app-users.json`, ustawienia `app-settings.json`): aplikacja
rejestruje e-mail, hasło (scrypt) i nazwę; strona wysyła link `/aplikacje/<slug>/aktywacja?token=…`
(72 h), reset hasła `/aplikacje/<slug>/haslo?token=…` (2 h). Logowanie zwraca token sesji
(`Authorization: Bearer`), na dysku są tylko skróty. Wpisy na mapie (`server/map-points.mjs`)
wymagają zalogowania. Zdjęcia (`app-photos/`) serwer przelicza do 2048 px, JPEG 75 %, bez EXIF.
Dane okolicy GRANI (`server/gran-sectors.mjs`): serwer trzyma odpowiedzi Overpass (szlaki, punkty, granice,
zamknięcia, pokrycie terenu) dla sektorów z9 nad Polską, Czechami i Słowacją – `gran-overpass/<skrót>.json.gz`
i indeks `gran-overpass.json` w katalogu danych. Kolejka pobiera je po jednym (pytania aplikacji mają
pierwszeństwo), co godzinę dopisuje brakujące i starsze niż 30 dni. Aplikacja pyta `POST /api/gran/overpass`:
200 – gotowe dane (gzip), 202 – w kolejce, 404 – poza obszarem. Szablony zapytań: `server/gran-queries.json`
(te same co w `osm.rs` i `landcover.rs` GRANI). Postęp: panel → Grań → Przegląd.

Polityka prywatności GRANI: `/aplikacje/gran/prywatnosc` (`src/site/privacy-gran.js`, ta sama treść
jest w aplikacji – zmieniaj razem).

### Bloki podstron

`tekst`, `zdjęcie`, `galeria`, `lista atutów`, `liczby`, `cytat`, `wezwanie do działania`.
Bloki można dowolnie dodawać, przestawiać i usuwać. Opublikowana strona jest dostępna
pod `/p/<adres>` i pojawia się w menu, w sekcji oferty na stronie głównej oraz w stopce.

## Do pobrania

Niezależna biblioteka materiałów pod `/do-pobrania`, ze stronami
`/do-pobrania/<slug>`, wyszukiwaniem i filtrem kategorii. Linki są w menu i stopce.
Panel `/admin/do-pobrania` obsługuje kategorie, materiały, kolejność, szkice,
publikację, opisy, wymagania, instrukcje, licencje i wiele załączników na materiał.
Po edycji wybierz **Zapisz bibliotekę**. Kategorię można usunąć dopiero po
przeniesieniu lub usunięciu jej materiałów. Upload: maks. 100 MB na plik.

Dane leżą w `resources.json`, pliki w `resource-files/` w trwałym katalogu danych.
Odłączenie załącznika lub usunięcie wpisu odbiera publiczny dostęp; plik pozostaje
na dysku. Pobrania są zliczane przez serwer po zakończeniu transferu (obejmują
ponowne pobrania). Publiczne API udostępnia wyłącznie opublikowane materiały.
Istniejące portfolio i administracyjne „Pobieranie” aplikacji są niezależne.

Przy pierwszym uruchomieniu tworzona jest pozycja AR Presets: oryginalny ZIP,
314 presetów XMP w 40 grupach wraz z PDF, instrukcją i licencją. Kolejne starty
nie nadpisują zmian zapisanych w panelu. ZIP jest częścią obrazu API.
Testy biblioteki: `npm run test:resources`.

## Przydatne linki

Katalog polecanych stron pod `/przydatne-linki` (link „Linki” w menu i stopce). Strona
grupuje linki według kategorii, ma wyszukiwarkę (skrót `/`, `#tag` szuka po tagu), filtr
kategorii i sekcję „Polecam szczególnie”. Karty mają jednakową szerokość: zrzut strony,
favicon, tytuł, domena i dwulinijkowy opis – bez plakietek.

Panel `/admin/przydatne-linki`: wystarczy wkleić adres – serwer sam odczyta tytuł, opis
i favicon (`POST /api/admin/links/inspect`), a po zapisie zrobi zrzut strony na miniaturę.
Kilka adresów naraz – przycisk **Wiele naraz** albo wklejenie listy w pole szybkiego
dodawania. Zmiany publikuje **Zapisz** (albo Ctrl+S).

- Dane: `links.json`, ikony: `uploads/link-icons/` (PNG 96×96, favicon przed ikonami Apple),
  zrzuty: `uploads/link-shots/` (WebP 800×500 z widoku 1280×800).
- Zrzuty robi headless Chromium (`server/screenshot.mjs`, w obrazie API z `apk add chromium`)
  po kolei w tle: po starcie serwera i po każdym zapisie dla linków bez miniatury; nieudany
  zrzut ponawia się po dobie, a przycisk **Zrób nowy zrzut** robi go od razu. Cały ruch
  przeglądarki idzie przez lokalny pośrednik, który wpuszcza tylko publiczne adresy IP.
- Serwer pobiera strony wyłącznie z publicznych adresów IP (sprawdza każde przekierowanie),
  z limitem 8 s i 768 KB, więc odwiedzający nie łączą się z obcymi serwerami przed kliknięciem.
- Przejścia liczy `POST /api/links/:id/visit` – jedno na adres i link co 10 minut.

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

### Plakaty z repozytoriów

Jeśli repozytorium aplikacji ma `docs/posters/posters.json`, serwer co 30 minut sprawdza manifest,
pobiera wymienione w nim plakaty (osobny na każdą platformę), zapisuje je jako WebP w
`uploads/posters/<slug>/` i stawia na początku galerii pracy. Bez manifestu nic się nie zmienia.
Cache: `posters.json` w katalogu danych.

Plakaty składa `scripts/posters/build.mjs` z szablonu `scripts/posters/template.html`
(styl strony, bezgłowy Chrome), a `scripts/posters/readme.mjs` wstawia je na górę README aplikacji:

```bash
node scripts/posters/build.mjs ../OpenTimer
node scripts/posters/readme.mjs ../OpenTimer
```

Zrzuty leżą w repozytorium aplikacji w `docs/screenshots/<platforma>/`. Plakat nie podaje wersji
ani rozmiaru pliku – tylko minimalny system – żeby po aktualizacji dalej był aktualny.

## Dane

Katalog wskazany przez `HOMEPAGE_DATA_DIR` (lokalnie `./data`):

| Plik | Zawartość |
| --- | --- |
| `content.json` | Treści strony głównej (braki uzupełnia `server/content.default.json`) |
| `pages.json` | Podstrony CMS |
| `projects.json` | Prace w portfolio |
| `links.json` | Przydatne linki i ich kategorie |
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

## Analityka i pobrania

Statystyki zbiera własne API (`POST /api/track`) – bez zewnętrznych skryptów. Zdarzenia leżą
w `data/analytics/events-RRRR-MM.jsonl` (13 miesięcy wstecz), adresów IP nie zapisujemy.
Baner prywatności pyta o zgodę: bez niej liczone są tylko anonimowe odsłony i pobrania,
po zgodzie dochodzi losowy identyfikator przeglądarki, źródło wejścia, język, ekran i czas.
Zgodę można zmienić linkiem „Ustawienia prywatności” w stopce.

Liczby pobrań przy aplikacjach pochodzą z GitHuba (`download_count` z wydania); dla plików
wpisanych ręcznie liczone są kliknięcia na stronie (`data/download-counts.json`).
