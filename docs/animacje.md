# Cuiavia Soccer: animacje chłopaków do wygenerowania

Styl: 8-bit (NES), czarny obrys postaci, czysto białe tło (#FFFFFF), stopy zawsze na tej samej linii.
Rozmiar w grze ok. 32×48 px na klatkę. Generuj 4× większe (128×192) i potem pomniejsz bez wygładzania.
Jeden arkusz = jedna animacja, klatki w równej siatce (np. 8×2), ta sama postać i ten sam strój w każdej klatce.
Stroje: koszulka czarna z zielonymi rękawami i białym numerem, czarne spodenki, zielone getry, białe buty.

## Wspólne animacje (dla każdego z czterech chłopaków)

| Grupa | Animacja | Kierunek | Klatki teraz | Klatki docelowo | Pętla | Priorytet | Co w każdej klatce | Kiedy w grze |
|---|---|---|---|---|---|---|---|---|
| Mecz: ruch | Stoi | przód | 1 | 2 | tak | niski | 1: prosto, ręce luźno. 2: lekko w dół (oddech) | czeka, wznowienie gry |
| Mecz: ruch | Stoi | bok (w prawo) | 1 | 2 | tak | niski | jak wyżej, profil | stoi zwrócony w bok |
| Mecz: ruch | Stoi | tył | 1 | 2 | tak | niski | jak wyżej, plecy z numerem | stoi tyłem do kamery |
| Mecz: ruch | Stoi | z góry | 1 | 1 | nie | niski | widok prawie z góry, głowa i ramiona | ujęcia z góry |
| Mecz: ruch | Bieg | bok | 4 | 8 | tak | wysoki | 1: kontakt lewą. 2: ugięcie. 3: odbicie. 4: lot. 5–8: to samo prawą nogą | główny ruch po boisku |
| Mecz: ruch | Bieg | do góry (tyłem) | 4 | 6 | tak | wysoki | 1–3: krok lewą. 4–6: krok prawą, ręce na zmianę | bieg w stronę bramki rywala |
| Mecz: ruch | Bieg | w dół (przodem) | 0 | 6 | tak | wysoki | jak wyżej, twarzą do kamery | bieg w stronę własnej bramki |
| Mecz: ruch | Sprint | bok | 0 | 6 | tak | średni | mocne pochylenie do przodu, długi krok, ręce szeroko pracują | czerwona strefa joysticka |
| Mecz: ruch | Prowadzenie piłki | bok | 0 | 6 | tak | wysoki | jak bieg, piłka przy nodze; w klatce 3 i 6 dotknięcie piłki | ma piłkę i biegnie |
| Mecz: ruch | Prowadzenie piłki | do góry i w dół | 0 | 12 | tak | średni | po 6 klatek przodem i tyłem, piłka przed stopą | ma piłkę, biegnie pionowo |
| Mecz: piłka | Strzał | bok | 2 | 4 | nie | wysoki | 1: zamach nogą do tyłu. 2: kopnięcie. 3: noga wysoko. 4: powrót | przycisk B, puszczony |
| Mecz: piłka | Ładowanie strzału | bok | 0 | 2 | tak | niski | noga cofnięta, drży (dwie wersje lekko przesunięte) | przytrzymanie B |
| Mecz: piłka | Podanie | bok | 0 | 3 | nie | średni | 1: krótki zamach. 2: kopnięcie wewnętrzną stroną. 3: powrót | przycisk A z piłką |
| Mecz: piłka | Wślizg | bok | 1 | 3 | nie | średni | 1: wejście w ślizg. 2: leży bokiem, noga wyciągnięta. 3: hamuje (Szymon: 5 klatek) | B bez piłki |
| Mecz: piłka | Skok | bok | 3 | 3 | nie | niski | 1: przysiad. 2: w powietrzu, kolana w górę. 3: lądowanie | początek super strzału |
| Mecz: piłka | Główka | bok | 3 | 3 | nie | niski | 1: skok, głowa do tyłu. 2: uderzenie głową. 3: opadanie | piłka górą przy głowie |
| Mecz: piłka | Szczupak | bok | 3 | 3 | nie | niski | 1: odbicie. 2: lot poziomo, głowa do piłki. 3: upadek na brzuch | niska piłka górą |
| Mecz: piłka | Przewrotka | bok | 4 | 6 | nie | średni | 1: odbicie. 2–3: przewrót do tyłu. 4: kopnięcie nad głową. 5: spadanie. 6: na plecach | super strzał z powietrza |
| Mecz: emocje | Leży na plecach | bok | 1 | 1 | nie | niski | płasko, ręce rozrzucone | po wślizgu, po błyskawicy |
| Mecz: emocje | Leży na brzuchu | bok | 1 | 1 | nie | niski | twarzą w trawę | po szczupaku, po wilku |
| Mecz: emocje | Wstaje | bok | 3 | 3 | nie | niski | 1: siada. 2: na kolanie. 3: prawie stoi | po każdym upadku |
| Mecz: emocje | Oszołomiony | przód | 2 | 4 | tak | niski | chwieje się na boki, gwiazdki nad głową w 2 pozycjach | po błyskawicy, zderzeniu |
| Mecz: emocje | Radość | przód | 3 | 6 | tak | średni | 1–2: pięść w górę. 3–4: skok z rękami w górze. 5–6: bieg z rozłożonymi rękami | po golu |
| Mecz: emocje | Smutek | przód | 0 | 2 | tak | niski | głowa w dół, ręce na biodrach | po straconym golu (nowe) |
| Minigry | Karny: strzał | zza pleców | 15 | 15 | nie | gotowe | 1–6: rozbieg. 7–9: zamach. 10–11: kopnięcie. 12–15: wybieg za piłką | tryb KARNE |
| Minigry | Karny: ELEKTRYCZNY | zza pleców | 0 | 15 | nie | średni | jak strzał, całe ciało w niebieskich iskrach, coraz mocniej | moc w karnych (gotowe tylko u 27) |
| Minigry | Karny: HALLAND | zza pleców | 0 | 15 | nie | średni | 1–5: siada po turecku. 6–10: unosi się w powietrzu. 11–15: medytuje, piłka leci sama | moc w karnych (gotowe tylko u 27) |
| Minigry | Karny: SMOK | zza pleców | 0 | 15 | nie | niski | przemiana w smoka i zionięcie ogniem w piłkę | moc w karnych (gotowe tylko u 27) |
| Minigry | Kapki: żonglerka | przód | 16 | 16 | tak | gotowe | 0: stoi, piłka przy nodze. 1: piłka spada. 2–15: podbicia na zmianę prawą i lewą | tryb KAPKI |
| Minigry | Szatnia: siedzi | przód | 0 | 2 | tak | niski | siedzi na ławce, oddycha (opcjonalnie macha nogami) | ekran szatni |
| **Razem** | | | **69** | **173** | | | | |

## Zawodnicy: co różni każdego

| Nr | Zawodnik | Wygląd | Osobisty super strzał | Animacja super strzału (4–6 klatek, bok) | Karne: do dorobienia | Uwagi |
|---|---|---|---|---|---|---|
| 27 | DOMINIK (kapitan) | blond, roztrzepane włosy | KUJAWSKA PETARDA (ogień) | zamach z płomieniami wokół nogi | nic, ma strzał, SMOKA, ELEKTRYCZNY i HALLANDA | inni teraz używają jego klatek mocy w karnych |
| 10 | ARTUR | jasne, lekko kręcone, krótkie po bokach | ARTUROWA TRĄBA (tornado) | obrót wokół własnej osi przed strzałem | ELEKTRYCZNY, HALLAND | |
| 14 | SOWA | jasnobrązowe, krótkie po bokach, długa grzywka | SOWIA SPIRALA (podkręcona) | uderzenie zewnętrzną częścią stopy, ciało obrócone | ELEKTRYCZNY, HALLAND | |
| 7 | SZYMON | jasne, proste, krótkie po bokach | SZYMONOWY ZYGZAK | strzał z podskokiem, błyskawica wokół piłki | ELEKTRYCZNY, HALLAND | obrońca: trochę bardziej krępy, wślizg 5 klatek |
| 1 | MAREK (bramkarz) | do ustalenia | – | – | – | gotowość, rzut w bok (4 klatki), skok, trzymanie piłki, wykop |
