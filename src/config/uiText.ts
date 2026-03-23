import type { TabKey } from "@/components/TabBar";

export const appText = {
  header: {
    eyebrow: "Domowa biblioteka",
    title: "Katalog książek"
  },
  tabs: [
    { key: "library", label: "Katalog" },
    { key: "scan", label: "Skan" },
    { key: "review", label: "Przegląd" },
    { key: "export", label: "Eksport" },
    { key: "settings", label: "Ustawienia" }
  ] as Array<{ key: TabKey; label: string }>,
  library: {
    title: "Katalog",
    loading: "Ładowanie biblioteki...",
    countLabel: (count: number) => `Pozycji w katalogu: ${count}`,
    scanButton: "Zeskanuj nową półkę",
    addManualButton: "Dodaj ręcznie",
    browseTitle: "Przeglądaj i poprawiaj",
    browseSubtitle:
      "Otwórz książkę, aby dopisać dane, wyszukać metadane online albo usunąć wpis.",
    searchPlaceholder: "Szukaj po tytule, autorze, ISBN albo lokalizacji",
    emptyTitle: "Nie ma jeszcze pasujących książek.",
    emptyDescription:
      "Zeskanuj półkę albo dodaj tytuł ręcznie, a potem uzupełnij szczegóły z sieci.",
    guideTitle: "Jak to działa",
    guideSubtitle: "Najwygodniejszy sposób pracy z katalogiem na telefonie.",
    guideSteps: [
      "1. Zeskanuj półkę albo dodaj książkę ręcznie.",
      "2. Otwórz wpis i popraw tytuł, autora, lokalizację albo status.",
      "3. Użyj przycisku \"Wyszukaj w sieci\", gdy chcesz dobrać ISBN lub lepsze metadane.",
      "4. W razie potrzeby usuń wpis jednym przyciskiem z poziomu edycji."
    ]
  },
  editor: {
    createTitle: "Dodaj książkę",
    editTitle: "Edytuj książkę",
    subtitle: "Uzupełnij dane ręcznie albo podpowiedz je wyszukiwaniem online.",
    backButton: "Wróć",
    cancelButton: "Anuluj",
    deleteButton: "Usuń",
    deletingButton: "Usuwanie...",
    searchButton: "Wyszukaj w sieci",
    searchingButton: "Szukam...",
    saveButton: "Zapisz w katalogu",
    savingButton: "Zapisywanie...",
    missingTitleAlertTitle: "Brakuje tytułu",
    missingTitleAlertDescription: "Uzupełnij tytuł przed zapisem.",
    saveErrorTitle: "Nie udało się zapisać książki",
    deleteConfirmTitle: "Usunąć książkę?",
    deleteConfirmDescription: "Ta operacja usunie wpis z katalogu.",
    deleteErrorTitle: "Nie udało się usunąć książki",
    retryLabel: "Spróbuj ponownie.",
    noResults: "Nie znaleziono podobnych tytułów.",
    fetchError: "Nie udało się pobrać wyników.",
    firstEditionLabel: (year: number) => `Pierwsze wydanie: ${year}`,
    unknownEditionLabel: "Rok wydania nieznany",
    fields: {
      title: "Tytuł",
      titlePlaceholder: "Np. Lalka",
      author: "Autor",
      authorPlaceholder: "Np. Bolesław Prus",
      isbn: "ISBN",
      optionalPlaceholder: "Opcjonalnie",
      location: "Lokalizacja",
      locationPlaceholder: "Np. Salon / Półka A",
      price: "Cena",
      pricePlaceholder: "Np. 24.99",
      borrowedTo: "Pożyczona komu",
      ocrText: "OCR / tekst z grzbietu",
      ocrTextPlaceholder: "Surowy tekst ze skanu",
      notes: "Notatki",
      notesPlaceholder: "Stan, uwagi, komplet serii...",
      status: "Status"
    }
  },
  review: {
    title: "Przegląd OCR",
    noScanSubtitle:
      "Nie ma jeszcze aktywnego skanu. Najpierw przejdź do ekranu skanowania.",
    backToScan: "Wróć do skanowania",
    backToScanShort: "Wróć do skanu",
    saveButton: "Zapisz w katalogu",
    savingButton: "Zapisywanie...",
    saveError: "Nie udało się zapisać książek.",
    summary: (count: number, total: number) => `Wymaga uwagi: ${count} z ${total}`,
    subtitle: (imageLabel: string, count: number) =>
      `Skan: ${imageLabel}. Rozpoznane pozycje: ${count}`,
    helper:
      "Sprawdź przede wszystkim wpisy oznaczone do uwagi. To one najczęściej wymagają ręcznej korekty.",
    imageSource: (uri: string) => `Źródło obrazu: ${uri}`,
    positionTitle: (index: number) => `Pozycja ${index + 1}`,
    rawOcr: (text: string) => `Surowy OCR: ${text || "brak"}`,
    needsAttention: "Sprawdź ręcznie",
    looksGood: "Wygląda dobrze",
    titleField: "Tytuł",
    titlePlaceholder: "Tytuł książki",
    authorField: "Autor",
    authorPlaceholder: "Autor",
    noScore: "Brak oceny",
    confidenceHigh: (value: number) => `Wysoka pewność (${value}%)`,
    confidenceMedium: (value: number) => `Średnia pewność (${value}%)`,
    confidenceLow: (value: number) => `Niska pewność (${value}%)`
  },
  export: {
    title: "Eksport danych",
    subtitle:
      "Na tym etapie przygotowany jest poprawny format eksportu. Kolejny krok to zapis do pliku na urządzeniu.",
    csvLabel: "CSV",
    jsonLabel: "JSON"
  },
  scan: {
    title: "Skanowanie",
    subtitle:
      "Najlepsze wyniki daje mały fragment półki: zwykle 3–6 grzbietów, ale przy cienkich książkach może być ich więcej.",
    cameraNotReady: "Kamera nie jest jeszcze gotowa do wykonania zdjęcia.",
    processing:
      "Robię zdjęcie i analizuję 3–6 grzbietów z centralnej części kadru...",
    savePhotoError: "Nie udało się zapisać zdjęcia do analizy.",
    scanError: "Nie udało się wykonać skanu.",
    openAiSuccess: "OCR online zakończony. Przechodzę do przeglądu.",
    localSuccess: "Używam lokalnego OCR jako fallbacku. Przechodzę do przeglądu.",
    mockSuccess: "Uruchomiłem awaryjny fallback z przykładowymi danymi.",
    cameraMountError: (message: string) => `Błąd kamery: ${message}`,
    permissionTitle: "Kamera czeka na zgodę",
    permissionDescription:
      "Przy pierwszym uruchomieniu aplikacja poprosi o dostęp do aparatu.",
    permissionButton: "Nadaj uprawnienia kamery",
    guideTitle: "Celuj w środkowy obszar kadru",
    guideDescription:
      "Najlepiej, jeśli w jednym zdjęciu widzisz kilka wyraźnych grzbietów i niewiele tła po bokach. Cienkich książek może być więcej niż 5.",
    captureButton: "Zrób zdjęcie i skanuj",
    processingButton: "Przetwarzanie...",
    tipsTitle: "Jak skanować",
    tipsSubtitle:
      "Tu naprawdę liczy się sposób robienia zdjęcia, nie tylko sam model OCR.",
    tips: [
      "1. Skanuj małe fragmenty półki, nie cały regał.",
      "2. Utrzymuj telefon równolegle do grzbietów książek.",
      "3. Unikaj odbić światła i cienia na lakierowanych okładkach.",
      "4. Jeśli jeden grzbiet jest węższy lub pionowy, zeskanuj go osobno."
    ],
    apiKeyPresent: "Klucz API jest zapisany. Użyjemy mocniejszego OCR online.",
    apiKeyMissing:
      "Brak klucza API. Ustaw go w zakładce Ustawienia, żeby włączyć OCR online."
  },
  settings: {
    title: "OCR online",
    subtitle:
      "Tutaj podajesz własny klucz OpenAI API. Klucz jest trzymany lokalnie na telefonie, a nie w kodzie aplikacji.",
    inputLabel: "OpenAI API key",
    helper:
      "Po zapisaniu skan wyśle zdjęcie półki do modelu wizji i zwróci listę rozpoznanych książek do korekty.",
    savedInfo: "Klucz API zapisany lokalnie w SecureStore.",
    clearedInfo: "Klucz API został usunięty z urządzenia.",
    locationsTitle: "Zapisane lokalizacje",
    locationsSubtitle:
      "Wpisz lokalizacje po jednej w każdej linii. Później będą dostępne w szybkiej edycji książek.",
    locationsLabel: "Lista lokalizacji",
    locationsPlaceholder: "Salon / Półka A\nGabinet / Regał 2\nSypialnia / Szafka",
    locationsSavedInfo: "Lista lokalizacji została zapisana.",
    saveLocationsButton: "Zapisz lokalizacje",
    saveButton: "Zapisz klucz API",
    savingButton: "Zapisywanie...",
    clearButton: "Usuń klucz z telefonu",
    busyButton: "Pracuję..."
  }
};
