// Online ranking (RANKING): after a training the player can sign the score with three letters, arcade style,
// and see the top list. Scores live in a Supabase table (pixels_scores) that only takes three capital letters
// and a sane score; the publishable key below can read and add scores, nothing else.
(() => {
  const URL_ = 'https://vcqvzwdmxzgmtsrmxkez.supabase.co/rest/v1', KEY = 'sb_publishable_3sza0pzxfYY6ke5FhcT2QQ_TRtK1Jh9';
  const $ = (id) => document.getElementById(id), EN = () => window.LANG === 'en', T = (pl, en) => (EN() ? en : pl);
  const BAD = ['KUR', 'CHJ', 'HUJ', 'HUY', 'JEB', 'JBC', 'CIP', 'PIZ', 'PZD', 'FUK', 'FCK', 'FUC', 'SEX', 'ASS', 'DIK', 'KKK', 'NAZ', 'CUM', 'FAG', 'NIG', 'WTF', 'SSS', 'KUT', 'DUP', 'CWL', 'SUK', 'GEJ', 'PED', 'ZYD'];
  const GAMES = { kapki: ['KAPKI', 'KEEPY-UPS', 'kapek', 'touches'] };
  const H = { apikey: KEY, 'Content-Type': 'application/json' };
  const api = (path, body, extra = {}) => fetch(URL_ + path, { method: 'POST', headers: { ...H, ...extra }, body: JSON.stringify(body) })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.status === 201 || r.status === 204 ? null : r.json(); });
  const top = (g) => api('/rpc/pixels_top', { g, lim: 20 });
  const send = (nick, game, score) => api('/pixels_scores', { nick, game, score }, { Prefer: 'return=minimal' });

  const css = document.createElement('style'); css.textContent = `
  #rank { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; background: rgba(6,4,18,.72); font-family: "Press Start 2P", monospace; color: #fff; }
  #rank[hidden] { display: none; }
  #rank .rb { position: relative; width: min(94vw, 560px); max-height: 92vh; overflow-y: auto; background: #0c0a1e; border: 4px solid #fff; box-shadow: 0 0 0 4px #1a1030, 8px 8px 0 4px #ff4fb8; padding: 18px 18px 16px; text-align: center; }
  #rank h3 { margin: 0 0 6px; font-size: clamp(12px, 2.4vw, 18px); color: #ffe14a; letter-spacing: .08em; } #rank .sub { font-size: clamp(7px, 1.4vw, 10px); color: #b8b0e0; line-height: 1.8; margin: 0 0 12px; }
  #rank .rx { position: absolute; right: 8px; top: 8px; width: 34px; height: 34px; font: 12px "Press Start 2P", monospace; color: #fff; background: #e8302a; border: 3px solid #000; cursor: pointer; }
  #rank .slots { display: flex; justify-content: center; gap: 14px; margin: 6px 0 14px; }
  #rank .slot { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  #rank .slot button { width: 52px; height: 34px; font: 14px "Press Start 2P", monospace; color: #1a1030; background: #3ce6c8; border: 3px solid #000; box-shadow: 0 3px 0 #000; cursor: pointer; }
  #rank .slot b { display: grid; place-items: center; width: 52px; height: 62px; font-size: 34px; color: #ffe14a; background: #1a1540; border: 3px solid #7a6ad8; }
  #rank .slot.on b { border-color: #ff4fb8; box-shadow: 0 0 0 3px #ff4fb8; }
  #rank .score { font-size: clamp(9px, 1.8vw, 13px); margin: 0 0 12px; } #rank .score em { font-style: normal; color: #ffe14a; }
  #rank .go { font: clamp(10px, 1.8vw, 13px) "Press Start 2P", monospace; padding: 12px 18px; margin: 4px; color: #1a1030; background: #6ee05a; border: 3px solid #000; box-shadow: 0 4px 0 #000; cursor: pointer; }
  #rank .go.ghost { background: #d8d4e8; } #rank .go:disabled { opacity: .5; }
  #rank ol { list-style: none; margin: 0 0 12px; padding: 0; font-size: clamp(8px, 1.6vw, 12px); text-align: left; }
  #rank li { display: grid; grid-template-columns: 3.2em 1fr auto; gap: 8px; padding: 7px 8px; border-bottom: 2px dashed #2a2456; }
  #rank li:nth-child(1) span:first-child { color: #ffd21a; } #rank li:nth-child(2) span:first-child { color: #d8d8e0; } #rank li:nth-child(3) span:first-child { color: #e0904a; }
  #rank li.me { background: #ff4fb8; color: #1a1030; } #rank li.me span { color: #1a1030 !important; } #rank li span:last-child { color: #ffe14a; } #rank li.me span:last-child { color: #1a1030; }
  #rank .msg { font-size: clamp(8px, 1.5vw, 11px); color: #ff8a8a; line-height: 1.8; min-height: 1em; margin: 0 0 10px; }`;
  document.head.appendChild(css);
  const ov = document.createElement('div'); ov.id = 'rank'; ov.hidden = true; ov.innerHTML = '<div class="rb"></div>'; document.body.appendChild(ov);
  const box = ov.querySelector('.rb'), close = () => { ov.hidden = true; };
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let nick = ['A', 'A', 'A'], at = 0, pending = null, sent = false;
  try { const s = localStorage.getItem('rank_nick'); if (/^[A-Z]{3}$/.test(s)) nick = [...s]; } catch (e) {}
  const beep = () => window.SZFX?.drip?.();
  const slots = () => box.querySelector('.slots').innerHTML = nick.map((c, i) => `<div class="slot${i === at ? ' on' : ''}" data-i="${i}"><button data-d="-1" aria-label="up">▲</button><b>${c}</b><button data-d="1" aria-label="down">▼</button></div>`).join('');
  const roll = (i, d) => { nick[i] = A[(A.indexOf(nick[i]) + d + 26) % 26]; at = i; beep(); slots(); };

  // sign the score: three letters picked with the arrows (or typed), then send
  const ask = (game, score) => { pending = { game, score }; sent = false; at = 0; const G = GAMES[game];
    box.innerHTML = `<button class="rx">✕</button><h3>${T('WPISZ SWOJE INICJAŁY', 'ENTER YOUR INITIALS')}</h3><p class="sub">${T('3 litery. Twój wynik trafi do rankingu online.', '3 letters. Your score goes to the online ranking.')}</p>
      <p class="score">${T(G[0], G[1])}: <em>${score}</em> ${T(G[2], G[3])}</p><div class="slots"></div><p class="msg"></p>
      <button class="go" id="rsend">${T('ZAPISZ', 'SAVE')}</button><button class="go ghost" id="rlist">${T('RANKING', 'RANKING')}</button>`;
    slots(); ov.hidden = false;
    box.querySelector('.rx').onclick = close;
    box.querySelector('.slots').onclick = (e) => { const s = e.target.closest('.slot'); if (!s) return; const b = e.target.closest('button'); if (b) roll(+s.dataset.i, +b.dataset.d); else { at = +s.dataset.i; slots(); } };
    $('rlist').onclick = () => show(game);
    $('rsend').onclick = () => { const n = nick.join(''), m = box.querySelector('.msg');
      if (BAD.includes(n)) { m.textContent = T('Wybierz inne litery.', 'Pick other letters.'); return; }
      if (sent) return; $('rsend').disabled = true; m.style.color = '#b8b0e0'; m.textContent = T('Wysyłam...', 'Sending...');
      try { localStorage.setItem('rank_nick', n); } catch (e) {}
      send(n, game, score).then(() => { sent = true; window.SZFX?.coin?.(); show(game, { nick: n, score }); })
        .catch(() => { $('rsend').disabled = false; m.style.color = ''; m.textContent = T('Nie udało się połączyć. Sprawdź internet i spróbuj jeszcze raz.', 'Could not connect. Check the internet and try again.'); }); }; };

  // the top 20, best score per three letters; your own line lights up pink
  const show = (game, me) => { const G = GAMES[game] || GAMES.kapki;
    box.innerHTML = `<button class="rx">✕</button><h3>${T('RANKING', 'RANKING')} · ${T(G[0], G[1])}</h3><p class="sub">${T('Najlepsi gracze na świecie', 'Best players in the world')}</p><ol><li><span></span><span>${T('Ładuję...', 'Loading...')}</span><span></span></li></ol>
      <button class="go ghost" id="rback">${pending && !sent ? T('◀ WRÓĆ', '◀ BACK') : T('ZAMKNIJ', 'CLOSE')}</button>`;
    ov.hidden = false; box.querySelector('.rx').onclick = close;
    $('rback').onclick = () => (pending && !sent ? ask(pending.game, pending.score) : close());
    top(game).then((rows) => { const ol = box.querySelector('ol'); if (!rows || !rows.length) { ol.innerHTML = `<li><span></span><span>${T('Jeszcze nikt. Bądź pierwszy!', 'Nobody yet. Be the first!')}</span><span></span></li>`; return; }
      ol.innerHTML = ''; rows.forEach((r, i) => { const li = document.createElement('li'); if (me && r.nick === me.nick) li.className = 'me';
        ['#' + (i + 1), r.nick, r.score].forEach((v) => { const s = document.createElement('span'); s.textContent = v; li.appendChild(s); }); ol.appendChild(li); }); })
      .catch(() => { box.querySelector('ol').innerHTML = `<li><span></span><span>${T('Brak połączenia z rankingiem.', 'No connection to the ranking.')}</span><span></span></li>`; }); };

  addEventListener('keydown', (e) => { if (ov.hidden) return; e.stopPropagation(); const k = e.key.toUpperCase();
    if (e.key === 'Escape') { close(); return; } if (!box.querySelector('.slots')) return;
    if (/^[A-Z]$/.test(k)) { nick[at] = k; at = Math.min(2, at + 1); beep(); slots(); }
    else if (e.key === 'ArrowLeft') { at = Math.max(0, at - 1); slots(); } else if (e.key === 'ArrowRight') { at = Math.min(2, at + 1); slots(); }
    else if (e.key === 'ArrowUp') roll(at, -1); else if (e.key === 'ArrowDown') roll(at, 1); else if (e.key === 'Enter') $('rsend')?.click(); }, true);

  window.RANK = { ask, show };
})();
