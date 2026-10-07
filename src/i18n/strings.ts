/**
 * Every customer-facing string the app translates, in each language it
 * offers.
 *
 * Client ask (2026-09-24, via Rob): "put it in the language they select".
 * The drivers most likely to miss a UK toll are visitors and hire-car
 * customers, so the first-run screens, the Home and crossing screens, and —
 * most importantly — the crossing alert and unpaid reminders are translated.
 *
 * NOT translated, deliberately, for now:
 * - Settings, Diagnostics and Subscription: tester/admin screens, English
 *   only apart from the language picker itself.
 * - Anything read from the crossings config (fine stage labels, caveats,
 *   operator names, price labels): that is data from the operators' own
 *   English pages, and a mistranslated fine rule is worse than an English
 *   one. Payment deadlines are the exception — there are only a handful and
 *   they go into the alert itself — see `deadlines` below.
 * - The operating system's own button names in the permission steps
 *   ("Allow all the time" and so on) are quoted in English: the OS shows
 *   them in the PHONE's language, which the app can't know matches the
 *   language picked here.
 *
 * NEEDS REVIEW: the non-English text was machine-drafted, not written by a
 * native speaker, and the disclaimer is legal wording. Have each language
 * checked before release — especially `disclaimer`.
 */

export type LanguageCode = 'en' | 'fr' | 'de' | 'es' | 'pl' | 'ro';

/** A run of text inside one permission step; `bold` marks an OS button name. */
export interface Segment {
  text: string;
  bold?: boolean;
}

export interface Strings {
  /** The language's name in itself, for the picker. */
  languageName: string;
  common: {
    avoidFines: string;
    tapToPay: string;
    chooseLanguage: string;
    cancel: string;
  };
  welcome: {
    headline: string;
    alertPreviewTitle: string;
    alertNow: string;
    alertTitle: (name: string) => string;
    alertBody: (price: string) => string;
    download: string;
    subscribe: string;
  };
  stats: {
    fineEach: (amount: string) => string;
    totalMillions: (millions: string) => string;
    /** The big number on a card that has no count, only money: "£128.4m". */
    money: (millions: string) => string;
    /** The label under each stat's big number, keyed by FineStat.id. */
    labels: Record<string, string>;
  };
  ulezIntro: {
    title: string;
    copy: string;
    getStarted: string;
  };
  howItWorks: {
    title: string;
    steps: Array<{ title: string; body: string }>;
    continue: string;
  };
  disclaimer: {
    title: string;
    text: string;
    checkbox: string;
    understand: string;
  };
  permissions: {
    title: string;
    body: string;
    cardTitle: string;
    iosSteps: Segment[][];
    androidSteps: Segment[][];
    footnote: string;
    note: string;
    settingUp: string;
    turnOn: string;
    notNow: string;
    androidAlertTitle: string;
    androidAlertBody: string;
    iosAlertTitle: string;
    iosAlertBody: string;
    ok: string;
  };
  home: {
    watching: (count: number) => string;
    notWatching: string;
    expiredBadge: string;
    getStartedBadge: string;
    expiredTitle: string;
    startTitle: string;
    expiredBody: string;
    startBody: string;
    renew: string;
    viewSubscription: string;
    needsAttention: string;
    crossedAt: (time: string) => string;
    unpaid: string;
    monitored: string;
    point: string;
    zone: string;
    liveNotIn: string;
    paused: string;
    simulate: string;
    replay: string;
  };
  detail: {
    notFound: string;
    detected: (when: string) => string;
    paid: string;
    unpaid: string;
    charge: string;
    payBy: (deadline: string) => string;
    ifUnpaid: string;
    paidDisclaimer: (operator: string) => string;
    verified: (operator: string, date: string) => string;
    openPayment: string;
    antiScam: (operator: string) => string;
    markPaid: string;
    backHome: string;
  };
  notifications: {
    detectedTitle: (name: string) => string;
    detectedBody: (price: string, deadline: string) => string;
    freeTitle: (name: string) => string;
    freeBodyWindow: (name: string, window: string) => string;
    freeBody: (name: string) => string;
    markPaidAction: string;
    reminderTitle: (name: string) => string;
    reminderBody: (price: string, deadline: string) => string;
    reminderManyTitle: (count: number) => string;
    reminderManyBody: (names: string) => string;
    and: string;
  };
  /** Keyed by the English `paymentDeadlineLabel` in the crossings config; a missing key falls back to the English. */
  deadlines: Record<string, string>;
  settings: {
    language: string;
    languageCaption: string;
  };
}

