# Architektura MVP

## Cel

Aplikacja na Androida ma pomagac w katalogowaniu ksiazek na podstawie OCR z grzbietow, a pozniej wspierac eksport, edycje, sprzedaz i pozyczanie.

## Glowny przeplyw

1. Uzytkownik robi zdjecie polki lub pojedynczego segmentu.
2. Aplikacja przetwarza obraz lokalnie.
3. OCR rozpoznaje tekst z grzbietow.
4. Warstwa logiki grupuje tekst na kandydatow ksiazek.
5. Uzytkownik zatwierdza lub poprawia dane.
6. Ksiazki trafiaja do lokalnego katalogu.
7. Katalog mozna filtrowac, edytowac i eksportowac.

## Proponowany stos

- `Expo + React Native` jako szkielet aplikacji mobilnej
- `TypeScript` dla bezpieczniejszego rozwoju
- `zustand` dla lekkiego stanu aplikacji
- `SQLite` jako lokalna baza danych offline-first
- `ML Kit Text Recognition` jako docelowy silnik OCR na Androidzie
- `expo-file-system` do eksportu plikow

## Moduly

### `src/screens`

Widoki aplikacji:
- ekran startowy
- ekran kamery
- ekran przegladu OCR
- ekran katalogu
- ekran eksportu

### `src/features/scanning`

Logika zwiazana z:
- zrobieniem zdjecia
- obrotem i kadrowaniem
- wywolaniem OCR
- grupowaniem tekstu na grzbiety

### `src/storage`

Repozytoria i docelowo integracja z SQLite.

### `src/features/export`

Eksport do:
- `CSV`
- `JSON`

## Model danych ksiazki

Minimalny zestaw:
- `id`
- `title`
- `author`
- `isbn`
- `shelfLocation`
- `imageUri`
- `ocrText`
- `status`
- `price`
- `borrowedTo`
- `notes`
- `createdAt`
- `updatedAt`

## Plan wdrozenia

### Etap 1

- gotowy szkielet mobilny
- lista ksiazek z danych testowych
- przygotowany model danych
- przygotowany eksport do tekstu

### Etap 2

- ekran aparatu
- zapis zdjecia
- integracja z OCR
- ekran zatwierdzenia wynikow

### Etap 3

- SQLite
- filtrowanie i wyszukiwanie
- statusy sprzedazy i pozyczania
- eksport do plikow

## Najwieksze ryzyka

- pionowy tekst na grzbietach
- slabe swiatlo i cienie
- kilka grzbietow w jednym obszarze
- OCR nie rozpozna autora i tytulu jako osobnych pol

Dlatego MVP powinno od poczatku zakladac reczna korekte po skanowaniu.
