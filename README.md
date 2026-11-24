# FEY — Event Filming Crew Management

FEY is een lokaal draaiend productiesysteem voor filmcrews. De regisseur bereidt een
evenement voor op de laptop (shows, podia, cues, camera-instructies) en stuurt
tijdens de voorstelling alle cameramensen realtime aan via hun iPad.

Alles draait lokaal op één computer. Er is geen internetverbinding en geen
externe dienst nodig.

---

## Snel starten

```bash
npm install
npm run dev
```

Daarna:

| Wat | URL |
|---|---|
| Regisseur (laptop) | `http://localhost:3000` |
| Cameraman (iPad) | `http://<LAN-IP>:3000/operator` |

Het IP-adres van de laptop wordt bij het opstarten in de terminal getoond,
bijvoorbeeld `http://192.168.1.100:3000`.

De voorbeeldshow **"Musical 2027"** (3 scènes, 10 cues, 4 camera's, 22
podium-elementen) wordt bij de eerste start automatisch aangemaakt, zodat je
alle functies direct kunt uitproberen.

---

## Vereisten

- **Node.js 22.5 of hoger** (Node 24 wordt aanbevolen).
  Check met `node --version`.
- Een laptop en één of meer iPads op **hetzelfde wifi-netwerk**.
- Geen database-installatie nodig: FEY gebruikt de ingebouwde `node:sqlite`
  driver van Node. Er wordt dus niets native gecompileerd.

---

## Installatiehandleiding

### 1. Node.js installeren

