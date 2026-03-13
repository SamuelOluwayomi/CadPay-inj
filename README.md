# CadPay - Injective Payment Platform

**Secure Biometric & Web3 Payments on Injective Network**

CadPay is a modern payment platform built on the Injective blockchain, featuring biometric authentication, custodial wallet management, savings accounts, and subscription payments. It combines Injective's high-performance DeFi infrastructure with traditional payment UX to create a seamless experience for both users and merchants.

**Live Demo:** [https://cadpay-inj.vercel.app](https://cadpay-inj.vercel.app)

---

## 🌟 Features

### User Features

- **🔐 Biometric Wallet Authentication**
  - **Passkey Integration**: Secure, passwordless login using WebAuthn (FaceID/TouchID).
  - **Device-Bound Security**: Private keys are encrypted and stored locally; access requires biometric proof.
  - **Non-Custodial UX**: Experience the security of a hardware wallet with the convenience of a web app.
  - **Fallback**: Option to use a secure PIN/Password method.
  
- **💼 Dual Wallet Modes**
  - **Custodial**: Encrypted cloud wallet for easy onboarding via Injective SDK.
  - **Connected**: Seamless integration with **Keplr**, **Metamask**, and other Injective supported wallets.
  
- **🐷 Savings Pots**
  - Create goal-oriented savings accounts.
  - **Real On-Chain Vaults**: Each pot is a derived address on the Injective network.
  - Track progress and view transaction history.
  
- **📱 Subscription Management**
  - **Direct INJ Payments**: Pay for subscriptions directly from your wallet.
  - **Client-Side Signing**: Transactions are signed locally using Injective SDK for maximum security.
  - **Automated Tracking**: Monitor active subscriptions and payment history.
  
- **📊 User Dashboard**
  - Real-time balance display
  - Transaction history
  - Savings overview
  - Injective Pulse (Network status indicators)

### Merchant Features

- **🏪 Merchant Dashboard**
  - Live transaction ledger
  - Revenue analytics (Total Revenue, MRR)
  - Customer metrics
  - Revenue split visualization
  - **Injective Explorer Integration**: Direct links to on-chain transaction verification.

---

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js (React 19)
- **Blockchain**: Injective (Testnet/Mainnet)
- **SDK**: `@injectivelabs/sdk-ts`, `@injectivelabs/wallet-ts`
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + WebAuthn
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Wallet**: Custom Injective implementation via SDK

### Key Components

```
src/
├── app/                    # Next.js pages
│   ├── dashboard/         # User dashboard
│   ├── merchant/          # Merchant portal
│   └── api/               # API Routes (Wallet, Broadcast)
├── components/            # React components
│   ├── subscriptions/    # Subscription management
│   └── shared/           # Reusable UI components
├── hooks/                # Custom React hooks
│   ├── useInjective.ts   # Injective wallet integration
│   ├── useSubscriptions.ts # Subscription logic
│   └── useBiometricWallet.ts # Biometric auth
├── lib/                  # Core logic
│   └── injective-wallet.ts # Injective SDK wrapper
└── utils/               # Utility functions
    ├── injectiveWallet.ts # Wallet generation
    └── encryption.ts     # AES-256-GCM encryption
```

---

## 🚀 Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Injective wallet (Keplr, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cadpay-inj
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create `.env.local` in the root directory:
   
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Injective Network
   NEXT_PUBLIC_INJECTIVE_NETWORK=testnet
   NEXT_PUBLIC_INJECTIVE_CHAIN_ID=injective-888
   
   # Encryption
   ENCRYPTION_KEY=your_32_byte_hex_encryption_key
   ```

4. **Development**

```bash
npm run dev
```

---

## 🔒 Security

- **AES-256-GCM Encryption**: Custodial keys are encrypted server-side.
- **Biometric Passkeys**: Hardware-bound security via WebAuthn.
- **Non-Custodial First**: Encourages the use of personal wallets like Keplr.

---

## 🌐 Network Information

- **Network**: Injective Testnet
- **Currency**: INJ
- **Explorer**: [Injective Explorer](https://explorer.injective.network/)

---

**Built with ❤️ for the Injective ecosystem**
