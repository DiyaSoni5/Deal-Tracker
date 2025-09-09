# Broker Deal Tracker

A desktop application for managing broker deals, suppliers, buyers, and brokerage calculations.

## Features

- **Dashboard**: Overview of deals, brokerage earnings, and recent transactions
- **Deal Entry**: Add new deals with automatic brokerage calculations
- **Suppliers Management**: Add and manage supplier information
- **Buyers Management**: Add and manage buyer information  
- **Reports**: Filter deals, view summaries, and export to CSV

## Technology Stack

- **Frontend**: React + Tailwind CSS
- **Desktop**: Electron
- **Database**: SQLite3
- **Icons**: Lucide React

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Browser Mode (for testing)**
   ```bash
   npm run react-start
   ```
   Opens at http://localhost:3000 with mock data

3. **Run as Desktop App**
   ```bash
   npm start
   ```
   Launches Electron app with SQLite database

## Usage

### Adding Suppliers/Buyers
1. Go to Suppliers or Buyers tab
2. Click "Add Supplier/Buyer" 
3. Fill in details and save

### Creating Deals
1. Go to "New Deal" tab
2. Select supplier and buyer from dropdowns
3. Enter product details, rate, quantity
4. Set discount %, brokerage %, GST %
5. View real-time calculations on the right
6. Click "Save Deal"

### Viewing Reports
1. Go to Reports tab
2. Use filters to narrow down deals
3. View summary statistics
4. Export to CSV if needed

## Key Calculations

- **Amount without GST** = Rate × Quantity
- **Discount Amount** = Amount × Discount %
- **GST Amount** = (Amount - Discount) × GST %
- **Total Amount** = Amount - Discount + GST
- **Brokerage** = Amount × Brokerage %

## Database Schema

- **suppliers**: supplier_id, name, contact_no, address, gst_no
- **buyers**: buyer_id, name, contact_no, address, gst_no  
- **deals**: deal_id, supplier_id, buyer_id, confirmation_date, product_name, rate, quantity, unit, discount_percent, brokerage_percent, gst_percent, status
- **brokerage**: brokerage_id, deal_id, brokerage_amount, brokerage_status

## Building for Production

```bash
npm run build
npm run dist
```

This creates an installer in the `dist/` folder.

## Development Notes

- The app works offline with local SQLite database
- Mock data is used when running in browser mode
- Real database is used in Electron mode
- All calculations are done client-side for performance