# VartalapAI - Business Intelligence Dashboard

**Live URL**: https://vartalapai.netlify.app

## Overview

VartalapAI is a comprehensive business intelligence platform for managing bills, inventory, customers, and analytics with AI-powered insights. Built with React, TypeScript, and Supabase.

## Features

### 📊 Core Modules
- **Dashboard** - Real-time business metrics and KPIs
- **Bill Generator** - Create and manage customer bills
- **Products Management** - Inventory tracking and stock control
- **Customer Profitability** - Analyze customer value and segments
- **Expense Tracking** - Monitor expenses and profit/loss
- **📖 Ledger** - Complete financial transaction history (NEW!)
- **Advanced Analytics** - Churn prediction and anomaly detection
- **Sales Forecasting** - Predict future sales trends
- **Statement Generator** - Customer account statements

### ✨ Ledger Features
- Combined view of all income (bills) and expenses
- Running balance calculation
- Advanced filtering (search, type, date range)
- CSV export functionality
- Real-time updates from database
- Visual indicators for income/expense
- Summary cards (Total Income, Expenses, Net Balance)

See [LEDGER_DOCUMENTATION.md](./LEDGER_DOCUMENTATION.md) for detailed ledger usage.

## Project info

**URL**: (project URL or remove this line)

## How can I edit this code?

There are several ways of editing your application.

Edit this project locally using your preferred IDE or via GitHub.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Use your preferred deployment method (Vercel, Netlify, or self-host) — build with `npm run build` and deploy the `dist` folder.

To connect a custom domain, follow your chosen provider's instructions.

## Supabase integration

This project can connect to a Supabase project. Create a file called `.env.local` at the repository root and add the following variables (do NOT commit this file):

VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-publishable-key>"

If you need the project id for reference you can set it too (not required by the client lib):
VITE_SUPABASE_PROJECT_ID="<project-id>"

After adding the variables, install the Supabase client and run the dev server:

1. npm install @supabase/supabase-js
2. npm run dev

The app will attempt to read from the tables: `customers`, `products`, `bills`, `expenses`, and `bill_items`. If Supabase is not configured the app falls back to local mock data.
