/**
 * Polityka prywatności aplikacji GRAŃ (Windows, Android, iOS) i kont na redzikowski.com.
 * Ta sama treść jest wbudowana w aplikację (`src/ui/privacy.rs` w repozytorium gran-3d) –
 * zmieniaj obie razem i podbij datę wersji (`PRIVACY_VERSION` w `server/app-accounts.mjs`).
 */

export const PRIVACY_VERSION = '19 listopada 2026'
export const PRIVACY_VERSION_EN = '19 November 2026'

export const PRIVACY = {
  pl: {
    title: 'Polityka prywatności aplikacji GRAŃ',
    lead: 'GRAŃ to darmowy atlas szlaków 3D na Windows, Androida i iOS. Ta polityka opisuje, jakie dane aplikacja i konto na redzikowski.com przetwarzają, po co, jak długo i jakie masz prawa. Większość danych zostaje na Twoim urządzeniu – na serwer trafia tylko to, co sam wyślesz.',
    sections: [
      {
        h: '1. Administrator danych',
        p: [
          'Administratorem danych jest Adam Rędzikowski, autor aplikacji GRAŃ, prowadzący serwis redzikowski.com. W sprawach danych osobowych napisz na adres obsługi aplikacji podany poniżej albo przez formularz kontaktowy na redzikowski.com.',
        ],
      },
      {
        h: '2. Co zostaje na urządzeniu',
        p: [
          'Ustawienia, biblioteka tras, miejsc i widoków, pobrane mapy i obszary offline, dziennik programu oraz dane konta (adres e-mail, nazwa i token sesji – bez hasła) są zapisywane tylko na Twoim urządzeniu. Aplikacja nie używa GPS ani lokalizacji urządzenia, nie ma reklam, analityki ani śledzenia.',
        ],
      },
      {
        h: '3. Konto użytkownika',
        p: [
          'Konto jest potrzebne tylko do dodawania punktów, komentarzy, zdjęć i ocen. Przeglądanie mapy i punktów innych osób działa bez konta.',
          'Przy rejestracji zapisujemy: adres e-mail, nazwę widoczną przy Twoich wpisach, skrót hasła (scrypt – samego hasła nie znamy), datę rejestracji i akceptacji tej polityki, datę ostatniego logowania, system i wersję aplikacji oraz skróty tokenów sesji. Na adres e-mail wysyłamy wyłącznie wiadomości o koncie: link aktywacyjny i link do ustawienia nowego hasła – bez newslettera i reklam.',
          'Podstawa prawna: art. 6 ust. 1 lit. b RODO (świadczenie usługi, o którą prosisz, zakładając konto).',
          'Konto, którego nie aktywujesz linkiem z wiadomości, jest usuwane po kilku dniach. Konto możesz w każdej chwili usunąć sam w aplikacji (Punkty społeczności → Konto → Usuń konto).',
        ],
      },
      {
        h: '4. Punkty, komentarze, zdjęcia i oceny',
        p: [
          'Wpisy są publiczne: po zatwierdzeniu przez moderatora zobaczą je wszyscy użytkownicy GRANI razem z Twoją nazwą (nie adresem e-mail). Zapisujemy położenie i wysokość punktu, rodzaj, tytuł, treść, datę, Twoją nazwę i powiązanie z kontem, a do ochrony przed nadużyciami także system, wersję aplikacji, język i skrót identyfikatora instalacji.',
          'Zdjęcia aplikacja przed wysłaniem zmniejsza do najwyżej 2048 pikseli i zapisuje jako JPEG (jakość 75%). Serwer przelicza je ponownie i usuwa wszystkie metadane, w tym położenie GPS, datę i model aparatu. Jedna osoba może dodać najwyżej 3 zdjęcia do punktu. Nie publikuj zdjęć, na których da się rozpoznać inne osoby bez ich zgody, ani danych osobowych w treści wpisów.',
          'Gdy w pobliżu jest już podobny punkt, aplikacja zaproponuje dołączenie wpisu do niego, a moderator może scalić dwa punkty w jeden – komentarze i zdjęcia obu punktów trafiają wtedy do jednego.',
          'Podstawa prawna: art. 6 ust. 1 lit. b RODO (publikacja wpisów, które dodajesz) i art. 6 ust. 1 lit. f RODO (moderacja i bezpieczeństwo serwisu).',
        ],
      },
      {
        h: '5. Dane techniczne i bezpieczeństwo',
        p: [
          'Serwer nie zapisuje Twojego adresu IP. Do limitów (np. liczby wpisów na kwadrans) i blokowania nadużyć używa jego skrótu z losową solą, którego nie da się zamienić z powrotem na adres. Połączenia są szyfrowane (HTTPS), hasła i tokeny sesji przechowujemy wyłącznie jako skróty.',
          'Podstawa prawna: art. 6 ust. 1 lit. f RODO (uzasadniony interes – bezpieczeństwo serwisu i użytkowników).',
        ],
      },
      {
        h: '6. Zgłoszenia błędów i sugestie',
        p: [
          'Gdy sam wyślesz zgłoszenie z aplikacji („Zgłoś błąd lub sugestię”) albo zgodzisz się wysłać raport po awarii, trafiają do nas: treść, wersja aplikacji, system, opis urządzenia, przy raporcie o awarii – opis błędu i koniec dziennika programu, a opcjonalnie Twój adres e-mail do odpowiedzi. Nic nie jest wysyłane bez Twojej decyzji. Zgłoszenia usuwamy po ich obsłużeniu.',
        ],
      },
      {
        h: '7. Usługi zewnętrzne',
        p: [
          'Żeby pokazać mapę, aplikacja pobiera dane bezpośrednio od ich dostawców: kafle i dane OpenStreetMap (OpenFreeMap, serwery Overpass, wyszukiwarka Nominatim), modele terenu (m.in. Mapterhorn, AWS Terrain Tiles), ortofotomapy i mapy krajowe (np. Geoportal, ČÚZK, ZBGIS, swisstopo, Esri), pogodę (Open-Meteo) i komunikaty lawinowe (np. TOPR, laviny.sk, EAWS). Jak przy każdym połączeniu internetowym dostawcy widzą adres IP urządzenia i żądany fragment mapy – nie przekazujemy im żadnych danych konta. Aktualizacje i pliki instalacyjne idą przez redzikowski.com z serwisu GitHub.',
          'Dane konta i wpisów przechowujemy na serwerze redzikowski.com; dostęp do nich ma tylko administrator. Dostawca serwera i poczty e-mail przetwarza je wyłącznie na nasze zlecenie. Nie sprzedajemy danych i nie udostępniamy ich do celów marketingowych.',
        ],
      },
      {
        h: '8. Jak długo przechowujemy dane',
        p: [
          'Konto i jego dane – do usunięcia konta. Wpisy – dopóki są potrzebne użytkownikom mapy albo do ich usunięcia przez Ciebie lub moderatora. Po usunięciu konta usuwamy Twoje zdjęcia, a punkty i komentarze zostają jako anonimowe (bez nazwy i powiązania z kontem); jeśli chcesz usunąć także je, napisz do nas. Skróty adresów IP do limitów są trzymane w pamięci serwera najwyżej kilkanaście minut.',
        ],
      },
      {
        h: '9. Twoje prawa',
        p: [
          'Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz sprzeciwu wobec przetwarzania opartego na uzasadnionym interesie. Masz też prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl). Podanie danych jest dobrowolne, ale bez adresu e-mail i hasła nie założysz konta.',
          'Konto mogą zakładać osoby, które ukończyły 16 lat.',
        ],
      },
      {
        h: '10. Zmiany polityki',
        p: [
          'O istotnych zmianach poinformujemy w aplikacji. Aktualna wersja jest zawsze w aplikacji i na redzikowski.com/aplikacje/gran/prywatnosc.',
        ],
      },
    ],
  },
  en: {
    title: 'GRAŃ privacy policy',
    lead: 'GRAŃ is a free 3D trail atlas for Windows, Android and iOS. This policy explains what data the app and your account on redzikowski.com process, why, for how long and what your rights are. Most data stays on your device – only what you send yourself reaches the server.',
    sections: [
      {
        h: '1. Data controller',
        p: [
          'The controller is Adam Rędzikowski, author of GRAŃ and operator of redzikowski.com. For any matter concerning your personal data, write to the app support address below or use the contact form on redzikowski.com.',
        ],
      },
      {
        h: '2. What stays on your device',
        p: [
          'Settings, your library of routes, places and views, downloaded maps and offline areas, the app log and your account details (e-mail, name and session token – never the password) are stored only on your device. The app does not use GPS or device location and has no ads, analytics or tracking.',
        ],
      },
      {
        h: '3. User account',
        p: [
          'An account is only needed to add points, comments, photos and ratings. Browsing the map and other people’s points works without one.',
          'When you register we store: your e-mail address, the name shown with your posts, a password hash (scrypt – we never know the password itself), the date of registration and of accepting this policy, the last sign-in date, the system and app version, and hashes of session tokens. We only send account e-mails: the activation link and the password reset link – no newsletters or ads.',
          'Legal basis: Art. 6(1)(b) GDPR (providing the service you request by creating an account).',
          'An account that is not activated via the e-mail link is deleted after a few days. You can delete your account at any time in the app (Community points → Account → Delete account).',
        ],
      },
      {
        h: '4. Points, comments, photos and ratings',
        p: [
          'Posts are public: once approved by a moderator, every GRAŃ user sees them together with your name (never your e-mail). We store the point’s location and elevation, type, title, text, date, your name and account link, and – to prevent abuse – the system, app version, language and a hash of the installation identifier.',
          'Before upload the app scales photos down to at most 2048 pixels and saves them as JPEG (quality 75%). The server re-encodes them and removes all metadata, including GPS location, date and camera model. One person can add at most 3 photos to a point. Do not publish photos in which other people can be recognised without their consent, or personal data in your posts.',
          'If a similar point already exists nearby, the app suggests adding your post to it, and a moderator can merge two points into one – comments and photos of both then end up in a single point.',
          'Legal basis: Art. 6(1)(b) GDPR (publishing the posts you add) and Art. 6(1)(f) GDPR (moderation and security of the service).',
        ],
      },
      {
        h: '5. Technical data and security',
        p: [
          'The server does not store your IP address. For limits (e.g. posts per quarter of an hour) and abuse prevention it uses a hash with a random salt that cannot be turned back into the address. Connections are encrypted (HTTPS); passwords and session tokens are stored only as hashes.',
          'Legal basis: Art. 6(1)(f) GDPR (legitimate interest – security of the service and its users).',
        ],
      },
      {
        h: '6. Bug reports and suggestions',
        p: [
          'When you send a report from the app (“Report a bug or suggestion”) or agree to send a crash report, we receive: the text, app version, system, device description, for crash reports – the error and the end of the app log, and optionally your e-mail for a reply. Nothing is sent without your decision. Reports are deleted once handled.',
        ],
      },
      {
        h: '7. Third-party services',
        p: [
          'To show the map, the app downloads data directly from its providers: OpenStreetMap tiles and data (OpenFreeMap, Overpass servers, Nominatim search), terrain models (e.g. Mapterhorn, AWS Terrain Tiles), orthophotos and national maps (e.g. Geoportal, ČÚZK, ZBGIS, swisstopo, Esri), weather (Open-Meteo) and avalanche bulletins (e.g. TOPR, laviny.sk, EAWS). As with any internet connection, providers see the device’s IP address and the requested map area – we never pass them any account data. Updates and installers are delivered through redzikowski.com from GitHub.',
          'Account and post data are stored on the redzikowski.com server and only the administrator has access to them. The server and e-mail provider process them solely on our behalf. We do not sell data or share it for marketing.',
        ],
      },
      {
        h: '8. Retention',
        p: [
          'Account data – until the account is deleted. Posts – as long as they are useful to map users or until you or a moderator remove them. When you delete your account we delete your photos; points and comments remain anonymous (without your name or account link) – write to us if you want them removed too. IP hashes used for limits are kept in server memory for at most a quarter of an hour.',
        ],
      },
      {
        h: '9. Your rights',
        p: [
          'You have the right to access, rectify and erase your data, to restrict processing, to data portability and to object to processing based on legitimate interest. You may also lodge a complaint with a supervisory authority – in Poland the President of the Personal Data Protection Office (UODO, ul. Stawki 2, 00-193 Warsaw, uodo.gov.pl). Providing data is voluntary, but an account requires an e-mail address and a password.',
          'You must be at least 16 years old to create an account.',
        ],
      },
      {
        h: '10. Changes',
        p: [
          'We will announce significant changes in the app. The current version is always available in the app and at redzikowski.com/aplikacje/gran/prywatnosc.',
        ],
      },
    ],
  },
}
