# 27football (Cuiavia Soccer)

Zręcznościowa piłka nożna w stylu starych gier 8-bitowych (inspiracja: Nekketsu Soccer League). Zawodnicy to płaskie postacie pixel art, a stadion jest w 3D, z rozmyciem tilt-shift i aberracją chromatyczną.

## Jak uruchomić

Gra to statyczna strona, nic nie trzeba budować.

- **GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root. Gra będzie pod `https://<login>.github.io/27football/`.
- **Lokalnie:** `python3 -m http.server` w tym folderze, potem http://localhost:8000. Otwarcie `index.html` bezpośrednio z dysku nie zadziała, bo przeglądarka blokuje wtedy wczytywanie plików.

three.js jest ładowany z CDN (jsdelivr).

## Sterowanie

Przyciski same zmieniają działanie zależnie od tego, czy masz piłkę.

| Klawiatura | Telefon | Z piłką | Bez piłki |
|---|---|---|---|
| Strzałki / WASD | gałka | ruch | ruch |
| Shift | gałka w czerwonej strefie | sprint | sprint |
| J | zielony | podanie | zmiana zawodnika |
| K (przytrzymaj = mocniej) | czerwony | strzał | wślizg (gdy piłka leci: główka) |
| L | ★ | super strzał | nieaktywny |

Super strzał: gdy masz piłkę, wciśnij ★. Gra się zatrzyma i wybierasz, który super strzał oddać (strzałki i K, cyfry 1–6 albo dotknięcie karty).

Na boisku pojawiają się kolorowe kostki. Wbiegnij w nią z piłką, a do torby trafia nowy super strzał:

- **BŁYSKAWICA**: pioruny z nieba powalają wszystkich rywali, a ty biegniesz dalej z piłką.
- **ROZDWOJENIE**: lecą trzy piłki naraz, a bramkarz nie wie, która jest prawdziwa.
- **MEGA PIŁKA**: olbrzymia piłka taranuje każdego na swojej drodze.
- **WILK**: zawodnik zmienia się w wilka i pędzi z piłką na bramkę, a rywale uciekają.
- **SMOK**: z nieba sfruwa smok z piłką, zieje ogniem, płonąca piłka leci do bramki i cała bramka staje w ogniu.

Faul w polu karnym to rzut karny. Na telefonie możesz też dotknąć kolegi na boisku, żeby nim sterować.

## Tryb KAPKI

Po PRESS START wybierasz MECZ albo KAPKI. W kapkach Dominik żongluje piłką na stadionie z intra. Na ekranie pojawiają się kółka, a na każde masz około sekundy. Jedno dotknięcie to jedna kapka. Spóźnisz się, piłka spada. Do tego gra 8-bitowa muzyka. Rekord zapisuje się w przeglądarce.

## Pliki

- `index.html`: HUD, menu, intro, pad dotykowy
- `game.js`: cała gra (three.js, fizyka, AI, dźwięk, muzyka)
- `atlas_*.png`, `frames.json`: sprite'y zawodników
- `fans.png`, `flag*.png`, `crowdfront.png`, `extras.json`: kibice i flagi
- `intro*.mp4`, `intro*.jpg`: filmy intro
- `juggle.png`, `kapki_bg.jpg`: tryb kapki
- `btn_*.png`: ikony przycisków
- `creatures.png`, `creatures.json`: wilk i smok
