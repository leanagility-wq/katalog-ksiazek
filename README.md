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
4. Otworz projekt w Expo Go lub zbuduj `npm run android`.

## Struktura

- `App.tsx` - punkt wejscia aplikacji
- `src/screens` - glowne widoki
- `src/components` - wspolne komponenty UI
- `src/features` - logika domenowa, m.in. skanowanie i eksport
- `src/storage` - repozytorium i SQLite
- `src/types` - typy danych
- `docs/ARCHITEKTURA.md` - plan techniczny MVP

## Kolejne kroki

- podlaczyc natywne OCR Androida przez ML Kit
- zapisac katalog w SQLite
- dodac aparat i przeplyw zatwierdzania skanu
- podlaczyc eksport do pliku
