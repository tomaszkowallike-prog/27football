# 27football (Cuiavia Soccer)

Zręcznościowa piłka nożna w stylu starych gier 8-bitowych (inspiracja: Nekketsu Soccer League). Zawodnicy to płaskie postacie pixel art, a stadion jest w 3D, z rozmyciem tilt-shift i aberracją chromatyczną.

## Jak uruchomić

Gra to statyczna strona, nic nie trzeba budować.

- **GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root. Gra będzie pod `https://<login>.github.io/27football/`.
- **Lokalnie:** `python3 -m http.server` w tym folderze, potem http://localhost:8000. Otwarcie `index.html` bezpośrednio z dysku nie zadziała, bo przeglądarka blokuje wtedy wczytywanie plików.

three.js jest ładowany z CDN (jsdelivr).

## Sterowanie

| Klawiatura | Telefon | Akcja |
|---|---|---|
| Strzałki / WASD | krzyżak | ruch, dwa razy w tę samą stronę = sprint |
| J | PODAJ | podanie |
| K | STRZAŁ | strzał; w powietrzu główka, wolej, przewrotka |
| L | WŚLIZG | wślizg; w powietrzu kopnięcie z wyskoku |
| Spacja | SKOK | skok, także z piłką |

Super strzał: skocz z piłką i strzel na samym szczycie skoku. Faul w polu karnym to rzut karny.

## Pliki

- `index.html`: HUD, menu, intro, pad dotykowy
- `game.js`: cała gra (three.js, fizyka, AI, dźwięk, muzyka)
- `atlas_*.png`, `frames.json`: sprite'y zawodników
- `fans.png`, `flag*.png`, `crowdfront.png`, `extras.json`: kibice i flagi
- `intro*.mp4`, `intro*.jpg`: filmy intro
- `shout*.mp3`: okrzyki zawodników
