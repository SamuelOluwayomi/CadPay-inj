# CadPay - Kaspa Payment Platform

**Secure Biometric & Web3 Payments on Kaspa Network**

CadPay is a modern payment platform built on the Kaspa blockchain, featuring biometric authentication, custodial wallet management, savings accounts, and subscription payments. It combines Web3 technology with traditional payment UX to create a seamless experience for both users and merchants.

**Live Demo:** [https://cadkas.vercel.app](https://cadkas.vercel.app)

---

## 🌟 Features

### User Features

- **🔐 Biometric Wallet Authentication**
  - **Passkey Integration**: Secure, passwordless login using WebAuthn (FaceID/TouchID).
  - **Device-Bound Security**: Private keys are encrypted and stored locally; access requires biometric proof.
  - **Non-Custodial UX**: Experience the security of a hardware wallet with the convenience of a web app.
  - **Fallback**: Option to use a secure PIN/Password method.
  
- **💼 Dual Wallet Modes**
  - **Custodial**: Encrypted cloud wallet for easy onboarding.
  - **Connected**: Seamless integration with **KasWare Wallet** browser extension.
  
- **🐷 Savings Pots**
  - Create goal-oriented savings accounts.
  - **Real On-Chain Vaults**: Each pot is a derived address on the Kaspa network.
  - Track progress and view transaction history.
  
- **📱 Subscription Management**
  - **Direct KAS Payments**: Pay for subscriptions directly from your wallet.
  - **Client-Side Signing**: Transactions are signed locally (via WASM SDK) for maximum security.
  - **Automated Tracking**: Monitor active subscriptions and payment history.
  
- **📊 User Dashboard**
  - Real-time balance display
  - Transaction history
  - Savings overview
  - Network status indicators

### Merchant Features

- **🏪 Merchant Dashboard**
  - Live transaction ledger
  - Revenue analytics (Total Revenue, MRR)
  - Customer metrics
  - Revenue split visualization
  
- **🔑 Developer API Keys**
  - Generate API keys for payment integration
  - Secure merchant authentication
  
- **🧾 Receipt Management**
  - Transaction receipts with metadata
  - Service-based categorization

---

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 16 (React 19)
- **Blockchain**: Kaspa (Testnet-10)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + WebAuthn
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Wallet**: Custom Kaspa implementation + KasWare integration

### Key Components

```
src/
├── app/                    # Next.js pages
│   ├── dashboard/         # User dashboard
│   ├── merchant/          # Merchant portal
│   ├── signin/            # Authentication
│   └── create/            # Account creation
├── components/            # React components
│   ├── shared/           # Reusable UI components
│   ├── subscriptions/    # Subscription management
│   └── security/         # Security settings
├── hooks/                # Custom React hooks
│   ├── useKasWare.ts    # KasWare wallet integration
│   ├── useUserProfile.ts # User authentication
│   ├── useSavings.ts    # Savings pot management
│   └── useBiometricWallet.ts # Biometric auth
├── utils/               # Utility functions
│   ├── kaspaWallet.ts  # Wallet generation
│   ├── encryption.ts   # Server-side encryption
│   └── recoveryKit.ts  # Backup generation
└── api/                # Next.js API routes
    ├── wallet/         # Custodial wallet endpoints
    └── faucet/         # Testnet faucet
```

### Database Schema

**[View Full Database Schema](DATABASE_SCHEMA.md)**
- `profiles`
- `profiles`
- `savings_pots`
- `savings_transactions`
- `receipts`

---

## 🚀 Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Kaspa wallet (KasWare extension or testnet faucet)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Kaspathon
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
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Encryption (Generate a secure 32-byte hex string)
   ENCRYPTION_KEY=your_32_byte_hex_encryption_key
   
   # Faucet (Testnet only)
   FAUCET_PRIVATE_KEY=your_faucet_wallet_private_key
   NEXT_PUBLIC_FAUCET_ADDRESS=your_faucet_kaspa_address
   
   # Network
   NEXT_PUBLIC_KASPA_NETWORK=testnet-10
   ```

4. **Database Setup**
   
   Run the Supabase migrations:
   ```sql
   -- Create tables in your Supabase SQL editor
   -- See database schema section for table definitions
   ```

5. **Generate Encryption Key**
   
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

---

## 📖 Usage

### For Users

1. **Create Account**
   - Visit `/create`
   - Choose authentication method (Biometric or Password)
   - Enter email and complete setup
   - Download recovery kit
   
2. **Sign In**
   - Visit `/signin`
   - Connect via KasWare (non-custodial) OR
   - Sign in with email (custodial)
   
3. **Manage Savings**
   - Navigate to "Savings Wallet" in dashboard
   - Create new savings pots with goals
   - Transfer funds using "Quick Transfer"
   - View transaction history
   
4. **Subscribe to Services**
   - Browse available services
   - Select subscription plan
   - Confirm payment
   - Manage in "My Subscriptions"

### For Merchants

1. **Access Merchant Portal**
   - Navigate to `/merchant`
   - Generate API key in "Developer Keys"
   
2. **View Analytics**
   - Track live transactions
   - Monitor revenue metrics
   - Analyze customer behavior
   
3. **Manage Receipts**
   - View payment receipts
   - Export transaction data

---

## 🔒 Security

### Custodial Wallet Security

- **Server-side encryption**: Private keys encrypted with AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Secure Storage**: Keys never exposed to client
- **Environment Protection**: Encryption keys in environment variables

### Biometric Security

- **WebAuthn Standard**: Industry-standard passkey authentication
- **Device Binding**: Keys stored in device secure element
- **No Password Storage**: Biometric data never leaves device
- **Recovery Kit**: Encrypted backup for account recovery

### Non-Custodial (KasWare)

- **User Control**: Users manage their own private keys
- **Browser Extension**: KasWare wallet integration
- **No Server Keys**: CadPay never accesses private keys

---

## 🔧 API Reference

### Custodial Wallet Endpoints

**POST /api/wallet/create**
- Creates a custodial wallet for authenticated user
- Generates encrypted private key
- Returns wallet address

**POST /api/wallet/send**
- Sends KAS from custodial wallet
- Requires authentication
- Parameters: `userId`, `toAddress`, `amount`

**GET /api/wallet/balance**
- Retrieves custodial wallet balance
- Requires authentication

### Faucet (Testnet Only)

**POST /api/faucet**
- Sends testnet KAS to address
- Parameters: `address`, `amount`

---

## 🌐 Network Information

- **Network**: Kaspa Testnet-10
- **Block Time**: ~1 second
- **Currency**: KAS (Testnet)
- **Explorer**: [Kaspa Testnet Explorer](https://explorer-tn10.kaspa.org/)

---

## 🐛 Known Issues & Roadmap

### Current Issues

- Savings pot funding requires Supabase Auth session (see implementation plan)
- Mobile responsive design refinements ongoing

### Roadmap

- [ ] Implement Supabase Auth integration in signup/signin
- [ ] Add support for mainnet deployment
- [ ] Implement recurring subscription automation
- [ ] Add multi-currency support
- [ ] Mobile app (React Native)
- [ ] Enhanced merchant analytics

---

## 📄 License

[Add your license here]

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for the Kaspa ecosystem**
