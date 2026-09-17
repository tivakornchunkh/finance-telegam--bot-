# Google Sheets as Single Source of Truth via Service Account

## Context & Decision
The system forbids custom web apps or separate SQL databases; the user inspects and modifies records directly in Google Sheets. Balances must reflect manual sheet edits.

We decided to use the **Google Sheets API v4** authenticated via a **Google Cloud Service Account** (`credentials.json` / environment variable). All summary and balance calculations query the sheet dynamically on-demand; the bot holds zero financial state in memory or local SQLite.