const en: Strings = {
  languageName: 'English',
  common: {
    avoidFines: 'AVOID THE TOLL FINES',
    tapToPay: 'TAP TO PAY',
    chooseLanguage: 'Choose your language',
    cancel: 'Cancel',
  },
  welcome: {
    headline: 'Never forget a UK road charge again',
    alertPreviewTitle: 'This is what the alert looks like',
    alertNow: 'now',
    alertTitle: (name) => `${name} detected — TAP TO PAY`,
    alertBody: (price) => `Pay ${price} on the official site. AVOID THE TOLL FINES.`,
    download: 'GET STARTED',
    subscribe: 'Then subscribe for just £4.99 per year.',
  },
  stats: {
    fineEach: (amount) => `Fine: ${amount} each`,
    totalMillions: (millions) => `£${millions}m+ in fines`,
    money: (millions) => `£${millions}m`,
    labels: {
      dartford: 'paid in Dart Charge fines in 2024–25 — more than the toll itself',
      ulez: 'ULEZ fines in the first six months of the London-wide zone',
      congestion: 'Congestion Charge fines in 2024',
      'tfl-tunnels': 'tunnel fines in the first four months (2025)',
      merseyflow: 'Mersey Gateway fines in its first year',
      tyne: 'Tyne Tunnel fines in six months',
      humber: 'unpaid-toll notices after going cashless (2026)',
      warburton: 'crossings recorded unpaid since January 2026',
    },
  },
  ulezIntro: {
    title: 'One wrong turn. £12.50 gone.',
    copy:
      'The Ultra Low Emission Zone covers every London borough — not just the centre. Cameras enforce it automatically the instant a non-compliant vehicle enters, no warning sign required. Toll Alert watches the boundary so you don’t find out later.',
    getStarted: 'Get started',
  },
  howItWorks: {
    title: 'How it works',
    steps: [
      {
        title: 'It detects the crossing',
        body: 'Toll Alert notices when you’ve crossed the bridge, tunnel, or toll road — running in the background, even with the app closed.',
      },
      {
        title: 'It reminds you until you pay',
        body: 'A phone notification reminds you at various times of the day that you have not yet paid your toll fee. You can set your own reminder times in Settings.',
      },
      {
        title: 'It takes you to the right site',
        body: 'Tap to pay and a link takes you straight to the official payment site, so you can’t get scammed by going to the wrong payment website.',
      },
      {
        title: 'You tap "Paid" once you have',
        body: 'That turns the reminder off. Toll Alert doesn’t check with Dart Charge or TfL — tapping "Paid" just tells the app you’ve paid, it doesn’t prove it.',
      },
    ],
    continue: 'Continue',
  },
  disclaimer: {
    title: 'Before you continue',
    text:
      'This app is a reminder tool, not a guarantee. Your phone must be in the vehicle for the alert to be received. ' +
      'Detection can fail — GPS can lose signal (e.g. in tunnels), notifications can be delayed or silenced by your ' +
      'phone’s operating system, and background processes can be stopped by the OS to save battery. You are fully ' +
      'responsible for paying your own tolls and charges regardless of whether you receive an alert from this app.',
    checkbox:
      'I understand this app is a reminder only, and that paying tolls and charges is my responsibility.',
    understand: 'I understand',
  },
  permissions: {
    title: 'One last thing',
    body: 'To detect crossings while your phone is in your pocket, Toll Alert needs to check your location in the background — including when the app is closed.',
    cardTitle: 'What happens next',
    iosSteps: [
      [{ text: 'Tap ' }, { text: '"Allow While Using App"', bold: true }, { text: ' on the location prompt.' }],
      [{ text: 'iOS will ask a second time — choose ' }, { text: '"Change to Always Allow"', bold: true }, { text: '.' }],
      [{ text: 'Tap ' }, { text: 'Allow', bold: true }, { text: ' on the notifications prompt. That’s how the alert actually reaches you.' }],
    ],
    androidSteps: [
      [{ text: 'Tap ' }, { text: '"While using the app"', bold: true }, { text: ' on the location popup.' }],
      [
        { text: 'Android then opens your ' },
        { text: 'Settings page', bold: true },
        { text: ', not another popup. Go to ' },
        { text: 'Permissions → Location', bold: true },
        { text: ', choose ' },
        { text: '"Allow all the time"', bold: true },
        { text: ', then come back here — Toll Alert will switch itself on.' },
      ],
      [{ text: 'Tap ' }, { text: 'Allow', bold: true }, { text: ' on the notifications prompt. That’s how the alert actually reaches you.' }],
    ],
    footnote: 'Toll Alert only uses this to detect the crossings in your list. It doesn’t track or store your route.',
    note: 'Without background location and notifications, a crossing detected while the app is closed can’t reach you. You can change either later in Settings.',
    settingUp: 'Setting up…',
    turnOn: 'Turn on crossing alerts',
    notNow: 'Not now',
    androidAlertTitle: 'One step left',
    androidAlertBody:
      'If your phone opened its Settings page, choose Permissions → Location → "Allow all the time", then come back here — Toll Alert will switch itself on. Without it, a crossing can’t be spotted while the app is closed. You can check it worked under Settings → Diagnostics.',
    iosAlertTitle: 'Alerts are off',
    iosAlertBody:
      'Toll Alert needs "Always" location access to spot a crossing while the app is closed. You can grant it any time from Settings → Background monitoring.',
    ok: 'OK',
  },
  home: {
    watching: (count) => `Watching ${count} crossings`,
    notWatching: 'Not watching — turn on background monitoring',
    expiredBadge: 'EXPIRED',
    getStartedBadge: 'GET STARTED',
    expiredTitle: 'Your subscription has expired',
    startTitle: 'Start your subscription',
    expiredBody: 'Renew to keep getting background crossing alerts.',
    startBody: 'Subscribe to enable background alerts for every monitored crossing.',
    renew: 'Renew',
    viewSubscription: 'View subscription',
    needsAttention: 'Needs your attention',
    crossedAt: (time) => `Crossed ${time}`,
    unpaid: 'Unpaid',
    monitored: 'Monitored crossings',
    point: 'Point',
    zone: 'Zone',
    liveNotIn: 'Live — not currently in this crossing',
    paused: 'Tracking paused — turn on monitoring in Settings',
    simulate: '▸ Simulate crossing (demo)',
    replay: '↺ Replay intro (demo)',
  },
  detail: {
    notFound: 'This reminder no longer exists.',
    detected: (when) => `Detected ${when}`,
    paid: 'Paid',
    unpaid: 'Unpaid',
    charge: 'Charge',
    payBy: (deadline) => `⏱ Pay by: ${deadline}`,
    ifUnpaid: 'If unpaid',
    paidDisclaimer: (operator) =>
      `Tapping "Mark as paid" only dismisses this reminder — Toll Alert does not verify payment with ${operator}. You’re responsible for actually paying.`,
    verified: (operator, date) =>
      `Figures verified against ${operator} on ${date} — rates change often, confirm at the payment link before relying on this.`,
    openPayment: 'TAP TO PAY — official site',
    antiScam: (operator) =>
      `This button only ever opens ${operator}’s official website — never a copycat site that adds its own fees.`,
    markPaid: 'Mark as paid',
    backHome: 'Back to home',
  },
  notifications: {
    detectedTitle: (name) => `${name} detected — TAP TO PAY`,
    detectedBody: (price, deadline) =>
      `AVOID THE TOLL FINES: pay ${price} by ${deadline}. Tap to pay on the official site, then mark as paid.`,
    freeTitle: (name) => `${name} detected — nothing to pay`,
    freeBodyWindow: (name, window) => `${name} only charges ${window}, so this crossing is free. Tap to check if that looks wrong.`,
    freeBody: (name) => `${name} is free at this time, so there’s nothing to pay. Tap to check if that looks wrong.`,
    markPaidAction: 'Mark as paid',
    reminderTitle: (name) => `${name} still unpaid — TAP TO PAY`,
    reminderBody: (price, deadline) =>
      `AVOID THE TOLL FINES: pay ${price} by ${deadline}. Open Toll Alert and tap "Mark as paid" once you have.`,
    reminderManyTitle: (count) => `${count} unpaid crossings — TAP TO PAY`,
    reminderManyBody: (names) =>
      `AVOID THE TOLL FINES: ${names} still need paying. Open Toll Alert and tap "Mark as paid" for each one you’ve dealt with.`,
    and: 'and',
  },
  deadlines: {},
  settings: {
    language: 'Language',
    languageCaption: 'Used for the intro, the Home screen, and your crossing alerts and reminders.',
  },
};

