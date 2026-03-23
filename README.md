# Katalog Ksiazek

Szkielet aplikacji mobilnej na Androida do katalogowania domowego zbioru ksiazek na podstawie OCR z grzbietow.

## Zakres MVP

- skanowanie polki lub fragmentu polki aparatem
- wstepne OCR grzbietow ksiazek
- reczna korekta danych po skanie
- lokalny katalog ksiazek
- eksport do CSV i JSON
- statusy: dostepna, pozyczona, na sprzedaz, sprzedana

## Uruchomienie

1. Zainstaluj Node.js 20+.
2. Uruchom `npm install`.
3. Uruchom `npm run start`.
4. Do OCR potrzebny jest natywny build Androida, wiec uruchamiaj `npm run android`, a nie samo Expo Go.

## OCR Android

- aplikacja probuje najpierw OCR online przez OpenAI Vision
- klucz API wpisujesz w zakladce `Ustawienia`
- klucz jest trzymany lokalnie przez `expo-secure-store`
- skan robi zdjecie przez `expo-camera`
- OCR analizuje zapisany obraz i kieruje wynik do ekranu review
- jesli OCR online zawiedzie, aplikacja probuje fallback lokalny, a na koncu fallback testowy

## Struktura

- `App.tsx` - punkt wejscia aplikacji
- `src/components` - naglowek, przyciski i dolna nawigacja
- `src/screens` - glowne widoki
- `src/features` - logika domenowa, m.in. skanowanie i eksport
- `src/storage` - repozytorium i SQLite
- `src/types` - typy danych
- `docs/ARCHITEKTURA.md` - plan techniczny MVP

## Kolejne kroki

- zapisac eksport do pliku przez `expo-file-system`
- dodac wyszukiwanie i filtrowanie ksiazek
- poprawic heurystyke rozdzielania autora i tytulu z OCR
- docelowo przeniesc wywolanie OpenAI z telefonu na backend proxy, jesli aplikacja ma byc publiczna
