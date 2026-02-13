# Database Schema

This document outlines the Supabase database schema used in the CadPay application.

## Tables

### 1. `profiles`
Stores user profile information, linked to either a Supabase Auth User ID (for custodial users) or a Wallet Address (for non-custodial users).

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key. References `auth.users(id)` ON DELETE CASCADE. |
| `wallet_address` | text | Unique (Nullable). The user's Kaspa wallet address. |
| `username` | text | User's display name. |
| `emoji` | text | User's avatar emoji (default: 👤). |
| `gender` | text | User's gender (for customization). |
| `pin` | text | 4-digit security PIN. |
| `email` | text | User's email address. |
| `encrypted_private_key`| text | AES-256-CBC Encrypted Kaspa Private Key (for custodial wallets). |
| `auth_user_id` | uuid | Foreign Key. References `auth.users(id)`. |
| `created_at` | timestamptz | Creation timestamp (default: now()). |
| `updated_at` | timestamptz | Last update timestamp (default: now()). |

**RLS Policies:**
- Users can view, insert, and update their own profile based on `auth.uid()`.

---

### 2. `user_credentials`
Stores authentication metadata for non-custodial/biometric login flows. This allows users to "log in" using just their email and password/biometrics, which then unlocks their local wallet.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key (default: `uuid_generate_v4()`). |
| `email` | text | Unique. User's email address. |
| `wallet_address` | text | The associated Kaspa wallet address. |
| `auth_method` | text | `password` or `biometric`. |
| `password_hash` | text | Hashed password (if `auth_method` is `password`). |
| `last_login` | timestamptz | Timestamp of last successful login. |
| `created_at` | timestamptz | Creation timestamp. |

---

### 3. `receipts`
Stores transaction receipts for the dashboard history.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key (default: `uuid_generate_v4()`). |
| `wallet_address` | text | Foreign Key. The user's wallet address. |
| `service_name` | text | Name of the service/merchant (e.g., "Netflix", "Uber"). |
| `plan_name` | text | Description of the transaction (e.g., "Standard Plan"). |
| `amount_kas` | decimal | Amount paid in KAS. |
| `amount_usd` | decimal | Approx. value in USD at time of transaction. |
| `status` | text | `completed`, `pending`, `failed`. |
| `tx_signature` | text | On-chain transaction ID (if available). |
| `merchant_wallet` | text | Recipient address. |
| `timestamp` | timestamptz | Transaction time (default: now()). |

---

### 4. `savings_pots`
Stores user-created savings goals/pots.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key (default: `gen_random_uuid()`). |
| `user_address` | text | Owner's wallet address. Indexed. |
| `name` | text | Name of the savings pot (e.g., "Vacation Fund"). |
| `address` | text | Unique address generated for this pot (mock address for demo). |
| `balance` | numeric | Current balance in the pot (KAS). Default: 0. |
| `duration_months` | integer | Lock duration in months. |
| `unlock_time` | bigint | Unix timestamp when the pot unlocks. |
| `status` | text | `active` or `closed`. |
| `created_at` | timestamptz | Creation timestamp. |

---

### 5. `savings_transactions`
Tracks deposits and withdrawals for savings pots.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key (default: `gen_random_uuid()`). |
| `pot_id` | uuid | Foreign Key. References `savings_pots(id)` ON DELETE CASCADE. Indexed. |
| `amount` | numeric | Transaction amount. |
| `type` | text | `deposit` or `withdraw`. |
| `currency` | text | `KAS` or `USDC`. |
| `tx_hash` | text | Transaction ID. |
| `created_at` | timestamptz | Transaction timestamp. |

---

### 6. `fund_requests`
Tracks requests for faucet funds.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | bigint | Primary Key (Identity). |
| `user_address` | text | Requestor's wallet address. |
| `amount` | numeric | Amount requested (default: 100). |
| `status` | text | `pending`, `completed`, `failed`. |
| `tx_id` | text | Transaction ID of the funding transfer. |
| `created_at` | timestamptz | Creation timestamp. |

## Validations & Indexes

- `user_credentials`: Indexed on `email` and `wallet_address`.
- `savings_pots`: Indexed on `user_address`.
- `savings_transactions`: Indexed on `pot_id`.