const fr: Strings = {
  languageName: 'Français',
  common: {
    avoidFines: 'ÉVITEZ LES AMENDES DE PÉAGE',
    tapToPay: 'TOUCHEZ POUR PAYER',
    chooseLanguage: 'Choisissez votre langue',
    cancel: 'Annuler',
  },
  welcome: {
    headline: 'N’oubliez plus jamais un péage routier britannique',
    alertPreviewTitle: 'Voici à quoi ressemble l’alerte',
    alertNow: 'maintenant',
    alertTitle: (name) => `${name} détecté — TOUCHEZ POUR PAYER`,
    alertBody: (price) => `Payez ${price} sur le site officiel. ÉVITEZ LES AMENDES DE PÉAGE.`,
    download: 'COMMENCER',
    subscribe: 'Puis abonnez-vous pour seulement 4,99 £ par an.',
  },
  stats: {
    fineEach: (amount) => `Amende : ${amount} chacune`,
    totalMillions: (millions) => `plus de ${millions} M£ d’amendes`,
    money: (millions) => `${millions} M£`,
    labels: {
      dartford: 'd’amendes Dart Charge payées en 2024-25 — plus que le péage lui-même',
      ulez: 'amendes ULEZ lors des six premiers mois de la zone étendue à tout Londres',
      congestion: 'amendes de péage urbain (Congestion Charge) en 2024',
      'tfl-tunnels': 'amendes des tunnels lors des quatre premiers mois (2025)',
      merseyflow: 'amendes du Mersey Gateway lors de sa première année',
      tyne: 'amendes du Tyne Tunnel en six mois',
      humber: 'avis de péage impayé après le passage au sans-espèces (2026)',
      warburton: 'passages enregistrés impayés depuis janvier 2026',
    },
  },
  ulezIntro: {
    title: 'Un mauvais virage. 12,50 £ perdus.',
    copy:
      'La zone à ultra-faibles émissions (ULEZ) couvre tous les quartiers de Londres — pas seulement le centre. Des caméras la contrôlent automatiquement dès qu’un véhicule non conforme y entre, sans panneau d’avertissement. Toll Alert surveille la limite pour que vous ne le découvriez pas trop tard.',
    getStarted: 'Commencer',
  },
  howItWorks: {
    title: 'Comment ça marche',
    steps: [
      {
        title: 'Il détecte le passage',
        body: 'Toll Alert remarque quand vous avez franchi le pont, le tunnel ou la route à péage — en arrière-plan, même application fermée.',
      },
      {
        title: 'Il vous rappelle jusqu’au paiement',
        body: 'Une notification vous rappelle à différents moments de la journée que vous n’avez pas encore payé votre péage. Vous pouvez choisir vos propres heures de rappel dans les Réglages.',
      },
      {
        title: 'Il vous mène au bon site',
        body: 'Touchez pour payer : un lien vous amène directement au site de paiement officiel, pour ne pas vous faire arnaquer par un faux site de paiement.',
      },
      {
        title: 'Vous touchez « Payé » une fois réglé',
        body: 'Cela arrête le rappel. Toll Alert ne vérifie pas auprès de Dart Charge ou de TfL — toucher « Payé » indique seulement à l’application que vous avez payé, cela ne le prouve pas.',
      },
    ],
    continue: 'Continuer',
  },
  disclaimer: {
    title: 'Avant de continuer',
    text:
      'Cette application est un outil de rappel, pas une garantie. Votre téléphone doit se trouver dans le véhicule pour recevoir l’alerte. ' +
      'La détection peut échouer — le GPS peut perdre le signal (par ex. dans les tunnels), les notifications peuvent être retardées ou ' +
      'mises en sourdine par le système de votre téléphone, et les processus en arrière-plan peuvent être arrêtés pour économiser la ' +
      'batterie. Vous êtes entièrement responsable du paiement de vos péages et redevances, que vous receviez ou non une alerte de cette application.',
    checkbox:
      'Je comprends que cette application n’est qu’un rappel et que le paiement des péages et redevances relève de ma responsabilité.',
    understand: 'J’ai compris',
  },
  permissions: {
    title: 'Une dernière chose',
    body: 'Pour détecter les passages pendant que votre téléphone est dans votre poche, Toll Alert doit vérifier votre position en arrière-plan — y compris quand l’application est fermée.',
    cardTitle: 'Et ensuite',
    iosSteps: [
      [{ text: 'Touchez ' }, { text: '"Allow While Using App"', bold: true }, { text: ' sur la demande de localisation.' }],
      [{ text: 'iOS demandera une deuxième fois — choisissez ' }, { text: '"Change to Always Allow"', bold: true }, { text: '.' }],
      [{ text: 'Touchez ' }, { text: 'Allow', bold: true }, { text: ' sur la demande de notifications. C’est ainsi que l’alerte vous parvient.' }],
    ],
    androidSteps: [
      [{ text: 'Touchez ' }, { text: '"While using the app"', bold: true }, { text: ' dans la fenêtre de localisation.' }],
      [
        { text: 'Android ouvre alors vos ' },
        { text: 'Paramètres', bold: true },
        { text: ', pas une autre fenêtre. Allez dans ' },
        { text: 'Autorisations → Position', bold: true },
        { text: ', choisissez ' },
        { text: '"Allow all the time"', bold: true },
        { text: ', puis revenez ici — Toll Alert s’activera tout seul.' },
      ],
      [{ text: 'Touchez ' }, { text: 'Allow', bold: true }, { text: ' sur la demande de notifications. C’est ainsi que l’alerte vous parvient.' }],
    ],
    footnote: 'Toll Alert ne s’en sert que pour détecter les passages de votre liste. Il ne suit ni n’enregistre votre trajet.',
    note: 'Sans localisation en arrière-plan ni notifications, un passage détecté application fermée ne peut pas vous parvenir. Vous pourrez modifier cela plus tard dans les Réglages.',
    settingUp: 'Configuration…',
    turnOn: 'Activer les alertes de passage',
    notNow: 'Pas maintenant',
    androidAlertTitle: 'Plus qu’une étape',
    androidAlertBody:
      'Si votre téléphone a ouvert ses Paramètres, choisissez Autorisations → Position → "Allow all the time", puis revenez ici — Toll Alert s’activera tout seul. Sans cela, un passage ne peut pas être repéré application fermée. Vous pouvez vérifier dans Réglages → Diagnostics.',
    iosAlertTitle: 'Les alertes sont désactivées',
    iosAlertBody:
      'Toll Alert a besoin de l’accès à la position « Toujours » pour repérer un passage application fermée. Vous pouvez l’accorder à tout moment dans Réglages → Surveillance en arrière-plan.',
    ok: 'OK',
  },
  home: {
    watching: (count) => `${count} passages surveillés`,
    notWatching: 'Surveillance inactive — activez la surveillance en arrière-plan',
    expiredBadge: 'EXPIRÉ',
    getStartedBadge: 'COMMENCER',
    expiredTitle: 'Votre abonnement a expiré',
    startTitle: 'Démarrez votre abonnement',
    expiredBody: 'Renouvelez pour continuer à recevoir les alertes de passage.',
    startBody: 'Abonnez-vous pour activer les alertes pour chaque passage surveillé.',
    renew: 'Renouveler',
    viewSubscription: 'Voir l’abonnement',
    needsAttention: 'À traiter',
    crossedAt: (time) => `Passé à ${time}`,
    unpaid: 'Impayé',
    monitored: 'Passages surveillés',
    point: 'Point',
    zone: 'Zone',
    liveNotIn: 'Actif — vous n’êtes pas sur ce passage',
    paused: 'Suivi en pause — activez la surveillance dans les Réglages',
    simulate: '▸ Simuler un passage (démo)',
    replay: '↺ Revoir l’introduction (démo)',
  },
  detail: {
    notFound: 'Ce rappel n’existe plus.',
    detected: (when) => `Détecté le ${when}`,
    paid: 'Payé',
    unpaid: 'Impayé',
    charge: 'Montant',
    payBy: (deadline) => `⏱ À payer avant : ${deadline}`,
    ifUnpaid: 'En cas de non-paiement',
    paidDisclaimer: (operator) =>
      `Toucher « Marquer comme payé » ferme seulement ce rappel — Toll Alert ne vérifie pas le paiement auprès de ${operator}. C’est à vous de payer réellement.`,
    verified: (operator, date) =>
      `Montants vérifiés auprès de ${operator} le ${date} — les tarifs changent souvent, confirmez sur le lien de paiement.`,
    openPayment: 'TOUCHEZ POUR PAYER — site officiel',
    antiScam: (operator) =>
      `Ce bouton ouvre uniquement le site officiel de ${operator} — jamais un faux site qui ajoute ses propres frais.`,
    markPaid: 'Marquer comme payé',
    backHome: 'Retour à l’accueil',
  },
  notifications: {
    detectedTitle: (name) => `${name} détecté — TOUCHEZ POUR PAYER`,
    detectedBody: (price, deadline) =>
      `ÉVITEZ LES AMENDES : payez ${price} avant ${deadline}. Touchez pour payer sur le site officiel, puis marquez comme payé.`,
    freeTitle: (name) => `${name} détecté — rien à payer`,
    freeBodyWindow: (name, window) => `${name} n’est payant que de ${window}, ce passage est donc gratuit. Touchez pour vérifier.`,
    freeBody: (name) => `${name} est gratuit à cette heure, il n’y a rien à payer. Touchez pour vérifier.`,
    markPaidAction: 'Marquer comme payé',
    reminderTitle: (name) => `${name} toujours impayé — TOUCHEZ POUR PAYER`,
    reminderBody: (price, deadline) =>
      `ÉVITEZ LES AMENDES : payez ${price} avant ${deadline}. Ouvrez Toll Alert et touchez « Marquer comme payé » une fois fait.`,
    reminderManyTitle: (count) => `${count} passages impayés — TOUCHEZ POUR PAYER`,
    reminderManyBody: (names) =>
      `ÉVITEZ LES AMENDES : ${names} restent à payer. Ouvrez Toll Alert et touchez « Marquer comme payé » pour chacun.`,
    and: 'et',
  },
  deadlines: {
    'Midnight the day after crossing': 'minuit le lendemain du passage',
    'Midnight the day after travel': 'minuit le lendemain du trajet',
    'Midnight on the third day after crossing': 'minuit le troisième jour après le passage',
    'Midnight 3 days after driving in the zone': 'minuit le troisième jour après avoir roulé dans la zone',
  },
  settings: {
    language: 'Langue',
    languageCaption: 'Utilisée pour l’introduction, l’écran d’accueil, et vos alertes et rappels.',
  },
};

