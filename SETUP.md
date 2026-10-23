# Deal Tracker - Setup Instructions

## Quick Start

### Option 1: Run Directly (Recommended for now)
1. Make sure you have Node.js installed on your computer
2. Open Command Prompt or PowerShell
3. Navigate to the deal-tracker folder
4. Run: `npm install` (only needed first time)
5. Run: `npm start`

### Option 2: Use Batch File
1. Double-click `run-app.bat` in the deal-tracker folder
2. Wait for the application to start

## What You Get

- **Desktop Application**: Full-featured deal tracking system
- **Local Database**: All your data stays on your computer (SQLite)
- **Offline Operation**: Works without internet connection
- **All Features**: 
  - Dashboard with deal overview
  - Add/manage suppliers and buyers
  - Create and track deals
  - View all historical deals
  - Generate reports and export to CSV
  - Brokerage calculations

## System Requirements

- Windows 10 or later
- Node.js (download from nodejs.org)
- 4GB RAM minimum
- 1GB free disk space

## Troubleshooting

If you get any errors:
1. Make sure Node.js is installed
2. Run `npm install` in the deal-tracker folder
3. Try running `npm start` from command line

## Data Location

Your database file is stored in: `deal-tracker/data/broker.db`
Make sure to backup this file regularly!