# Database Schema

This document outlines the Supabase database schema used in the CadPay application.

## Tables

### 1. `profiles`
Stores user profile information, authentication metadata, and optional custodial wallet keys. This centralized table handles both user identity and wallet association.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key. References `auth.users(id)` ON DELETE CASCADE. |
| `username` | text | User's display name. |
| `email` | text | User's email address. |
| `wallet_address` | text | Unique (Nullable). The user's Kaspa wallet address (Custodial or Connected). |
| `auth_method` | text | `password` or `biometric`. Tracks the user's login preference. |
| `encrypted_private_key`| text | AES-256-CBC Encrypted Kaspa Private Key (for custodial wallets). |
| `pin` | text | 4-digit security PIN (hashed/encrypted). |
| `emoji` | text | User's avatar emoji (default: 👤). |
| `gender` | text | User's gender (for customization). |
| `created_at` | timestamptz | Creation timestamp (default: now()). |
| `updated_at` | timestamptz | Last update timestamp (default: now()). |

**RLS Policies:**
- Users can view and update their own profile based on `auth.uid()`.

---

### 2. `receipts`
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

### 3. `savings_pots`
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

### 4. `savings_transactions`
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

### 5. `fund_requests`
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

- `profiles`: Indexed on `email` and `wallet_address`.
- `savings_pots`: Indexed on `user_address`.
- `savings_transactions`: Indexed on `pot_id`.
