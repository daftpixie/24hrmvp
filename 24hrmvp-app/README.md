# 24HRMVP - Community-Driven 24-Hour MVP Platform

A Farcaster Mini App that enables community voting on software ideas and autonomous AI-driven MVP development within 24 hours.

## Tech Stack

- **Runtime**: Node.js 22.11.0 LTS
- **Frontend**: Next.js 14.2.25+ (React, TypeScript)
- **Backend**: Express.js 4.19.2 (TypeScript)
- **Database**: PostgreSQL 16.10+ with Prisma ORM 5.x
- **AI**: Claude Sonnet 4.5 for autonomous MVP generation
- **Platform**: Farcaster Mini Apps SDK
- **Deployment**: Railway (unified frontend + backend + database)

## Quick Start

### Prerequisites
- Node.js 22.11.0+
- PostgreSQL 16.10+
- Railway account
- Anthropic API key

### Installation
```bash
# Run setup script
chmod +x setup.sh
./setup.sh
```

## Architecture
```
┌─────────────────────────────────────────────┐
│           24HRMVP Mini App                  │
├─────────────────────────────────────────────┤
│  Frontend (Next.js 14 + Farcaster SDK)      │
├─────────────────────────────────────────────┤
│  Backend API (Express 4.19 + TypeScript)    │
├─────────────────────────────────────────────┤
│  AI Engine (Claude Sonnet 4.5)              │
├─────────────────────────────────────────────┤
│  Database (PostgreSQL 16 + Prisma 5)        │
└─────────────────────────────────────────────┘
```

## License

MIT
