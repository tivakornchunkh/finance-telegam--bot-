# Personal Finance Telegram Bot

A personal finance assistant operating exclusively via Telegram and backed by Google Sheets as the single source of truth, converting Thai natural language text and bank slips into validated financial records.

## Language

### Financial Core

**Transaction**:
A single financial movement of money into or out of an account.
_Avoid_: Entry, record, row, item

**Income**:
Money received and credited to the user's account.
_Avoid_: Inflow, deposit, credit, revenue

**Expense**:
Money spent or paid out from the user's account.
_Avoid_: Outflow, debit, payment, spending

**Account**:
A named ledger label representing where funds originate or reside (defaulting to "K PLUS"), strictly as a tracking category without actual bank integration.
_Avoid_: Bank account, wallet, balance sheet

**Starting Balance**:
The initial baseline monetary amount configured by the user, used to calculate current balance by adding net income and subtracting expenses.
_Avoid_: Opening balance, initial deposit

**Current Balance**:
The dynamically computed total calculated from Starting Balance plus all Income minus all Expense recorded in the spreadsheet.
_Avoid_: Wallet balance, cash on hand

### Classification & Parsing

**Category**:
A classification label for grouping transactions (e.g., อาหาร, เดินทาง / น้ำมัน) dynamically loaded from the Categories sheet.
_Avoid_: Tag, classification, folder

**Slip**:
An image of a Thai electronic bank transfer confirmation or payment receipt.
_Avoid_: Invoice, photo, bill, check

**Slip Recognition**:
The multimodal AI vision process of extracting structured transaction facts (amount, timestamp, merchant, reference) from a Slip.
_Avoid_: OCR scanning, photo reading

**Source**:
The origin method of a transaction (`text`, `receipt`, or `manual`).
_Avoid_: Origin, channel, medium

### Bot Flow & State

**Confirmation Mode**:
The interaction state where the user must review and approve a parsed transaction preview before it is committed to Google Sheets.
_Avoid_: Preview mode, draft stage

**Duplicate Protection**:
The verification rule that checks if a slip or transaction reference has already been committed to prevent double-counting.
_Avoid_: De-duplication, replay filter

**Daily Reminder**:
A scheduled automated prompt sent to the user on days where no transactions have been recorded yet.
_Avoid_: Notification, alarm, ping

**Source of Truth**:
The Google Sheets spreadsheet that holds canonical financial records; bot in-memory data is strictly ephemeral.
_Avoid_: Cache, local DB