Download Node.js LTS van [nodejs.org](https://nodejs.org) en installeer het.
Herstart daarna je terminal zodat `node` en `npm` beschikbaar zijn.

```bash
node --version   # v22.5.0 of hoger
npm --version
```

### 2. FEY installeren

```bash
cd fey
npm install
```

De installatie duurt een halve minuut. Alle data wordt opgeslagen in
`data/fey.db` (een SQLite-bestand in dezelfde map).

### 3. Starten

**Ontwikkelmodus** (hot reload, handig tijdens het bouwen):

```bash
npm run dev
```

- Server op poort `3000`
- Vite dev-server op poort `5173` (proxy't naar de API)

**Productiemodus** (één proces, serveert de gebouwde frontend):

```bash
npm run build
npm start
```

De server bindt op `0.0.0.0`, dus is bereikbaar vanaf elk apparaat in het
netwerk.

### 4. De iPads koppelen

1. Zet laptop en iPads op hetzelfde wifi-netwerk.
2. Open op de laptop het adres dat bij het opstarten getoond wordt.
3. Open op elke iPad `http://<LAN-IP>:3000/operator`.
4. De cameraman typt zijn **toegangscode** in (4 tekens, staat op de camera).
   Vanaf dat moment ontvangt de iPad automatisch de cues.

> **Tip:** voeg de pagina op de iPad toe aan het startscherm. Dan start hij
> fullscreen, zonder adresbalk — handig tijdens een voorstelling.

### 5. Aan de slag

| Rol | Pad | Wat je doet |
|---|---|---|
| Regisseur | `/` | Dashboard, shows, podia, crew |
| Regisseur | `/shows/:id` | Cues maken, camera's toewijzen, podiumindeling |
| Regisseur | `/stages/:id` | Stage Builder (2D podium nabouwen) |
| Regisseur | `/live/:id` | Live regie tijdens de show |
| Cameraman | `/operator` | Eigen opdracht op de iPad |

---

## Projectstructuur

```
fey/
├── package.json            npm workspaces + scripts
├── data/                   SQLite-database + uploads (aangemaakt bij start)
├── server/
│   └── src/
│       ├── index.ts        Express app, statische bestanden, error handling
│       ├── config.ts       Poorten, paden, LAN-adressen
│       ├── types.ts        Domeintypes (gedeeld met de client)
│       ├── db/
│       │   ├── database.ts     node:sqlite wrapper
│       │   ├── schema.ts       Schema + migraties
│       │   ├── mappers.ts      DB-rijen -> domeinobjecten
│       │   └── seed.ts         Voorbeeldshow
│       ├── routes/         REST-API per domein
│       ├── services/       Domeinlogica (shows, cues, crew, live, pdf)
│       ├── realtime/       Socket.IO-hub
│       └── utils/          Validatie, ids, http-helpers
└── client/
    └── src/
        ├── App.tsx         Routes
        ├── components/     UI, StageCanvas, CueEditor, LiveStageView, ...
        ├── pages/          Per scherm één bestand
        ├── hooks/          useApi, useSocket, useElementSize
        ├── lib/            API-client, socket, geometrie, utils
        └── index.css       Design tokens (donker thema)
```

---

## Belangrijkste functies

### Show management
Meerdere shows aanmaken, dupliceren, archiveren en verwijderen. Een show bevat
scènes, cues, een gekoppeld podium en een cameracrew. **Dupliceren maakt een
volledig zelfstandige kopie, inclusief een eigen podium**, zodat wijzigingen in
de ene show de andere niet raken.

### Stage Builder
2D-editor met bovenaanzicht van het podium (Konva/canvas). Sleep elementen
(podiumvloer, verhoging, achtergrond, trappen, deur, meubels, microfoons,
instrumenten, licht, markeringen, personen, groepen, cameraposities, tekst)
naar de gewenste plek. Per element zijn naam, kleur, omvang, rotatie, laag en
vergrendeling in te stellen. Ondersteunt raster, snapping, zoom, groeperen,
ongedaan maken en automatisch opslaan.

### Cue Editor
Voor elke cue: nummer, naam, scène, beschrijving, tijdcode, duur, camera-
instructies per camera (shot, volgsubject, beweging, notitie), notities voor de
crew en een **eigen podiumindeling** (waar staan de personen en groepen in
deze cue?). De tijdlijn ondersteunt slepen om te herordenen en automatisch
opslaan.

### Live Director Mode
Het centrale bedieningsscherm: huidige cue, volgende cue, alle camera's met
hun instructie, de podiumindeling en de crewstatus. Eén grote knop gaat naar de
volgende cue; daarnaast vorige cue, cue overslaen, een onverwachte cue
invoegen, een bericht naar één cameraman, en een noodmelding naar de hele
crew. **Sneltoetsen**: spatie of → (volgende), ← (vorige), `S` (overslaan),
`E` (noodmelding).

### Camera Operator Mode (iPad)
Groot cue-nummer, wat er filmt, welk shot, welk subject, welke beweging en de
notitie van de regie. Daaronder een vereenvoudigde podiumweergave met de
posities van de acteurs, de andere cameraposities en de eigen cameravak met
kijkrichting. De volgende cue staat alvast klaar als voorbereiding. Kleuren:
groen = actief, oranje = volgende, rood = waarschuwing, grijs = geen opdracht.

### Realtime synchronisatie
Socket.IO met ruimtes per show. Bij het activeren van een cue wordt de nieuwe
state direct naar alle verbonden iPads gepusht — zonder verversen. De server
houdt een volgnummer bij, zodat gemiste updates detecteerbaar zijn.

### Extra's
Shot library met illustraties, cue-notes, crewberichten, oefenmodus,
PDF-export (volledig draaiboek én persoonlijke shotlist per camera),
show-templates, noodmeldingen, verbindingsindicatoren per cameraman,
referentiebeelden per cue en sneltoetsen.

---

## API-overzicht

Alle routes staan onder `/api` en geven JSON terug.

| Methode | Route | Omschrijving |
|---|---|---|
| `GET` | `/health` | Status + LAN-adressen |
| `GET` | `/dashboard/stats` | tellingen voor het dashboard |
| `GET` | `/dashboard/overview` | aankomende, recente, templates, gearchiveerd |
| `GET/POST/PUT/DELETE` | `/shows`, `/shows/:id` | shows |
| `POST` | `/shows/:id/duplicate` | show dupliceren (incl. eigen podium) |
| `POST` | `/shows/:id/from-template` | nieuwe show uit template |
| `GET/PUT` | `/shows/:id/crew` | crew van een show |
| `GET/POST/PUT/DELETE` | `/shows/:id/cues`, `/cues/:id` | cues |
| `POST` | `/shows/:id/cues/reorder` | volgorde van cues |
| `GET/POST/PUT/DELETE` | `/shows/:id/scenes`, `/scenes/:id` | scènes |
| `GET/POST/PUT/DELETE` | `/stages`, `/stages/:id` | podia en elementen |
| `GET/POST/PUT/DELETE` | `/crew`, `/cameras` | crew en camera's |
| `POST` | `/cameras/claim` | camera koppelen met toegangscode |
| `GET` | `/live/:showId/state` | huidige live-status |
| `POST` | `/live/:showId/next`, `/previous`, `/skip`, `/cue` | cue-navigatie |
| `POST` | `/live/:showId/ad-hoc` | onverwachte cue invoegen |
| `POST` | `/live/:showId/rehearsal` | oefenmodus aan/uit |
| `POST` | `/live/:showId/emergency` | noodmelding (leeg = wissen) |
| `POST` | `/live/:showId/direct` | bericht naar één cameraman |
| `GET/POST` | `/messages/:showId` | crewberichten |
| `GET` | `/export/shows/:id/pdf` | draaiboek (PDF) |
| `GET` | `/export/cameras/:id/pdf?showId=` | persoonlijke shotlist (PDF) |
| `GET/POST/DELETE` | `/shot-templates` | shot library |
| `POST` | `/uploads/image` | afbeelding uploaden (data-URL) |

---

## Configuratie via omgevingsvariabelen

| Variabele | Standaard | Betekenis |
|---|---|---|
| `FEY_PORT` | `3000` | poort van de server |
| `FEY_CLIENT_PORT` | `5173` | poort van de Vite dev-server |
| `FEY_EXTRA_PORTS` | — | extra poorten, bijv. `3001,3002` |
| `FEY_DATA_DIR` | `./data` | map voor database en uploads |
| `VITE_API_BASE` | `/api` | basis-URL van de API (client) |
| `VITE_SOCKET_URL` | — | afwijkende Socket.IO-URL (client) |

---

## Scripts

| Script | Werkt het |
|---|---|
| `npm run dev` | server + client met hot reload |
| `npm run build` | bouwt server (`dist/`) en client (`dist/`) |
| `npm start` | draait de gebouwde server inclusief frontend |
| `npm run typecheck` | TypeScript-controle voor server én client |
| `npm run seed` | maakt de voorbeeldshow aan (idempotent) |
| `npm run reset` | verwijdert de voorbeeldshow en maakt hem opnieuw |

---

## Data en back-up

Alle gegevens staan in `data/fey.db` (SQLite) en `data/uploads/` (afbeeldingen).
Een back-up is dus simpelweg het kopiëren van de map `data/`.

De database gebruikt WAL-modus; tijdens gebruik zijn er daarom ook
`fey.db-wal` en `fey.db-shm` bestanden aanwezig. Kopieer voor een consistente
back-up het beste het hele `data/`-mapje met de server uitgeschakeld.

---

## Bekende beperkingen

- **Geen gebruikersaccounts.** FEY draait op een vertrouwd lokaal netwerk:
  de regisseur beheert de data, de cameramensen koppelen zich met een
  toegangscode. Er is geen wachtwoord of rollenbeheer op de API.
- **De noodmelding is geen meldingskanaal.** Camera's hebben geen
  audioverbinding met de regie; een noodmelding is een opvallende, directe
  instructie op het scherm.
- **De podium-editor is een bovenaanzicht.** Er is geen 3D-weergave en geen
  automatische zichtlijnberekening; camerakijkrichtingen worden handmatig
  ingesteld.
- **De stage canvas gebruikt Konva.** Voor zeer grote podia (meer dan ~200
  elementen) kan de weergave minder vloeiend worden.