const de: Strings = {
  languageName: 'Deutsch',
  common: {
    avoidFines: 'VERMEIDEN SIE MAUT-STRAFEN',
    tapToPay: 'TIPPEN ZUM BEZAHLEN',
    chooseLanguage: 'Sprache wählen',
    cancel: 'Abbrechen',
  },
  welcome: {
    headline: 'Nie wieder eine britische Straßengebühr vergessen',
    alertPreviewTitle: 'So sieht die Benachrichtigung aus',
    alertNow: 'jetzt',
    alertTitle: (name) => `${name} erkannt — TIPPEN ZUM BEZAHLEN`,
    alertBody: (price) => `Zahlen Sie ${price} auf der offiziellen Website. VERMEIDEN SIE MAUT-STRAFEN.`,
    download: 'LOSLEGEN',
    subscribe: 'Danach nur 4,99 £ pro Jahr im Abo.',
  },
  stats: {
    fineEach: (amount) => `Strafe: je ${amount}`,
    totalMillions: (millions) => `über ${millions} Mio. £ an Strafen`,
    money: (millions) => `${millions} Mio. £`,
    labels: {
      dartford: 'an Dart-Charge-Strafen 2024–25 gezahlt — mehr als die Maut selbst',
      ulez: 'ULEZ-Strafen in den ersten sechs Monaten der Londoner Gesamtzone',
      congestion: 'Congestion-Charge-Strafen im Jahr 2024',
      'tfl-tunnels': 'Tunnel-Strafen in den ersten vier Monaten (2025)',
      merseyflow: 'Mersey-Gateway-Strafen im ersten Jahr',
      tyne: 'Tyne-Tunnel-Strafen in sechs Monaten',
      humber: 'Mahnungen wegen unbezahlter Maut nach Umstellung auf bargeldlos (2026)',
      warburton: 'als unbezahlt erfasste Überfahrten seit Januar 2026',
    },
  },
  ulezIntro: {
    title: 'Einmal falsch abgebogen. 12,50 £ weg.',
    copy:
      'Die Ultra Low Emission Zone umfasst jeden Londoner Stadtbezirk — nicht nur das Zentrum. Kameras kontrollieren sie automatisch, sobald ein nicht konformes Fahrzeug einfährt, ohne Warnschild. Toll Alert überwacht die Grenze, damit Sie es nicht erst später erfahren.',
    getStarted: 'Los geht’s',
  },
  howItWorks: {
    title: 'So funktioniert’s',
    steps: [
      {
        title: 'Es erkennt die Überfahrt',
        body: 'Toll Alert bemerkt, wenn Sie die Brücke, den Tunnel oder die Mautstraße passiert haben — im Hintergrund, auch bei geschlossener App.',
      },
      {
        title: 'Es erinnert Sie bis zur Zahlung',
        body: 'Eine Benachrichtigung erinnert Sie zu verschiedenen Tageszeiten daran, dass Sie Ihre Maut noch nicht bezahlt haben. Die Erinnerungszeiten können Sie in den Einstellungen selbst festlegen.',
      },
      {
        title: 'Es führt Sie zur richtigen Website',
        body: 'Tippen zum Bezahlen: Ein Link bringt Sie direkt zur offiziellen Zahlungsseite, damit Sie nicht auf eine betrügerische Zahlungsseite hereinfallen.',
      },
      {
        title: 'Sie tippen auf „Bezahlt“',
        body: 'Damit endet die Erinnerung. Toll Alert prüft nicht bei Dart Charge oder TfL nach — „Bezahlt“ teilt der App nur mit, dass Sie bezahlt haben, es beweist es nicht.',
      },
    ],
    continue: 'Weiter',
  },
  disclaimer: {
    title: 'Bevor Sie fortfahren',
    text:
      'Diese App ist eine Erinnerungshilfe, keine Garantie. Ihr Telefon muss sich im Fahrzeug befinden, damit die Benachrichtigung ankommt. ' +
      'Die Erkennung kann fehlschlagen — GPS kann das Signal verlieren (z. B. in Tunneln), Benachrichtigungen können vom Betriebssystem ' +
      'verzögert oder stummgeschaltet werden, und Hintergrundprozesse können zum Akkusparen beendet werden. Sie sind in vollem Umfang ' +
      'selbst für die Zahlung Ihrer Mautgebühren verantwortlich, unabhängig davon, ob Sie eine Benachrichtigung dieser App erhalten.',
    checkbox:
      'Ich verstehe, dass diese App nur eine Erinnerung ist und dass die Zahlung von Maut und Gebühren meine Verantwortung ist.',
    understand: 'Verstanden',
  },
  permissions: {
    title: 'Eine letzte Sache',
    body: 'Um Überfahrten zu erkennen, während Ihr Telefon in der Tasche ist, muss Toll Alert Ihren Standort im Hintergrund prüfen — auch wenn die App geschlossen ist.',
    cardTitle: 'Was als Nächstes passiert',
    iosSteps: [
      [{ text: 'Tippen Sie bei der Standortabfrage auf ' }, { text: '"Allow While Using App"', bold: true }, { text: '.' }],
      [{ text: 'iOS fragt ein zweites Mal — wählen Sie ' }, { text: '"Change to Always Allow"', bold: true }, { text: '.' }],
      [{ text: 'Tippen Sie bei der Mitteilungsabfrage auf ' }, { text: 'Allow', bold: true }, { text: '. So erreicht Sie die Benachrichtigung.' }],
    ],
    androidSteps: [
      [{ text: 'Tippen Sie im Standort-Fenster auf ' }, { text: '"While using the app"', bold: true }, { text: '.' }],
      [
        { text: 'Android öffnet dann Ihre ' },
        { text: 'Einstellungen', bold: true },
        { text: ', kein weiteres Fenster. Gehen Sie zu ' },
        { text: 'Berechtigungen → Standort', bold: true },
        { text: ', wählen Sie ' },
        { text: '"Allow all the time"', bold: true },
        { text: ' und kehren Sie hierher zurück — Toll Alert schaltet sich selbst ein.' },
      ],
      [{ text: 'Tippen Sie bei der Mitteilungsabfrage auf ' }, { text: 'Allow', bold: true }, { text: '. So erreicht Sie die Benachrichtigung.' }],
    ],
    footnote: 'Toll Alert nutzt dies nur, um die Überfahrten in Ihrer Liste zu erkennen. Ihre Route wird weder verfolgt noch gespeichert.',
    note: 'Ohne Hintergrund-Standort und Benachrichtigungen kann Sie eine bei geschlossener App erkannte Überfahrt nicht erreichen. Sie können beides später in den Einstellungen ändern.',
    settingUp: 'Wird eingerichtet…',
    turnOn: 'Überfahrt-Benachrichtigungen einschalten',
    notNow: 'Nicht jetzt',
    androidAlertTitle: 'Noch ein Schritt',
    androidAlertBody:
      'Falls Ihr Telefon die Einstellungen geöffnet hat, wählen Sie Berechtigungen → Standort → "Allow all the time" und kehren Sie hierher zurück — Toll Alert schaltet sich selbst ein. Ohne das kann bei geschlossener App keine Überfahrt erkannt werden. Unter Einstellungen → Diagnostics können Sie es prüfen.',
    iosAlertTitle: 'Benachrichtigungen sind aus',
    iosAlertBody:
      'Toll Alert braucht den Standortzugriff „Immer“, um Überfahrten bei geschlossener App zu erkennen. Sie können ihn jederzeit unter Einstellungen → Hintergrundüberwachung erteilen.',
    ok: 'OK',
  },
  home: {
    watching: (count) => `${count} Mautstellen werden überwacht`,
    notWatching: 'Keine Überwachung — Hintergrundüberwachung einschalten',
    expiredBadge: 'ABGELAUFEN',
    getStartedBadge: 'LOSLEGEN',
    expiredTitle: 'Ihr Abo ist abgelaufen',
    startTitle: 'Abo starten',
    expiredBody: 'Verlängern Sie, um weiter Benachrichtigungen zu erhalten.',
    startBody: 'Abonnieren Sie, um Benachrichtigungen für jede überwachte Mautstelle zu aktivieren.',
    renew: 'Verlängern',
    viewSubscription: 'Abo ansehen',
    needsAttention: 'Erfordert Ihre Aufmerksamkeit',
    crossedAt: (time) => `Passiert um ${time}`,
    unpaid: 'Unbezahlt',
    monitored: 'Überwachte Mautstellen',
    point: 'Punkt',
    zone: 'Zone',
    liveNotIn: 'Aktiv — Sie befinden sich nicht hier',
    paused: 'Überwachung pausiert — in den Einstellungen aktivieren',
    simulate: '▸ Überfahrt simulieren (Demo)',
    replay: '↺ Einführung erneut zeigen (Demo)',
  },
  detail: {
    notFound: 'Diese Erinnerung existiert nicht mehr.',
    detected: (when) => `Erkannt am ${when}`,
    paid: 'Bezahlt',
    unpaid: 'Unbezahlt',
    charge: 'Gebühr',
    payBy: (deadline) => `⏱ Zahlen bis: ${deadline}`,
    ifUnpaid: 'Bei Nichtzahlung',
    paidDisclaimer: (operator) =>
      `„Als bezahlt markieren“ schließt nur diese Erinnerung — Toll Alert prüft die Zahlung nicht bei ${operator}. Sie sind selbst für die Zahlung verantwortlich.`,
    verified: (operator, date) =>
      `Beträge am ${date} bei ${operator} geprüft — Tarife ändern sich oft, bitte über den Zahlungslink bestätigen.`,
    openPayment: 'TIPPEN ZUM BEZAHLEN — offizielle Website',
    antiScam: (operator) =>
      `Diese Schaltfläche öffnet nur die offizielle Website von ${operator} — nie eine Nachahmer-Seite mit eigenen Gebühren.`,
    markPaid: 'Als bezahlt markieren',
    backHome: 'Zur Startseite',
  },
  notifications: {
    detectedTitle: (name) => `${name} erkannt — TIPPEN ZUM BEZAHLEN`,
    detectedBody: (price, deadline) =>
      `VERMEIDEN SIE STRAFEN: Zahlen Sie ${price} bis ${deadline}. Tippen, um auf der offiziellen Website zu zahlen, dann als bezahlt markieren.`,
    freeTitle: (name) => `${name} erkannt — nichts zu zahlen`,
    freeBodyWindow: (name, window) => `${name} ist nur ${window} gebührenpflichtig, diese Überfahrt ist also kostenlos. Tippen, um das zu prüfen.`,
    freeBody: (name) => `${name} ist zu dieser Zeit kostenlos, es ist nichts zu zahlen. Tippen, um das zu prüfen.`,
    markPaidAction: 'Als bezahlt markieren',
    reminderTitle: (name) => `${name} noch unbezahlt — TIPPEN ZUM BEZAHLEN`,
    reminderBody: (price, deadline) =>
      `VERMEIDEN SIE STRAFEN: Zahlen Sie ${price} bis ${deadline}. Öffnen Sie Toll Alert und tippen Sie danach auf „Als bezahlt markieren“.`,
    reminderManyTitle: (count) => `${count} unbezahlte Überfahrten — TIPPEN ZUM BEZAHLEN`,
    reminderManyBody: (names) =>
      `VERMEIDEN SIE STRAFEN: ${names} sind noch zu bezahlen. Öffnen Sie Toll Alert und markieren Sie jede erledigte als bezahlt.`,
    and: 'und',
  },
  deadlines: {
    'Midnight the day after crossing': 'Mitternacht am Tag nach der Überfahrt',
    'Midnight the day after travel': 'Mitternacht am Tag nach der Fahrt',
    'Midnight on the third day after crossing': 'Mitternacht am dritten Tag nach der Überfahrt',
    'Midnight 3 days after driving in the zone': 'Mitternacht am dritten Tag nach der Fahrt in der Zone',
  },
  settings: {
    language: 'Sprache',
    languageCaption: 'Gilt für die Einführung, den Startbildschirm sowie Ihre Benachrichtigungen und Erinnerungen.',
  },
};

