# FreelanceFlow PWA

## Wat zit erin?
- Installatiebare PWA-configuratie met PNG-appiconen.
- Service worker met app-shell caching.
- Offline openen nadat de app minstens één keer online geladen is.
- Statusindicator voor online/offline.
- Installatieknop wanneer de browser de installatieprompt aanbiedt.

## Belangrijke beperking
De uren, klanten en projecten worden in deze versie nog steeds lokaal in de browser opgeslagen (`localStorage`).
Ze synchroniseren dus NIET automatisch tussen telefoon en computer. Voor synchronisatie is een cloudbackend met gebruikersaccounts en database nodig, bijvoorbeeld Supabase. Daarvoor moet je zelf een Supabase-project aanmaken en de project-URL en anon key toevoegen. Deel nooit een service-role key.

## Publiceren met GitHub Pages
1. Maak of open een GitHub-account.
2. Maak een nieuwe repository, bijvoorbeeld `freelanceflow`.
3. Pak deze ZIP uit.
4. Upload de inhoud van de map, zodat `index.html`, `manifest.json`, `sw.js`, `icon.svg` en de map `icons` rechtstreeks in de hoofdmap van de repository staan.
5. Ga naar Settings → Pages.
6. Kies bij Build and deployment: Deploy from a branch.
7. Kies branch `main` en map `/ (root)`, klik Save.
8. Wacht tot GitHub Pages een URL toont.
9. Open die URL via HTTPS op je computer en telefoon.

## Installeren
- Android/Chrome: open de website, kies Install app of via browsermenu → Install app.
- iPhone/iPad: open de website in Safari → Deel → Zet op beginscherm.
- Computer: gebruik het installatie-icoon in de adresbalk of de knop in de app, als je browser dit ondersteunt.

## Testen
1. Open de gepubliceerde HTTPS-website terwijl je online bent.
2. Navigeer door de app zodat externe bibliotheken (Tailwind, Chart.js, Lucide en fonts) geladen en gecachet worden.
3. Herlaad de app minstens één keer.
4. Zet daarna vliegtuigmodus aan en open de app opnieuw.
5. Test timer, handmatige invoer, projecten, rapporten en CSV-export.

Let op: de externe bibliotheken worden bij de eerste online sessie opgehaald. Voor een gegarandeerd volledig offline eerste gebruik moeten die bibliotheken lokaal meegeleverd worden.
