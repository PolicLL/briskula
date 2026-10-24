# Briškula

Dalmatinska briškula u pregledniku: protiv botova, online s prijateljima i na turnirima.

**Igraj:** https://policll.github.io/briskula/

## Što ima

- 2, 3 i 4 igrača (2 igrača klasično ili na duplo, 3 igrača bez dvice dinara, 4 igrača 2 na 2 s pokazivanjem karata kad se špil potroši)
- botovi u tri jačine; jaki bot simulira moguće raspodjele i završnicu igra savršeno
- online sobe s poveznicom, botovi popune prazna mjesta, mečevi do 1, 2 ili 3 pobjede
- turniri za 4, 8, 16 ili 32 igrača sa ždrijebom
- profil (ime, slika, bodovi, razina), rang lista
- tko izađe iz igre ima 1 minutu da se vrati, inače pobjeđuje onaj tko je ostao

## Kod

| Datoteka | Sadržaj |
|---|---|
| `engine.js` | pravila igre i umjetna inteligencija botova |
| `cloud.js` | veza s Firebaseom (prijava, baza) |
| `app1.js` – `app6.js` | sučelje: profil, igra, sobe, turniri, rang lista, povratak u igru |
| `style.css`, `body.html` | izgled i HTML |
| `firestore.rules` | pravila pristupa bazi |
| `build.py` | slaže sve u `index.html` (to je stranica na GitHub Pages) |
| `harness.js`, `mockcloud.js`, `t_*.js` | testovi (Node + Playwright, s lažnom bazom) |

Nakon izmjene: `python3 build.py`, pa commit i `index.html`.

Karte: skenovi Modiano Trevisane špila iz projekta [ivan17039/briskula-card-game](https://github.com/ivan17039/briskula-card-game).