const es: Strings = {
  languageName: 'Español',
  common: {
    avoidFines: 'EVITE LAS MULTAS DE PEAJE',
    tapToPay: 'TOQUE PARA PAGAR',
    chooseLanguage: 'Elija su idioma',
    cancel: 'Cancelar',
  },
  welcome: {
    headline: 'No vuelva a olvidar un peaje en el Reino Unido',
    alertPreviewTitle: 'Así es la alerta',
    alertNow: 'ahora',
    alertTitle: (name) => `${name} detectado — TOQUE PARA PAGAR`,
    alertBody: (price) => `Pague ${price} en la web oficial. EVITE LAS MULTAS DE PEAJE.`,
    download: 'EMPEZAR',
    subscribe: 'Después, suscríbase por solo 4,99 £ al año.',
  },
  stats: {
    fineEach: (amount) => `Multa: ${amount} cada una`,
    totalMillions: (millions) => `más de ${millions} M£ en multas`,
    money: (millions) => `${millions} M£`,
    labels: {
      dartford: 'pagados en multas de Dart Charge en 2024-25, más que el propio peaje',
      ulez: 'multas ULEZ en los primeros seis meses de la zona ampliada a todo Londres',
      congestion: 'multas de la Congestion Charge en 2024',
      'tfl-tunnels': 'multas de los túneles en los primeros cuatro meses (2025)',
      merseyflow: 'multas del Mersey Gateway en su primer año',
      tyne: 'multas del Tyne Tunnel en seis meses',
      humber: 'avisos de peaje impagado tras eliminar el pago en efectivo (2026)',
      warburton: 'pasos registrados como impagados desde enero de 2026',
    },
  },
  ulezIntro: {
    title: 'Un giro equivocado. 12,50 £ perdidas.',
    copy:
      'La zona de emisiones ultrabajas (ULEZ) cubre todos los distritos de Londres, no solo el centro. Las cámaras la controlan automáticamente en cuanto entra un vehículo no conforme, sin señal de aviso. Toll Alert vigila el límite para que no se entere demasiado tarde.',
    getStarted: 'Empezar',
  },
  howItWorks: {
    title: 'Cómo funciona',
    steps: [
      {
        title: 'Detecta el paso',
        body: 'Toll Alert detecta cuando ha cruzado el puente, túnel o carretera de peaje, en segundo plano, incluso con la app cerrada.',
      },
      {
        title: 'Le recuerda hasta que pague',
        body: 'Una notificación le recuerda a distintas horas del día que todavía no ha pagado su peaje. Puede elegir sus propias horas de aviso en Ajustes.',
      },
      {
        title: 'Le lleva a la web correcta',
        body: 'Toque para pagar y un enlace le lleva directamente a la web de pago oficial, para que no le estafen en una web de pago falsa.',
      },
      {
        title: 'Toca «Pagado» cuando haya pagado',
        body: 'Así se desactiva el recordatorio. Toll Alert no lo comprueba con Dart Charge ni con TfL: tocar «Pagado» solo indica a la app que ha pagado, no lo demuestra.',
      },
    ],
    continue: 'Continuar',
  },
  disclaimer: {
    title: 'Antes de continuar',
    text:
      'Esta app es una herramienta de recordatorio, no una garantía. Su teléfono debe estar dentro del vehículo para recibir la alerta. ' +
      'La detección puede fallar: el GPS puede perder la señal (p. ej., en túneles), el sistema operativo puede retrasar o silenciar las ' +
      'notificaciones y los procesos en segundo plano pueden detenerse para ahorrar batería. Usted es plenamente responsable de pagar ' +
      'sus peajes y cargos, reciba o no una alerta de esta app.',
    checkbox:
      'Entiendo que esta app es solo un recordatorio y que pagar los peajes y cargos es mi responsabilidad.',
    understand: 'Entendido',
  },
  permissions: {
    title: 'Una última cosa',
    body: 'Para detectar pasos mientras lleva el teléfono en el bolsillo, Toll Alert necesita comprobar su ubicación en segundo plano, incluso con la app cerrada.',
    cardTitle: 'Qué pasará ahora',
    iosSteps: [
      [{ text: 'Toque ' }, { text: '"Allow While Using App"', bold: true }, { text: ' en el aviso de ubicación.' }],
      [{ text: 'iOS preguntará una segunda vez: elija ' }, { text: '"Change to Always Allow"', bold: true }, { text: '.' }],
      [{ text: 'Toque ' }, { text: 'Allow', bold: true }, { text: ' en el aviso de notificaciones. Así es como le llega la alerta.' }],
    ],
    androidSteps: [
      [{ text: 'Toque ' }, { text: '"While using the app"', bold: true }, { text: ' en la ventana de ubicación.' }],
      [
        { text: 'Android abrirá entonces sus ' },
        { text: 'Ajustes', bold: true },
        { text: ', no otra ventana. Vaya a ' },
        { text: 'Permisos → Ubicación', bold: true },
        { text: ', elija ' },
        { text: '"Allow all the time"', bold: true },
        { text: ' y vuelva aquí: Toll Alert se activará solo.' },
      ],
      [{ text: 'Toque ' }, { text: 'Allow', bold: true }, { text: ' en el aviso de notificaciones. Así es como le llega la alerta.' }],
    ],
    footnote: 'Toll Alert solo usa esto para detectar los pasos de su lista. No rastrea ni guarda su ruta.',
    note: 'Sin ubicación en segundo plano y notificaciones, un paso detectado con la app cerrada no puede avisarle. Puede cambiar ambas cosas más tarde en Ajustes.',
    settingUp: 'Configurando…',
    turnOn: 'Activar alertas de paso',
    notNow: 'Ahora no',
    androidAlertTitle: 'Falta un paso',
    androidAlertBody:
      'Si su teléfono abrió los Ajustes, elija Permisos → Ubicación → "Allow all the time" y vuelva aquí: Toll Alert se activará solo. Sin ello no se puede detectar un paso con la app cerrada. Puede comprobarlo en Ajustes → Diagnostics.',
    iosAlertTitle: 'Las alertas están desactivadas',
    iosAlertBody:
      'Toll Alert necesita acceso a la ubicación «Siempre» para detectar un paso con la app cerrada. Puede concederlo cuando quiera en Ajustes → Supervisión en segundo plano.',
    ok: 'Aceptar',
  },
  home: {
    watching: (count) => `Vigilando ${count} peajes`,
    notWatching: 'Sin vigilancia: active la supervisión en segundo plano',
    expiredBadge: 'CADUCADA',
    getStartedBadge: 'EMPEZAR',
    expiredTitle: 'Su suscripción ha caducado',
    startTitle: 'Inicie su suscripción',
    expiredBody: 'Renueve para seguir recibiendo alertas de paso.',
    startBody: 'Suscríbase para activar las alertas en cada peaje vigilado.',
    renew: 'Renovar',
    viewSubscription: 'Ver suscripción',
    needsAttention: 'Requiere su atención',
    crossedAt: (time) => `Cruzado a las ${time}`,
    unpaid: 'Sin pagar',
    monitored: 'Peajes vigilados',
    point: 'Punto',
    zone: 'Zona',
    liveNotIn: 'Activo: no está ahora en este peaje',
    paused: 'Vigilancia en pausa: actívela en Ajustes',
    simulate: '▸ Simular paso (demo)',
    replay: '↺ Ver la introducción otra vez (demo)',
  },
  detail: {
    notFound: 'Este recordatorio ya no existe.',
    detected: (when) => `Detectado el ${when}`,
    paid: 'Pagado',
    unpaid: 'Sin pagar',
    charge: 'Importe',
    payBy: (deadline) => `⏱ Pagar antes de: ${deadline}`,
    ifUnpaid: 'Si no se paga',
    paidDisclaimer: (operator) =>
      `Tocar «Marcar como pagado» solo cierra este recordatorio: Toll Alert no verifica el pago con ${operator}. Usted es responsable de pagar.`,
    verified: (operator, date) =>
      `Importes verificados con ${operator} el ${date}; las tarifas cambian a menudo, confírmelo en el enlace de pago.`,
    openPayment: 'TOQUE PARA PAGAR — web oficial',
    antiScam: (operator) =>
      `Este botón solo abre la web oficial de ${operator}, nunca una web imitadora que añade sus propias comisiones.`,
    markPaid: 'Marcar como pagado',
    backHome: 'Volver al inicio',
  },
  notifications: {
    detectedTitle: (name) => `${name} detectado — TOQUE PARA PAGAR`,
    detectedBody: (price, deadline) =>
      `EVITE LAS MULTAS: pague ${price} antes de ${deadline}. Toque para pagar en la web oficial y márquelo como pagado.`,
    freeTitle: (name) => `${name} detectado — nada que pagar`,
    freeBodyWindow: (name, window) => `${name} solo cobra de ${window}, así que este paso es gratis. Toque para comprobarlo.`,
    freeBody: (name) => `${name} es gratis a esta hora, no hay nada que pagar. Toque para comprobarlo.`,
    markPaidAction: 'Marcar como pagado',
    reminderTitle: (name) => `${name} sigue sin pagar — TOQUE PARA PAGAR`,
    reminderBody: (price, deadline) =>
      `EVITE LAS MULTAS: pague ${price} antes de ${deadline}. Abra Toll Alert y toque «Marcar como pagado» cuando lo haya hecho.`,
    reminderManyTitle: (count) => `${count} pasos sin pagar — TOQUE PARA PAGAR`,
    reminderManyBody: (names) =>
      `EVITE LAS MULTAS: ${names} siguen pendientes. Abra Toll Alert y marque como pagado cada uno que haya resuelto.`,
    and: 'y',
  },
  deadlines: {
    'Midnight the day after crossing': 'la medianoche del día siguiente al paso',
    'Midnight the day after travel': 'la medianoche del día siguiente al viaje',
    'Midnight on the third day after crossing': 'la medianoche del tercer día después del paso',
    'Midnight 3 days after driving in the zone': 'la medianoche del tercer día después de circular por la zona',
  },
  settings: {
    language: 'Idioma',
    languageCaption: 'Se usa en la introducción, la pantalla de inicio y sus alertas y recordatorios.',
  },
};

