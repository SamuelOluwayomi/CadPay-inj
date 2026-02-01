# Solana Subscriptions Project

A Solana-based subscription payment platform.

## Prerequisites

- Node.js 18+ and npm
- Solana CLI (for local development)

## Installation

```bash
npm install
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Setup

Create a `.env.local` file in the root directory with your configuration:

```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

## Project Structure

- `/src/app` - Next.js app pages
- `/src/components` - React components
- `/src/hooks` - Custom React hooks
- `/anchor` - Solana program code
