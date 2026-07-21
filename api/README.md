# Contactformulier (api/contact.js)

Alle formulieren op de site (contact, offerte-aanvragen, nieuwsbrief) posten naar
`/api/contact`. Die serverless-functie mailt de inhoud naar
info@glashandelgroenewegen.nl via [Resend](https://resend.com).

## Eenmalige instelling

1. Maak een gratis account op https://resend.com.
2. Verifieer het domein `glashandelgroenewegen.nl` in Resend (Domains → Add
   Domain) door de getoonde DNS-records toe te voegen. Dit is nodig om mail te
   sturen vanaf een `@glashandelgroenewegen.nl`-adres.
3. Maak een API-sleutel aan (API Keys → Create).
4. Zet de sleutel in Vercel: project → Settings → Environment Variables →
   `RESEND_API_KEY` = de sleutel. Toepassen op Production (en Preview).
5. Deploy opnieuw (of push), zodat de variabele actief wordt.

## Optionele variabelen

| Variabele  | Standaard                                                    |
|------------|--------------------------------------------------------------|
| `MAIL_TO`  | `info@glashandelgroenewegen.nl`                              |
| `MAIL_FROM`| `Glashandel Groenewegen <contact@glashandelgroenewegen.nl>` |

`MAIL_FROM` moet een adres op een in Resend geverifieerd domein zijn.

## Testen zonder domeinverificatie

Wil je direct testen voordat de DNS-records actief zijn, zet dan tijdelijk
`MAIL_FROM` op `onboarding@resend.dev`. Mail komt dan binnen, maar de afzender is
het Resend-testdomein. Zet dit na verificatie terug naar je eigen domein.
