// Language: Polish (default) or English. The game is written in Polish; in English every text on the page and every
// text drawn on a canvas goes through this dictionary (exact phrases first, then a few patterns for texts with numbers
// and names in them). Pictures with words on them have an English twin (tablica_en.jpg, szatnia_base_en.jpg).
(() => {
  let lang = null; try { lang = localStorage.getItem('lang'); } catch (e) {}
  window.LANG = lang || 'pl';
  window.setLang = (l) => { try { localStorage.setItem('lang', l); } catch (e) {} location.reload(); };
  const D = {
    // start, menus, settings
    'Pixels Soccer': 'Pixels Soccer', 'OBRÓĆ TELEFON POZIOMO': 'TURN YOUR PHONE SIDEWAYS', 'Gra działa tylko w poziomie': 'The game only works in landscape',
    'POMIŃ ▶▶': 'SKIP ▶▶', '🔊 WŁĄCZ DŹWIĘK': '🔊 SOUND ON', 'MAPA': 'MAP', 'DŹWIĘK: TAK': 'SOUND: ON', 'DŹWIĘK: NIE': 'SOUND: OFF', '☰ MENU': '☰ MENU',
    'USTAWIENIA': 'SETTINGS', 'Ustawienia': 'Settings', 'Zamknij': 'Close', 'Głośność muzyki': 'Music volume', 'Efekty dźwiękowe (SFX)': 'Sound effects (SFX)',
    'Czas połowy meczu': 'Half length', 'Poziom rywala': 'Rival level', 'Wibracje (telefon)': 'Vibration (phone)', 'Pad dotykowy': 'Touch pad', 'Język': 'Language',
    'WYCZYŚĆ REKORDY': 'CLEAR RECORDS', 'WYJDŹ Z GRY': 'QUIT GAME', 'ZAMKNIJ': 'CLOSE', 'NA PEWNO?': 'ARE YOU SURE?', 'TAK': 'YES', 'NIE': 'NO',
    'BUTELKA?': 'BOTTLE?', 'Znalazłeś ukrytą grę! Chcesz rzucać butelką?': 'You found a hidden game! Want to flip a bottle?', 'WYBIERZ BUTELKĘ': 'PICK A BOTTLE',
    'WYBIERZ BOISKO': 'PICK A PITCH', 'TURNIEJ': 'TOURNAMENT', 'DOWOLNY MECZ': 'FREE MATCH', 'ŁATWY': 'EASY', 'NORMALNY': 'NORMAL', 'MISTRZ': 'MASTER', 'TRUDNY': 'HARD', 'SKLEP': 'SHOP',
    'Turniej: wygraj mecz, żeby odblokować następne boisko. Na końcu czeka MROCZNY ZAMEK.': 'Tournament: win a match to unlock the next pitch. The DARK CASTLE waits at the end.',
    'Na Księżycu, w oceanie, w niebie i na stacji niższa grawitacja: piłka i skoki lecą wyżej.': 'On the Moon, in the ocean, in the sky and on the station gravity is lower: the ball and jumps go higher.',
    'Monety zdobywasz za gole, wygrane, czyste konto, gole z mocy, etapy turnieju i kapki. Na trudniejszym poziomie dostajesz więcej.': 'You earn coins for goals, wins, clean sheets, power goals, tournament stages and keepy-uppies. Harder levels pay more.',
    'PAUZA': 'PAUSE', 'WZNÓW': 'RESUME', 'WYJDŹ Z MECZU': 'LEAVE MATCH', 'FIOLETOWI': 'PURPLES', 'FIO': 'PUR', 'Obróć telefon poziomo, będzie wygodniej.': 'Turn your phone sideways, it is easier.',
    'ruch (albo': 'move (or', 'albo dwa razy w tę samą stronę = sprint': 'or twice the same way = sprint', 'z piłką: PODAJ': 'with the ball: PASS', '· bez piłki:': '· without the ball:',
    'ZMIANA': 'SWITCH', 'zawodnika': 'player', 'z piłką: STRZAŁ': 'with the ball: SHOOT', '(przytrzymaj = mocniej) · bez piłki:': '(hold = harder) · without the ball:',
    'WŚLIZG': 'TACKLE', ', a gdy piłka leci: główka': ', and when the ball is in the air: header', '★ SUPER STRZAŁ': '★ SUPER SHOT', ', kiedy masz piłkę: wybierasz, który': ', when you have the ball: you pick which one',
    'rzut karny: wybierz róg i strzel': 'penalty: pick a corner and shoot', 'Gałka': 'Stick', 'ruch; wychyl do końca = sprint': 'move; push all the way = sprint', 'Zielony': 'Green',
    'z piłką PODAJ, bez piłki ZMIANA': 'with the ball PASS, without it SWITCH', 'Czerwony': 'Red', 'z piłką STRZAŁ (przytrzymaj = mocniej), bez piłki WŚLIZG': 'with the ball SHOOT (hold = harder), without it TACKLE',
    'super strzał, gdy masz piłkę': 'super shot when you have the ball',
    'Grasz DOMINIKIEM, blondynem z 27. Bez piłki sterujesz tym, kto jest najbliżej (żółta strzałka). 2 połowy po 2:00, faul w polu karnym to karny.': 'You play as DOMINIK, the blond number 27. Without the ball you control whoever is nearest (yellow arrow). 2 halves of 2:00, a foul in the box is a penalty.',
    'WCZYTUJĘ…': 'LOADING…', 'albo': 'or', 'KONIEC': 'FULL TIME', 'REWANŻ': 'REMATCH', 'DALEJ': 'NEXT', 'BOISKA': 'PITCHES', 'Pies': 'Dog', 'KAPITAN · ROZGRYWAJĄCY': 'CAPTAIN · PLAYMAKER',
    'Wróć': 'Back', 'Graj': 'Play', 'WYBIERZ KAPITANA': 'PICK YOUR CAPTAIN', 'CO ROBIMY?': 'WHAT NOW?', 'MECZ': 'MATCH', 'Pixels kontra Fioletowi': 'Pixels vs the Purples',
    'KARNE': 'PENALTIES', 'seria rzutów karnych': 'a penalty shootout', 'KAPKI': 'KEEPY-UPPY', 'dotykaj kółek, żongluj piłką': 'tap the circles, juggle the ball', 'BUT': 'BOOT',
    'zawiąż sznurówki': 'tie your laces', 'KAPSLE': 'BOTTLE CAPS', 'wyścig kapsli po torze': 'a bottle-cap race', 'BIEG': 'RACE', 'wyścig dookoła boiska': 'a race around the pitch',
    '◀ SZATNIA': '◀ LOCKER ROOM', 'REKORD': 'BEST', 'DOTYKAJ KÓŁEK!': 'TAP THE CIRCLES!', 'Masz chwilę na każde, inaczej piłka spadnie.': 'You have a moment for each, or the ball drops.',
    'PIŁKA SPADŁA': 'THE BALL DROPPED', 'kapek': 'touches', 'JESZCZE RAZ': 'AGAIN', 'ZAPISZ WYNIK': 'SAVE SCORE', 'MENU': 'MENU', '✕ MENU': '✕ MENU', 'WYBIERZ SUPER STRZAŁ': 'PICK A SUPER SHOT', 'BIDON PEŁNY!': 'BOTTLE FULL!', 'Rozlej punkty w szatni: STATYSTYKI': 'Pour the points in the locker room: STATS', 'BIDON': 'BOTTLE', 'Ten trening': 'This training', 'Brakuje do pełnego': 'Left to fill', 'Pełny rozlejesz w szatni': 'Pour it in the locker room when full', 'DO BIDONU': 'TO THE BOTTLE', 'BIDON PEŁNY! Rozlej punkty w szatni': 'BOTTLE FULL! Pour the points in the locker room', 'PEŁNY!': 'FULL!', 'Punkty wlane': 'Points poured', 'STATYSTYKI': 'STATS', 'WLEJ ▶': 'POUR ▶', 'Przesuń suwaki, żeby rozlać punkty, i wciśnij WLEJ.': 'Move the sliders to share the points, then press POUR.', 'Bidon napełnisz w treningach: bieg, kapki, karne i mecze. Punkty rozlejesz, gdy będzie pełny.': 'Fill the bottle by training: race, keepy-uppy, penalties and matches. Pour the points once it is full.', 'PALUCHY?': 'TOES?', 'Znalazłeś ukrytą grę w paluchy! Chcesz zagrać?': 'You found a hidden toe game! Want to play?', 'WYBIERZ MOC': 'PICK A POWER', 'użyj ·': 'use ·', 'wyjdź': 'leave', 'Dotknij mocy albo WRÓĆ': 'Tap a power or BACK',
    '← → wybierz ·': '← → choose ·', 'strzał · albo': 'shoot · or', 'Dotknij strzału, który chcesz oddać': 'Tap the shot you want to take', 'JAK GRAĆ': 'HOW TO PLAY',
    'PODAJ': 'PASS', 'STRZAŁ': 'SHOOT', '★ SUPER': '★ SUPER', 'GŁÓWKA': 'HEADER',
    'Przyciski same się zmieniają: gdy masz piłkę, zielony podaje, a czerwony strzela (przytrzymaj, żeby strzelić mocniej). Bez piłki zielony zmienia zawodnika, a czerwony robi wślizg.': 'The buttons change by themselves: with the ball, green passes and red shoots (hold to shoot harder). Without the ball, green switches player and red tackles.',
    'świeci, gdy masz piłkę: wtedy wybierasz super strzał. Kolorowe kostki na boisku dają nowe super strzały.': 'lights up when you have the ball: then you pick a super shot. Coloured boxes on the pitch give you new super shots.',
    'zielony ·': 'green ·', 'czerwony ·': 'red ·', '★ ·': '★ ·', 'sprint': 'sprint', 'Wychyl gałkę do końca, żeby biec sprintem. Możesz też dotknąć kolegi na boisku.': 'Push the stick all the way to sprint. You can also tap a teammate on the pitch.',
    '▶ DOTKNIJ ALBO WCIŚNIJ KLAWISZ, ŻEBY GRAĆ': '▶ TAP OR PRESS A KEY TO PLAY', '♪ WYŁ': '♪ OFF', 'DESZCZ': 'RAIN', 'WIATR': 'WIND',
    'PIXELS WYGRYWA!': 'PIXELS WIN!', 'WYGRALI FIOLETOWI': 'THE PURPLES WIN', 'REMIS': 'DRAW', 'GRAJ': 'PLAY', 'WYŁĄCZONA': 'OFF', 'WŁĄCZONE': 'ON', 'WYŁĄCZONE': 'OFF', 'AUTO': 'AUTO', 'ZAWSZE': 'ALWAYS', 'WYŁĄCZONY': 'OFF',
    'Zmiana pada zadziała po ponownym uruchomieniu gry.': 'The pad change works after restarting the game.', 'Nowy czas połowy od następnego meczu.': 'The new half length starts next match.',
    'Wyjść z gry? Wrócisz do ekranu startowego.': 'Quit the game? You will go back to the start screen.', 'WYJŚCIE': 'EXIT', 'Wyczyścić wszystkie rekordy?': 'Clear all records?', 'Wyjść z meczu? Wynik przepadnie.': 'Leave the match? The score will be lost.',
    // shop, rewards
    'SZYBKIE BUTY': 'FAST BOOTS', 'Drużyna biega 6% szybciej': 'The team runs 6% faster', 'TURBO BUTY': 'TURBO BOOTS', 'Biegasz 10% szybciej': 'You run 10% faster', 'ZŁOTE BUTY': 'GOLDEN BOOTS',
    '+12% szybkości i mocniejsze strzały': '+12% speed and harder shots', 'OGNISTA PIŁKA': 'FIRE BALL', 'Pomarańczowa piłka': 'An orange ball', 'KOSMICZNA PIŁKA': 'COSMIC BALL', 'Fioletowa piłka z gwiazd': 'A purple ball made of stars',
    'ZŁOTA PIŁKA': 'GOLDEN BALL', 'Złota i 10% mocniejsze strzały': 'Gold, and 10% harder shots', 'RĘKAWICE BRAMKARZA': 'KEEPER GLOVES', 'Twój bramkarz łapie więcej super strzałów': 'Your keeper stops more super shots',
    'NAPÓJ ENERGII': 'ENERGY DRINK', 'Szybciej odzyskujesz siły': 'You get your breath back faster', 'KARTA NA START': 'STARTER CARD', 'Każdy mecz zaczynasz z losową mocą': 'Start every match with a random power',
    'MÓJ POKÓJ': 'MY ROOM', 'POKÓJ GRACZA': "PLAYER'S ROOM", 'PODAJ KOD': 'ENTER THE CODE', 'Sklep jeszcze się buduje. Zajrzyj tu później!': 'The shop is still being built. Check back later!', 'KOSZULKA PIXELS': 'PIXELS SHIRT', 'CZERWONA KOSZULKA': 'RED SHIRT', 'NIEBIESKIE PASY': 'BLUE STRIPES', 'ZŁOTA KOSZULKA': 'GOLD SHIRT', 'Twoja pierwsza koszulka': 'Your first shirt', 'Wisi w szafie w Twoim pokoju': 'Hangs in the wardrobe in your room', 'Biało-niebieskie pasy, do szafy w pokoju': 'White and blue stripes, for the wardrobe in your room', 'Dla mistrza. Wisi w szafie w pokoju': 'For a champion. Hangs in the wardrobe in your room',
    'ZAŁOŻONE': 'EQUIPPED', 'MASZ': 'OWNED', 'ZAŁÓŻ': 'EQUIP', 'ZA MAŁO MONET': 'NOT ENOUGH COINS', 'Gole': 'Goals', 'Gole z mocy': 'Power goals', 'Wygrana': 'Win', 'Remis': 'Draw', 'Za udział': 'For playing',
    'Czyste konto': 'Clean sheet', 'Nowy etap': 'New stage', 'MISTRZ TURNIEJU': 'TOURNAMENT CHAMPION', 'POKONAŁEŚ MROCZNY ZAMEK! JESTEŚ MISTRZEM!': 'YOU BEAT THE DARK CASTLE! YOU ARE THE CHAMPION!',
    'REMIS: trzeba wygrać, żeby przejść dalej': 'DRAW: you need a win to go on', 'Przegrana: spróbuj jeszcze raz': 'Lost: try again', 'MONET': 'COINS', 'FINAŁ: ': 'FINAL: ', 'POZIOM': 'LEVEL', 'MAKS': 'MAX', 'TROFEA': 'TROPHIES', 'WARSZTAT': 'WORKSHOP', '▶ EDYTUJ BUTA': '▶ EDIT THE BOOT', 'BOK': 'SIDE', 'PODESZWA': 'SOLE', '◀ WRÓĆ': '◀ BACK', 'STRZAŁ': 'SHOOT',
    'Na start masz 3 boiska. Każda wygrana w turnieju odkrywa kolejne. Na Księżycu, w oceanie, w niebie i na stacji niższa grawitacja: piłka i skoki lecą wyżej.': 'You start with 3 pitches. Every tournament win unlocks another. On the Moon, in the ocean, in the sky and on the station gravity is lower: the ball and jumps go higher.',
    // squad
    'POMOCNIK': 'MIDFIELDER', 'NAPASTNIK': 'STRIKER', 'OBROŃCA': 'DEFENDER', 'BRAMKARZ': 'GOALKEEPER', 'PODANIE': 'PASSING', 'DRYBLING': 'DRIBBLING', 'OBRONA': 'DEFENCE', 'PRĘDKOŚĆ': 'SPEED', 'NOWY REKORD!': 'NEW RECORD!',
    'ZAKRĘCONA SPIRALA': 'TWISTED SPIRAL', 'TRĄBA POWIETRZNA': 'WHIRLWIND', 'ZMIEŃ IMIĘ': 'RENAME', 'SZYMONOWY ZYGZAK': "SZYMON'S ZIGZAG", 'KUJAWSKA PETARDA': 'KUJAWY FIRECRACKER', 'KRUCZY ŁUK': 'RAVEN ARC',
    'ŚLIWKOWA BOMBA': 'PLUM BOMB', 'LAWENDOWY WIR': 'LAVENDER WHIRL', 'FIOLETOWY PIORUN': 'PURPLE THUNDER', 'ELEKTRYCZNY STRZAŁ': 'ELECTRIC SHOT', 'TY': 'YOU', 'FW · TY': 'FW · YOU',
    // match
    'GOL!': 'GOAL!', 'GOL': 'GOAL', 'BŁYSKAWICA': 'LIGHTNING', 'ROZDWOJENIE': 'SPLIT', 'MEGA PIŁKA': 'MEGA BALL', 'WILK': 'WOLF', 'SMOK': 'DRAGON', 'ROBOT': 'ROBOT', 'PORTALE': 'PORTALS',
    'SZALONA PIŁKA': 'CRAZY BALL', 'LASER Z KOSMOSU': 'SPACE LASER', 'TRĄBA POWIETRZNA': 'TORNADO', 'BŁYSKAWICA!': 'LIGHTNING!', 'WILK!': 'WOLF!', 'SMOK!': 'DRAGON!', 'ROBOT!': 'ROBOT!', 'PORTALE!': 'PORTALS!',
    'SZALONA PIŁKA!': 'CRAZY BALL!', 'TRĄBA POWIETRZNA!': 'TORNADO!', 'NINJA': 'NINJA', 'NINJA!': 'NINJA!', 'GORYL': 'GORILLA', 'GORYL!': 'GORILLA!', 'Uga buga!': 'Ooga booga!', 'Cień!': 'Shadow!', 'LASER Z KOSMOSU!': 'SPACE LASER!', 'STRZELAJ!': 'SHOOT!', 'PUSTA BRAMKA!': 'EMPTY GOAL!', 'BRAMKARZ LEŻY!': 'KEEPER IS DOWN!',
    'BRAMKA RYWALA': 'RIVAL GOAL', 'TWOJA BRAMKA': 'YOUR GOAL', 'GOL DLA CIEBIE!': 'A GOAL FOR YOU!', 'OJ... SAMOBÓJ!': 'OOPS... OWN GOAL!', 'LOSOWANIE...': 'SPINNING...', 'ŁADOWANIE': 'CHARGING', 'OGNIA!': 'FIRE!',
    'KARNY!': 'PENALTY!', 'OBRONA!': 'SAVE!', '2. POŁOWA': '2ND HALF', 'KICK OFF!': 'KICK OFF!',
    'Leć!': 'Go!', 'Losujemy!': 'Spin it!', 'Mam to!': 'Got it!', 'Piorun!': 'Thunder!', 'Pusta bramka!': 'Empty goal!', 'Satelita, ognia!': 'Satellite, fire!', 'Smoku, leć!': 'Fly, dragon!', 'Smoku!': 'Dragon!',
    'Robot, start!': 'Robot, go!', 'Teraz!': 'Now!', 'Wiej!': 'Blow!', 'Ha! Moje!': 'Ha! Mine!', 'Ratunku!': 'Help!', 'Wilk!': 'Wolf!', 'Yeah!': 'Yeah!',
    // penalties
    'NAD POPRZECZKĄ!': 'OVER THE BAR!', 'OBOK!': 'WIDE!', 'GOOOL!': 'GOOOAL!', 'ZATRZYMAJ CZERWONĄ KROPKĘ NA ŚRODKU': 'STOP THE RED DOT IN THE MIDDLE', 'TERAZ NIEBIESKĄ': 'NOW THE BLUE ONE',
    'DOTKNIJ BRAMKI I PRZECIĄGNIJ CELOWNIK': 'TOUCH THE GOAL AND DRAG THE SIGHT', 'ZATRZYMAJ SIŁĘ': 'STOP THE POWER', 'LOSOWANIE MOCY!': 'POWER SPIN!', 'RZUT KARNY!': 'PENALTY KICK!',
    'IDEALNIE!': 'PERFECT!', 'PRAWIE...': 'ALMOST...', 'PRZECIĄGNIJ': 'DRAG', 'SIŁA': 'POWER', 'FIOLETOWI STRZELAJĄ…': 'THE PURPLES SHOOT…', 'PUDŁO!': 'MISS!', 'WYGRANA!': 'YOU WIN!', 'PRZEGRANA': 'YOU LOST',
    'DOTKNIJ, ŻEBY ZAGRAĆ JESZCZE RAZ': 'TAP TO PLAY AGAIN',
    // caps
    'GRACZ 2': 'PLAYER 2', 'GRACZ 1': 'PLAYER 1', 'GRACZ 1: NACIĄGNIJ KAPSEL I PUŚĆ': 'PLAYER 1: PULL THE CAP BACK AND LET GO', 'TWÓJ RUCH: NACIĄGNIJ KAPSEL I PUŚĆ': 'YOUR TURN: PULL THE CAP BACK AND LET GO',
    '1 GRACZ': '1 PLAYER', '2 GRACZY': '2 PLAYERS', 'na zmianę na 1 telefonie': 'taking turns on 1 phone', 'FIOLETOWI W BRAMCE': 'THE PURPLES SCORE', 'GOOOL! JESTEŚ W BRAMCE': 'GOOOAL! YOU SCORED',
    'FIOLETOWI POZA TOREM! +1': 'PURPLES OFF THE TRACK! +1', 'POZA TOREM! +1 STRZAŁ': 'OFF THE TRACK! +1 SHOT', 'META': 'FINISH', 'Kto zrobi mniej strzałów do mety, wygrywa': 'Fewest shots to the finish wins',
    'przeciągnij do tyłu i puść': 'drag back and let go', 'FIOLETOWI CELUJĄ…': 'THE PURPLES AIM…', 'DOTKNIJ, ŻEBY WRÓCIĆ DO WYBORU': 'TAP TO GO BACK',
    // bottle flip
    'PODWÓJNY FLIP!': 'DOUBLE FLIP!', 'POTRÓJNY FLIP!': 'TRIPLE FLIP!', 'POCZWÓRNY FLIP!': 'QUADRUPLE FLIP!', 'FLIP!': 'FLIP!', 'BEZ OBROTU SIĘ NIE LICZY': 'NO SPIN, NO POINT', 'DO GÓRY DNEM!': 'UPSIDE DOWN!', 'ZA MOCNO': 'TOO HARD', 'ZA SŁABO': 'TOO SOFT',
    'MACHNIJ TELEFONEM W GÓRĘ': 'FLICK THE PHONE UP', 'PRZESUŃ PALCEM W GÓRĘ': 'SWIPE UP', 'Ta przeglądarka nie daje czujnika ruchu - otwórz grę w Chrome': 'This browser has no motion sensor - open the game in Chrome',
    'RUCH': 'MOTION', 'Weź telefon jak butelkę i machnij nim lekko w górę,': 'Hold the phone like a bottle and flick it gently up,', 'jakbyś podrzucał butelkę. Ma zrobić fikołka': 'as if tossing a bottle. It must flip',
    'i stanąć na denku.': 'and land on its bottom.', 'ZACZYNAMY': "LET'S GO", 'Trzymaj telefon mocno!  Bez czujników: przesuń palcem w górę.': 'Hold the phone tight!  No sensors: swipe up.',
    'Woda': 'Water', 'Cola': 'Cola', 'Cytryna': 'Lemon', 'Truskawka': 'Strawberry', 'Duża woda': 'Big water',
    // laces
    'OD CZERWONEGO!': 'FROM THE RED!', 'ZA DALEKO!': 'TOO FAR!', 'NIE PUSZCZAJ!': "DON'T LET GO!", 'ZAWIĄŻ BUTA!': 'TIE THE BOOT!', 'Przesuń palcem po sznurówce: od CZERWONEGO do ZIELONEGO': 'Slide along the lace: from RED to GREEN',
    'Coraz szybciej! · dotknij, żeby zacząć': 'Faster and faster! · tap to start', 'GOTOWY…': 'READY…', 'START!': 'GO!', 'ZAWIĄZANE!': 'TIED!', 'SZNURÓWKA SIĘ ROZWIĄZAŁA': 'THE LACE CAME UNDONE', 'ZA WOLNO!': 'TOO SLOW!',
    // race
    'ZMĘCZENIE': 'TIREDNESS', 'TEMPO': 'PACE', 'ZMĘCZONY! ZWOLNIJ I ODPOCZNIJ': 'TIRED! SLOW DOWN AND REST', 'UWAGA, OPADASZ Z SIŁ': 'CAREFUL, YOU ARE TIRING', 'POCIERAJ PALCEM': 'RUB WITH YOUR FINGER',
    'GÓRA - DÓŁ': 'UP - DOWN', 'Pocieraj ekran palcem w górę i w dół: im szybciej, tym szybciej biegniesz.': 'Rub the screen up and down: the faster you rub, the faster you run.',
    'Za długi sprint męczy. Gdy pasek ZMĘCZENIE dojdzie do końca,': 'Sprinting too long tires you. When the TIREDNESS bar is full,', 'musisz zwolnić i odpocząć. Rozłóż siły na okrążenia!': 'you have to slow down and rest. Pace yourself over the laps!',
    'ILE OKRĄŻEŃ?': 'HOW MANY LAPS?', 'NA START': 'TO THE START', 'WYNIKI': 'RESULTS', 'DOTKNIJ, ŻEBY WRÓCIĆ': 'TAP TO GO BACK',
    // arenas
    'STADION': 'STADIUM', 'PUSTYNIA': 'DESERT', 'KSIĘŻYC': 'MOON', 'ŚNIEG': 'SNOW', 'WULKAN': 'VOLCANO', 'DŻUNGLA': 'JUNGLE', 'OCEAN': 'OCEAN', 'MIASTO PRZYSZŁOŚCI': 'FUTURE CITY', 'DACH WIEŻOWCA': 'SKYSCRAPER ROOF',
    'WIOSKA NINJA': 'NINJA VILLAGE', 'ZAMEK': 'CASTLE', 'KRAINA CUKIERKÓW': 'CANDY LAND', 'HALLOWEEN': 'HALLOWEEN', 'MAGICZNY LAS': 'MAGIC FOREST', 'FABRYKA': 'FACTORY', 'DOLINA DINOZAURÓW': 'DINO VALLEY',
    'WIELKI KANION': 'GRAND CANYON', 'NIEBO': 'SKY', 'ŚWIAT ROBOTÓW': 'ROBOT WORLD', 'CYRK': 'CIRCUS', 'METROPOLIA': 'METROPOLIS', 'KINO': 'CINEMA', 'WIOSKA WIKINGÓW': 'VIKING VILLAGE', 'STACJA KOSMICZNA': 'SPACE STATION',
    'STATEK PIRACKI': 'PIRATE SHIP', 'ZABAWKOWE KLOCKI': 'TOY BRICKS', 'JASKINIA KRYSZTAŁÓW': 'CRYSTAL CAVE', 'SALA GIMNASTYCZNA': 'SCHOOL GYM', 'BAZA ARKTYCZNA': 'ARCTIC BASE', 'DZIKI ZACHÓD': 'WILD WEST',
    'SZERYF': 'SHERIFF', 'ELEKTROWNIA': 'POWER PLANT', 'PORT MORSKI': 'SEAPORT', 'LOTNISKO': 'AIRPORT', 'WESOŁE MIASTECZKO': 'FUNFAIR', 'OPUSZCZONA FABRYKA': 'ABANDONED FACTORY', 'GÓRSKA WIOSKA': 'MOUNTAIN VILLAGE',
    'WIELKA BIBLIOTEKA': 'GREAT LIBRARY', 'KOPALNIA': 'MINE', 'BAGNA': 'SWAMP', 'FARMA GIGANTÓW': 'GIANT FARM', 'DACH GALERII': 'MALL ROOF', 'GALERIA': 'MALL', 'MODA': 'FASHION', 'OGRÓD JAPOŃSKI': 'JAPANESE GARDEN',
    'ARENA GLADIATORÓW': 'GLADIATOR ARENA', 'KRAINA GIGANTÓW': 'LAND OF GIANTS', 'DWORZEC KOLEJOWY': 'TRAIN STATION', 'ODJAZDY': 'DEPARTURES', 'PERON 1': 'PLATFORM 1', 'KRAINA LAWENDOWA': 'LAVENDER LAND',
    'ŚWIAT OWADÓW': 'BUG WORLD', 'PODZIEMNE MIASTO': 'UNDERGROUND CITY', 'GRY': 'GAMES', 'KRAINA GRZYBÓW': 'MUSHROOM LAND', 'WIELKI MOST': 'BIG BRIDGE', 'ŚWIAT ZEGARÓW': 'CLOCK WORLD', 'WIELKI CMENTARZ': 'BIG GRAVEYARD',
    'AKWARIUM': 'AQUARIUM', 'KOLOROWA KRAINA': 'COLOUR LAND', 'PLAŻA': 'BEACH', 'PLAC BUDOWY': 'BUILDING SITE', 'ŚWIAT KART': 'CARD WORLD', 'MROCZNY ZAMEK': 'DARK CASTLE',
  };
  const P = [
    [/^(\d+): (.+)$/, (m, n, t) => `${n}: ${tr(t)}`],
    [/^RYWAL MA: (.+?)(!?)$/, (m, a, b) => `RIVAL GOT: ${tr(a)}${b}`], [/^RYWAL ODPALA: (.+)$/, (m, a) => `RIVAL USES: ${tr(a)}`],
    [/^(.+) \+1$/, (m, a) => (D[a] ? `${D[a]} +1` : m)], [/^ETAP (\d+) ZALICZONY!$/, (m, n) => `STAGE ${n} CLEARED!`],
    [/^\+(\d+) MONET · MASZ (\d+)$/, (m, a, b) => `+${a} COINS · YOU HAVE ${b}`], [/^KUP (\d+)$/, (m, n) => `BUY ${n}`], [/^TRENING: (.+)$/, (m, a) => `TRAINING: ${a}`], [/^\+(\d+) XP (.+)$/m, (m, n, a) => m], [/^FINAŁ: (.+)$/, (m, a) => `FINAL: ${tr(a)}`],
    [/^SUPER STRZAŁ · (.+)$/, (m, a) => `SUPER SHOT · ${a}`], [/^KARNY! (.+): celuj góra\/dół i STRZAŁ$/, (m, a) => `PENALTY! ${a}: aim up/down and SHOOT`],
    [/^KARNY DLA RYWALI! Wybierz stronę rzutu bramkarza: góra\/dół$/, () => 'PENALTY TO THE RIVALS! Pick the side your keeper dives: up/down'],
    [/^(\d+) (.+): CO ROBIMY\?$/, (m, n, a) => `${n} ${a}: WHAT NOW?`], [/^SERIA (\d+)$/, (m, n) => `ROUND ${n}`], [/^(.+) W BRAMCE!$/, (m, a) => `${a} SCORES!`],
    [/^(.+): POZA TOREM! \+1$/, (m, a) => `${a}: OFF THE TRACK! +1`], [/^WYGRYWA (.+)$/, (m, a) => `${a} WINS`], [/^RUCH: (.+)$/, (m, a) => `TURN: ${a}`],
    [/^MIEJSCE (\S+)\s+OKR\. (\S+)\s+(.+)$/, (m, a, b, c) => `PLACE ${a}   LAP ${b}   ${c}`], [/^(\d+)\. MIEJSCE$/, (m, n) => `${n}. PLACE`],
    [/^REKORD \((\d+) okr\., wygrana\): (.+)$/, (m, n, t) => `BEST (${n} laps, win): ${t}`], [/^SZNUROWANIE (.+)$/, (m, a) => `LACING ${a}`],
    [/^WYNIK (.+)$/, (m, a) => `SCORE ${a}`], [/^REKORD (.+)$/, (m, a) => `BEST ${a}`], [/^KONIEC SERII(.*)$/, (m, a) => `STREAK OVER${a}`], [/^Rekord: (.+)$/, (m, a) => `Best: ${a}`],
    [/^ruch: (.+) m\/s², obrót (.+)$/, (m, a, b) => `motion: ${a} m/s², spin ${b}`],
    [/^(Gole|Gole z mocy|Wygrana|Remis|Za udział|Czyste konto|Nowy etap|MISTRZ TURNIEJU)( \(\d+\))?: (.+)$/, (m, a, b, c) => `${D[a]}${b || ''}: ${c}`],
    [/^(.*)NOWY REKORD!(.*)$/, (m, a, b) => `${tr(a)}NEW RECORD!${tr(b)}`], [/^(.*) \+(\d+) monet$/, (m, a, n) => `${tr(a)} +${n} coins`],
    [/^(.+)\(nie doszedł\)(.*)$/, (m, a, b) => tr(`${a}(didn't finish)${b}`)], [/^(.+)\(nie doszli\)(.*)$/, (m, a, b) => tr(`${a}(didn't finish)${b}`)],
  ];
  const tr = (s) => {
    if (window.LANG !== 'en' || typeof s !== 'string' || !s) return s;
    const t = s.trim(); if (!t) return s;
    let o = D[t];
    if (o == null) for (const [re, f] of P) { if (re.test(t)) { o = t.replace(re, f); break; } }
    if (o == null || o === t) return s;
    return s.replace(t, o);
  };
  window.L = tr;
  if (window.LANG !== 'en') return;
  document.documentElement.lang = 'en';
  // canvas text: everything drawn with fillText / strokeText / measureText
  const C = CanvasRenderingContext2D.prototype;
  for (const k of ['fillText', 'strokeText', 'measureText']) { const f = C[k]; C[k] = function (s, ...a) { return f.call(this, tr(String(s)), ...a); }; }
  // pictures with Polish words on them
  const IMG = { 'tablica.jpg': 'tablica_en.jpg', 'szatnia_base.jpg?v=2': 'szatnia_base_en.jpg?v=2', 'szatnia_base.jpg': 'szatnia_base_en.jpg?v=2' };
  const css = document.createElement('style'); css.textContent = '#modes .sbg.tb { background-image: url(tablica_en.jpg) !important; } #trofea .sbg { background-image: url(trofea_bg_en.jpg?v=3) !important; }'; document.head.appendChild(css);
  // page text: translated as it appears and every time it changes
  const fix = (n) => {
    if (n.nodeType === 3) { const v = n.nodeValue, w = tr(v); if (w !== v) n.nodeValue = w; return; }
    if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
    if (n.tagName === 'IMG') { const s = n.getAttribute('src'); if (s && IMG[s]) n.setAttribute('src', IMG[s]); }
    for (const a of ['aria-label', 'title', 'alt']) { const v = n.getAttribute(a); if (v) { const w = tr(v); if (w !== v) n.setAttribute(a, w); } }
    for (const c of n.childNodes) fix(c);
  };
  const start = () => { document.title = 'Pixels Soccer'; fix(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') fix(m.target); else for (const n of m.addedNodes) fix(n); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
