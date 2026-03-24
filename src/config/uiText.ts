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
    enrichMissingDataButton: "Uzupełnij brakujące dane z sieci",
    enrichingMissingDataButton: "Uzupełniam dane z sieci...",
    enrichingMissingDataProgress: (current: number, total: number, title: string) =>
      `Sprawdzam ${current} z ${total}: ${title}`,
    enrichingMissingDataDone: (updated: number, total: number) =>
      `Uzupełniono dane dla ${updated} z ${total} zaznaczonych książek.`,
    enrichingMissingDataPartial: (
      updated: number,
      processed: number,
      total: number
    ) =>
      `Zapisano ${updated} zmian. Przetworzono ${processed} z ${total} książek przed zatrzymaniem batcha.`,
    enrichingMissingDataNothingToDo:
      "Zaznaczone książki mają już komplet ISBN i gatunku.",
    enrichingMissingDataSelectBooks:
      "Najpierw zaznacz książki, którym chcesz uzupełnić dane z sieci.",
    enrichingMissingDataRateLimited:
      "Google Books chwilowo ograniczyło zapytania. Zapisane wyniki już zostały zachowane.",
    forceRetryLookupLabel: "Wymuś ponowne wyszukiwanie dla wszystkich zaznaczonych",
    filtersShowButton: "Pokaż filtry",
    filtersHideButton: "Ukryj filtry",
    filtersActiveSummary: (count: number) => `Aktywne filtry: ${count}`,
    batchShowButton: "Operacje zbiorcze",
    batchHideButton: "Ukryj operacje",
    genreFilterLabel: "Filtr gatunku",
    genreFilterAll: "Wszystkie gatunki",
    locationFilterLabel: "Filtr lokalizacji",
    locationFilterAll: "Wszystkie lokalizacje",
    searchPlaceholder: "Szukaj po tytule, autorze, gatunku, ISBN albo lokalizacji",
    batchSelectedLabel: (count: number) => `Zaznaczono: ${count}`,
    batchModeHint: "Przytrzymaj tytuł książki, aby zaznaczać wiele pozycji naraz.",
    visibleWithoutLocationLabel: (count: number) => `Bez lokalizacji: ${count}`,
    visibleWithoutIsbnLabel: (count: number) => `Bez ISBN: ${count}`,
    visibleWithoutGenreLabel: (count: number) => `Bez gatunku: ${count}`,
    visibleNeedsReviewLabel: (count: number) => `Do poprawy: ${count}`,
    selectAllVisible: "Zaznacz wszystko",
    selectNoLocation: "Bez lokalizacji",
    selectNeedsReview: "Do poprawy",
    clearSelection: "Wyczyść",
    batchStatusTitle: "Ustaw status dla zaznaczonych",
    batchLocationTitle: "Przypisz lokalizację zaznaczonym",
    batchLocationPlaceholder: "Wpisz lokalizację dla zaznaczonych",
    batchSaveLocation: "Ustaw lokalizację",
    batchClearLocation: "Wyczyść lokalizację",
    batchApplying: "Zapisywanie zmian...",
    batchApplyingStatus: (status: string) => `Ustawiam status: ${status}`,
    batchApplyingLocation: (location: string) => `Przypisuję lokalizację: ${location}`,
    batchApplyingClearLocation: "Usuwam lokalizację z zaznaczonych",
    lazyLoadedCount: (loaded: number, total: number) =>
      `Widoczne: ${loaded} z ${total}`,
    lazyLoadingMore: "Dociągam kolejne książki...",
    emptyTitle: "Nie ma jeszcze pasujących książek.",
    emptyDescription:
      "Zeskanuj półkę albo dodaj tytuł ręcznie, a potem uzupełnij szczegóły z sieci."
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
      genre: "Gatunek",
      genrePlaceholder: "Np. fantastyka, kryminał, edukacja",
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
  duplicates: {
    title: "Wykryto duplikat",
    subtitle:
      "Ta książka wygląda na duplikat istniejącego wpisu. Wybierz, co chcesz z nią zrobić.",
    currentBook: "Nowy lub edytowany wpis",
    matchesTitle: "Podobne wpisy w katalogu",
    overwriteButton: "Nadpisz ten wpis",
    saveCopyButton: "Dodaj jako osobną kopię",
    rejectButton: "Odrzuć duplikat",
    cancelButton: "Anuluj",
    existingLocationFallback: "Brak lokalizacji",
    existingAuthorFallback: "Autor do uzupełnienia",
    existingTitleFallback: "Bez tytułu",
    existingStatusLabel: "Status",
    existingLocationLabel: "Lokalizacja",
    existingReasonLabel: "Powód dopasowania"
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
    apiKeyPresent: "OCR online",
    apiKeyMissing: "Fallback lokalny"
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
      "Dodaj lokalizacje pojedynczo. Później będą dostępne w szybkiej edycji książek.",
    locationsLabel: "Nowa lokalizacja",
    locationsPlaceholder: "Np. Salon / Półka A",
    locationsSavedInfo: "Lista lokalizacji została zapisana.",
    genresTitle: "Zapisane gatunki",
    genresSubtitle:
      "Dodaj gatunki pojedynczo. Później będą dostępne przy edycji książek i wyszukiwaniu online.",
    genresLabel: "Nowy gatunek",
    genresPlaceholder: "Np. fantastyka, kryminał, edukacja",
    genresSavedInfo: "Lista gatunków została zapisana.",
    saveGenresButton: "Dodaj gatunek",
    genresEmpty: "Nie masz jeszcze zapisanych gatunków.",
    saveLocationsButton: "Dodaj lokalizację",
    locationsEmpty: "Nie masz jeszcze zapisanych lokalizacji.",
    removeLocationButton: "Usuń",
    saveButton: "Zapisz klucz API",
    savingButton: "Zapisywanie...",
    clearButton: "Usuń klucz z telefonu",
    busyButton: "Pracuję..."
  }
};