const pl: Strings = {
  languageName: 'Polski',
  common: {
    avoidFines: 'UNIKAJ MANDATÓW ZA OPŁATY DROGOWE',
    tapToPay: 'DOTKNIJ, ABY ZAPŁACIĆ',
    chooseLanguage: 'Wybierz język',
    cancel: 'Anuluj',
  },
  welcome: {
    headline: 'Już nigdy nie zapomnisz o opłacie drogowej w Wielkiej Brytanii',
    alertPreviewTitle: 'Tak wygląda powiadomienie',
    alertNow: 'teraz',
    alertTitle: (name) => `Wykryto: ${name} — DOTKNIJ, ABY ZAPŁACIĆ`,
    alertBody: (price) => `Zapłać ${price} na oficjalnej stronie. UNIKAJ MANDATÓW.`,
    download: 'ZACZNIJ',
    subscribe: 'Potem subskrypcja za jedyne 4,99 £ rocznie.',
  },
  stats: {
    fineEach: (amount) => `Kara: ${amount} za każdy`,
    totalMillions: (millions) => `ponad ${millions} mln £ kar`,
    money: (millions) => `${millions} mln £`,
    labels: {
      dartford: 'zapłacono w karach Dart Charge w latach 2024–25 — więcej niż za samą opłatę',
      ulez: 'kar ULEZ w pierwszych sześciu miesiącach strefy obejmującej cały Londyn',
      congestion: 'kar Congestion Charge w 2024 roku',
      'tfl-tunnels': 'kar za tunele w pierwszych czterech miesiącach (2025)',
      merseyflow: 'kar na Mersey Gateway w pierwszym roku',
      tyne: 'kar za Tyne Tunnel w ciągu sześciu miesięcy',
      humber: 'wezwań za nieopłacony przejazd po przejściu na płatności bezgotówkowe (2026)',
      warburton: 'przejazdów zarejestrowanych jako nieopłacone od stycznia 2026',
    },
  },
  ulezIntro: {
    title: 'Jeden zły skręt. 12,50 £ mniej.',
    copy:
      'Strefa ULEZ obejmuje każdą dzielnicę Londynu — nie tylko centrum. Kamery egzekwują ją automatycznie w chwili wjazdu niespełniającego norm pojazdu, bez znaku ostrzegawczego. Toll Alert pilnuje granicy, żebyś nie dowiedział się za późno.',
    getStarted: 'Zaczynamy',
  },
  howItWorks: {
    title: 'Jak to działa',
    steps: [
      {
        title: 'Wykrywa przejazd',
        body: 'Toll Alert zauważa, kiedy przejedziesz most, tunel lub płatną drogę — w tle, nawet gdy aplikacja jest zamknięta.',
      },
      {
        title: 'Przypomina, dopóki nie zapłacisz',
        body: 'Powiadomienie o różnych porach dnia przypomina, że nie zapłaciłeś jeszcze opłaty. Własne godziny przypomnień ustawisz w Ustawieniach.',
      },
      {
        title: 'Prowadzi na właściwą stronę',
        body: 'Dotknij, aby zapłacić, a link zaprowadzi cię prosto na oficjalną stronę płatności — nie dasz się oszukać fałszywej stronie.',
      },
      {
        title: 'Dotykasz „Zapłacono”',
        body: 'To wyłącza przypomnienie. Toll Alert nie sprawdza tego w Dart Charge ani TfL — „Zapłacono” tylko informuje aplikację, że zapłaciłeś, niczego nie dowodzi.',
      },
    ],
    continue: 'Dalej',
  },
  disclaimer: {
    title: 'Zanim przejdziesz dalej',
    text:
      'Ta aplikacja jest narzędziem do przypomnień, a nie gwarancją. Telefon musi być w pojeździe, aby otrzymać powiadomienie. ' +
      'Wykrywanie może zawieść — GPS może stracić sygnał (np. w tunelach), system telefonu może opóźnić lub wyciszyć powiadomienia, ' +
      'a procesy w tle mogą zostać zatrzymane w celu oszczędzania baterii. Ponosisz pełną odpowiedzialność za opłacenie swoich opłat ' +
      'drogowych, niezależnie od tego, czy otrzymasz powiadomienie z tej aplikacji.',
    checkbox:
      'Rozumiem, że ta aplikacja służy tylko do przypomnień, a opłacenie opłat drogowych jest moim obowiązkiem.',
    understand: 'Rozumiem',
  },
  permissions: {
    title: 'Jeszcze jedno',
    body: 'Aby wykrywać przejazdy, gdy telefon jest w kieszeni, Toll Alert musi sprawdzać lokalizację w tle — także gdy aplikacja jest zamknięta.',
    cardTitle: 'Co będzie dalej',
    iosSteps: [
      [{ text: 'Dotknij ' }, { text: '"Allow While Using App"', bold: true }, { text: ' w oknie lokalizacji.' }],
      [{ text: 'iOS zapyta drugi raz — wybierz ' }, { text: '"Change to Always Allow"', bold: true }, { text: '.' }],
      [{ text: 'Dotknij ' }, { text: 'Allow', bold: true }, { text: ' w oknie powiadomień. Dzięki temu powiadomienie do ciebie dotrze.' }],
    ],
    androidSteps: [
      [{ text: 'Dotknij ' }, { text: '"While using the app"', bold: true }, { text: ' w oknie lokalizacji.' }],
      [
        { text: 'Android otworzy wtedy ' },
        { text: 'Ustawienia', bold: true },
        { text: ', a nie kolejne okno. Przejdź do ' },
        { text: 'Uprawnienia → Lokalizacja', bold: true },
        { text: ', wybierz ' },
        { text: '"Allow all the time"', bold: true },
        { text: ' i wróć tutaj — Toll Alert włączy się sam.' },
      ],
      [{ text: 'Dotknij ' }, { text: 'Allow', bold: true }, { text: ' w oknie powiadomień. Dzięki temu powiadomienie do ciebie dotrze.' }],
    ],
    footnote: 'Toll Alert używa tego wyłącznie do wykrywania przejazdów z twojej listy. Nie śledzi ani nie zapisuje trasy.',
    note: 'Bez lokalizacji w tle i powiadomień przejazd wykryty przy zamkniętej aplikacji nie dotrze do ciebie. Możesz to zmienić później w Ustawieniach.',
    settingUp: 'Konfigurowanie…',
    turnOn: 'Włącz powiadomienia o przejazdach',
    notNow: 'Nie teraz',
    androidAlertTitle: 'Został jeden krok',
    androidAlertBody:
      'Jeśli telefon otworzył Ustawienia, wybierz Uprawnienia → Lokalizacja → "Allow all the time" i wróć tutaj — Toll Alert włączy się sam. Bez tego przejazd nie zostanie wykryty przy zamkniętej aplikacji. Możesz to sprawdzić w Ustawienia → Diagnostics.',
    iosAlertTitle: 'Powiadomienia są wyłączone',
    iosAlertBody:
      'Toll Alert potrzebuje dostępu do lokalizacji „Zawsze”, aby wykryć przejazd przy zamkniętej aplikacji. Możesz go przyznać w dowolnej chwili w Ustawienia → Monitorowanie w tle.',
    ok: 'OK',
  },
  home: {
    watching: (count) => `Monitorowane przejazdy: ${count}`,
    notWatching: 'Brak monitorowania — włącz monitorowanie w tle',
    expiredBadge: 'WYGASŁA',
    getStartedBadge: 'ZACZNIJ',
    expiredTitle: 'Twoja subskrypcja wygasła',
    startTitle: 'Rozpocznij subskrypcję',
    expiredBody: 'Odnów, aby nadal otrzymywać powiadomienia o przejazdach.',
    startBody: 'Zasubskrybuj, aby włączyć powiadomienia dla każdego monitorowanego przejazdu.',
    renew: 'Odnów',
    viewSubscription: 'Zobacz subskrypcję',
    needsAttention: 'Wymaga uwagi',
    crossedAt: (time) => `Przejazd o ${time}`,
    unpaid: 'Nieopłacone',
    monitored: 'Monitorowane przejazdy',
    point: 'Punkt',
    zone: 'Strefa',
    liveNotIn: 'Aktywne — nie jesteś teraz na tym przejeździe',
    paused: 'Monitorowanie wstrzymane — włącz je w Ustawieniach',
    simulate: '▸ Symuluj przejazd (demo)',
    replay: '↺ Pokaż wprowadzenie ponownie (demo)',
  },
  detail: {
    notFound: 'To przypomnienie już nie istnieje.',
    detected: (when) => `Wykryto ${when}`,
    paid: 'Opłacone',
    unpaid: 'Nieopłacone',
    charge: 'Opłata',
    payBy: (deadline) => `⏱ Zapłać do: ${deadline}`,
    ifUnpaid: 'W razie braku opłaty',
    paidDisclaimer: (operator) =>
      `„Oznacz jako opłacone” tylko zamyka to przypomnienie — Toll Alert nie weryfikuje płatności w ${operator}. To ty odpowiadasz za zapłatę.`,
    verified: (operator, date) =>
      `Kwoty sprawdzone u ${operator} dnia ${date} — stawki często się zmieniają, potwierdź je na stronie płatności.`,
    openPayment: 'DOTKNIJ, ABY ZAPŁACIĆ — oficjalna strona',
    antiScam: (operator) =>
      `Ten przycisk otwiera wyłącznie oficjalną stronę ${operator} — nigdy podróbki doliczającej własne opłaty.`,
    markPaid: 'Oznacz jako opłacone',
    backHome: 'Wróć do ekranu głównego',
  },
  notifications: {
    detectedTitle: (name) => `Wykryto: ${name} — DOTKNIJ, ABY ZAPŁACIĆ`,
    detectedBody: (price, deadline) =>
      `UNIKAJ MANDATÓW: zapłać ${price} do ${deadline}. Dotknij, aby zapłacić na oficjalnej stronie, potem oznacz jako opłacone.`,
    freeTitle: (name) => `Wykryto: ${name} — nic do zapłaty`,
    freeBodyWindow: (name, window) => `${name} pobiera opłaty tylko w godz. ${window}, więc ten przejazd jest bezpłatny. Dotknij, aby sprawdzić.`,
    freeBody: (name) => `${name} jest o tej porze bezpłatny, nie ma nic do zapłaty. Dotknij, aby sprawdzić.`,
    markPaidAction: 'Oznacz jako opłacone',
    reminderTitle: (name) => `${name} wciąż nieopłacone — DOTKNIJ, ABY ZAPŁACIĆ`,
    reminderBody: (price, deadline) =>
      `UNIKAJ MANDATÓW: zapłać ${price} do ${deadline}. Otwórz Toll Alert i dotknij „Oznacz jako opłacone”, gdy to zrobisz.`,
    reminderManyTitle: (count) => `Nieopłacone przejazdy: ${count} — DOTKNIJ, ABY ZAPŁACIĆ`,
    reminderManyBody: (names) =>
      `UNIKAJ MANDATÓW: ${names} wciąż wymagają zapłaty. Otwórz Toll Alert i oznacz każdy załatwiony jako opłacony.`,
    and: 'i',
  },
  deadlines: {
    'Midnight the day after crossing': 'północy następnego dnia po przejeździe',
    'Midnight the day after travel': 'północy następnego dnia po podróży',
    'Midnight on the third day after crossing': 'północy trzeciego dnia po przejeździe',
    'Midnight 3 days after driving in the zone': 'północy trzeciego dnia po wjeździe do strefy',
  },
  settings: {
    language: 'Język',
    languageCaption: 'Używany we wprowadzeniu, na ekranie głównym oraz w powiadomieniach i przypomnieniach.',
  },
};

const ro: Strings = {
  languageName: 'Română',
  common: {
    avoidFines: 'EVITAȚI AMENZILE DE TAXĂ',
    tapToPay: 'ATINGEȚI PENTRU A PLĂTI',
    chooseLanguage: 'Alegeți limba',
    cancel: 'Anulează',
  },
  welcome: {
    headline: 'Nu mai uitați niciodată o taxă rutieră în Regatul Unit',
    alertPreviewTitle: 'Așa arată alerta',
    alertNow: 'acum',
    alertTitle: (name) => `${name} detectat — ATINGEȚI PENTRU A PLĂTI`,
    alertBody: (price) => `Plătiți ${price} pe site-ul oficial. EVITAȚI AMENZILE DE TAXĂ.`,
    download: 'ÎNCEPEȚI',
    subscribe: 'Apoi abonament de doar 4,99 £ pe an.',
  },
  stats: {
    fineEach: (amount) => `Amendă: ${amount} fiecare`,
    totalMillions: (millions) => `peste ${millions} mil. £ în amenzi`,
    money: (millions) => `${millions} mil. £`,
    labels: {
      dartford: 'plătite în amenzi Dart Charge în 2024–25 — mai mult decât taxa însăși',
      ulez: 'amenzi ULEZ în primele șase luni ale zonei extinse la tot Londra',
      congestion: 'amenzi Congestion Charge în 2024',
      'tfl-tunnels': 'amenzi pentru tuneluri în primele patru luni (2025)',
      merseyflow: 'amenzi Mersey Gateway în primul an',
      tyne: 'amenzi Tyne Tunnel în șase luni',
      humber: 'notificări de taxă neplătită după trecerea la plata fără numerar (2026)',
      warburton: 'treceri înregistrate ca neplătite din ianuarie 2026',
    },
  },
  ulezIntro: {
    title: 'O singură greșeală de traseu. 12,50 £ pierdute.',
    copy:
      'Zona ULEZ acoperă toate cartierele Londrei — nu doar centrul. Camerele o aplică automat în clipa în care intră un vehicul neconform, fără niciun panou de avertizare. Toll Alert supraveghează limita ca să nu aflați prea târziu.',
    getStarted: 'Să începem',
  },
  howItWorks: {
    title: 'Cum funcționează',
    steps: [
      {
        title: 'Detectează trecerea',
        body: 'Toll Alert observă când ați traversat podul, tunelul sau drumul cu taxă — în fundal, chiar și cu aplicația închisă.',
      },
      {
        title: 'Vă amintește până plătiți',
        body: 'O notificare vă amintește la diferite ore ale zilei că nu v-ați plătit încă taxa. Vă puteți seta propriile ore de reamintire din Setări.',
      },
      {
        title: 'Vă duce pe site-ul corect',
        body: 'Atingeți pentru a plăti și un link vă duce direct pe site-ul oficial de plată, ca să nu fiți înșelat de un site de plată fals.',
      },
      {
        title: 'Atingeți „Plătit” după ce ați plătit',
        body: 'Asta oprește reamintirea. Toll Alert nu verifică la Dart Charge sau TfL — „Plătit” doar anunță aplicația că ați plătit, nu dovedește asta.',
      },
    ],
    continue: 'Continuă',
  },
  disclaimer: {
    title: 'Înainte de a continua',
    text:
      'Această aplicație este un instrument de reamintire, nu o garanție. Telefonul trebuie să fie în vehicul pentru a primi alerta. ' +
      'Detectarea poate eșua — GPS-ul poate pierde semnalul (de ex. în tuneluri), notificările pot fi întârziate sau silențioase din cauza ' +
      'sistemului telefonului, iar procesele din fundal pot fi oprite pentru a economisi bateria. Sunteți pe deplin responsabil pentru ' +
      'plata taxelor, indiferent dacă primiți sau nu o alertă de la această aplicație.',
    checkbox:
      'Înțeleg că această aplicație este doar o reamintire și că plata taxelor este responsabilitatea mea.',
    understand: 'Am înțeles',
  },
  permissions: {
    title: 'Un ultim lucru',
    body: 'Pentru a detecta trecerile cât timp telefonul e în buzunar, Toll Alert trebuie să vă verifice locația în fundal — inclusiv când aplicația e închisă.',
    cardTitle: 'Ce urmează',
    iosSteps: [
      [{ text: 'Atingeți ' }, { text: '"Allow While Using App"', bold: true }, { text: ' la solicitarea de locație.' }],
      [{ text: 'iOS va întreba a doua oară — alegeți ' }, { text: '"Change to Always Allow"', bold: true }, { text: '.' }],
      [{ text: 'Atingeți ' }, { text: 'Allow', bold: true }, { text: ' la solicitarea de notificări. Așa ajunge alerta la dumneavoastră.' }],
    ],
    androidSteps: [
      [{ text: 'Atingeți ' }, { text: '"While using the app"', bold: true }, { text: ' în fereastra de locație.' }],
      [
        { text: 'Android deschide apoi ' },
        { text: 'Setările', bold: true },
        { text: ', nu altă fereastră. Mergeți la ' },
        { text: 'Permisiuni → Locație', bold: true },
        { text: ', alegeți ' },
        { text: '"Allow all the time"', bold: true },
        { text: ', apoi reveniți aici — Toll Alert se va porni singur.' },
      ],
      [{ text: 'Atingeți ' }, { text: 'Allow', bold: true }, { text: ' la solicitarea de notificări. Așa ajunge alerta la dumneavoastră.' }],
    ],
    footnote: 'Toll Alert folosește asta doar pentru a detecta trecerile din lista dumneavoastră. Nu vă urmărește și nu vă salvează traseul.',
    note: 'Fără locație în fundal și notificări, o trecere detectată cu aplicația închisă nu vă poate anunța. Puteți schimba oricând din Setări.',
    settingUp: 'Se configurează…',
    turnOn: 'Activează alertele de trecere',
    notNow: 'Nu acum',
    androidAlertTitle: 'A mai rămas un pas',
    androidAlertBody:
      'Dacă telefonul a deschis Setările, alegeți Permisiuni → Locație → "Allow all the time", apoi reveniți aici — Toll Alert se va porni singur. Fără asta, o trecere nu poate fi detectată cu aplicația închisă. Puteți verifica în Setări → Diagnostics.',
    iosAlertTitle: 'Alertele sunt oprite',
    iosAlertBody:
      'Toll Alert are nevoie de acces la locație „Întotdeauna” pentru a detecta o trecere cu aplicația închisă. Îl puteți acorda oricând din Setări → Monitorizare în fundal.',
    ok: 'OK',
  },
  home: {
    watching: (count) => `Se monitorizează ${count} treceri`,
    notWatching: 'Nu se monitorizează — porniți monitorizarea în fundal',
    expiredBadge: 'EXPIRAT',
    getStartedBadge: 'ÎNCEPEȚI',
    expiredTitle: 'Abonamentul a expirat',
    startTitle: 'Începeți abonamentul',
    expiredBody: 'Reînnoiți pentru a primi în continuare alerte de trecere.',
    startBody: 'Abonați-vă pentru a activa alertele pentru fiecare trecere monitorizată.',
    renew: 'Reînnoiește',
    viewSubscription: 'Vezi abonamentul',
    needsAttention: 'Necesită atenția dumneavoastră',
    crossedAt: (time) => `Traversat la ${time}`,
    unpaid: 'Neplătit',
    monitored: 'Treceri monitorizate',
    point: 'Punct',
    zone: 'Zonă',
    liveNotIn: 'Activ — nu sunteți acum pe această trecere',
    paused: 'Monitorizare întreruptă — activați-o din Setări',
    simulate: '▸ Simulează o trecere (demo)',
    replay: '↺ Revezi introducerea (demo)',
  },
  detail: {
    notFound: 'Această reamintire nu mai există.',
    detected: (when) => `Detectat ${when}`,
    paid: 'Plătit',
    unpaid: 'Neplătit',
    charge: 'Taxă',
    payBy: (deadline) => `⏱ De plătit până la: ${deadline}`,
    ifUnpaid: 'Dacă nu plătiți',
    paidDisclaimer: (operator) =>
      `„Marchează ca plătit” doar închide această reamintire — Toll Alert nu verifică plata la ${operator}. Sunteți responsabil să plătiți efectiv.`,
    verified: (operator, date) =>
      `Sume verificate la ${operator} pe ${date} — tarifele se schimbă des, confirmați la linkul de plată.`,
    openPayment: 'ATINGEȚI PENTRU A PLĂTI — site oficial',
    antiScam: (operator) =>
      `Acest buton deschide doar site-ul oficial ${operator} — niciodată un site imitație care adaugă propriile comisioane.`,
    markPaid: 'Marchează ca plătit',
    backHome: 'Înapoi la ecranul principal',
  },
  notifications: {
    detectedTitle: (name) => `${name} detectat — ATINGEȚI PENTRU A PLĂTI`,
    detectedBody: (price, deadline) =>
      `EVITAȚI AMENZILE: plătiți ${price} până la ${deadline}. Atingeți pentru a plăti pe site-ul oficial, apoi marcați ca plătit.`,
    freeTitle: (name) => `${name} detectat — nimic de plată`,
    freeBodyWindow: (name, window) => `${name} se taxează doar între ${window}, deci trecerea e gratuită. Atingeți pentru a verifica.`,
    freeBody: (name) => `${name} este gratuit la această oră, nu aveți nimic de plată. Atingeți pentru a verifica.`,
    markPaidAction: 'Marchează ca plătit',
    reminderTitle: (name) => `${name} încă neplătit — ATINGEȚI PENTRU A PLĂTI`,
    reminderBody: (price, deadline) =>
      `EVITAȚI AMENZILE: plătiți ${price} până la ${deadline}. Deschideți Toll Alert și atingeți „Marchează ca plătit” după plată.`,
    reminderManyTitle: (count) => `${count} treceri neplătite — ATINGEȚI PENTRU A PLĂTI`,
    reminderManyBody: (names) =>
      `EVITAȚI AMENZILE: ${names} trebuie încă plătite. Deschideți Toll Alert și marcați fiecare rezolvată ca plătită.`,
    and: 'și',
  },
  deadlines: {
    'Midnight the day after crossing': 'miezul nopții din ziua de după trecere',
    'Midnight the day after travel': 'miezul nopții din ziua de după călătorie',
    'Midnight on the third day after crossing': 'miezul nopții din a treia zi după trecere',
    'Midnight 3 days after driving in the zone': 'miezul nopții din a treia zi după circulația în zonă',
  },
  settings: {
    language: 'Limbă',
    languageCaption: 'Folosită în introducere, pe ecranul principal și în alertele și reamintirile dumneavoastră.',
  },
};

export const STRINGS: Record<LanguageCode, Strings> = { en, fr, de, es, pl, ro };

/** Picker order: English first, then alphabetical by the language's own name. */
export const LANGUAGE_CODES: LanguageCode[] = ['en', 'de', 'es', 'fr', 'pl', 'ro'];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && value in STRINGS;
}
