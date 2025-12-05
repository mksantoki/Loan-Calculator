# 💰 Loan Calculator

A beautiful, feature-rich loan calculator web application that generates a complete amortization schedule with support for **multiple disbursements**, **EMI changes**, **part payments**, **interest rate changes**, **custom EMI deduction dates**, and **PDF export**.

![Static Site](https://img.shields.io/badge/Type-Static_Site-blue)
![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌐 Live Demo

👉 **[View Live Demo](https://mksantoki.github.io/Loan-Calculator/)**

## ✨ Features

- 📄 **PDF Export** - Export complete loan report with input data and amortization schedule
- 💾 **Auto-Save to Browser** - All data is automatically saved to browser storage
- 💸 **Multiple Loan Disbursements** - Add loan amounts as they are disbursed on different dates
- 📅 **EMI Deduction Day** - Set the exact day of month when EMI is deducted (1st, 5th, 10th, 15th, etc.)
- 🔄 **EMI Changes** - Modify your monthly EMI amount on specific dates
- 📆 **Date-wise Part Payments** - Add extra payments on specific dates to reduce principal faster
- 📈 **Dynamic Interest Rate Changes** - Apply new interest rates on specific dates
- 📊 **Complete Amortization Schedule** - Month-by-month breakdown until loan closure
- 📉 **Loan Analytics** - Visual charts for payment breakdown and balance over time
- ℹ️ **Loan Term Analysis** - Track original term, actual term, completed, remaining, and saved time
- 🎨 **Beautiful Dark UI** - Modern, responsive design with smooth animations
- 💹 **Real-time Calculations** - Instant results with detailed summary

## 🚀 Getting Started

### Option 1: Use Online (Recommended)

Simply visit the **[Live Demo](https://YOUR_USERNAME.github.io/loan-calculator/)** - no installation needed!

### Option 2: Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/loan-calculator.git
   cd loan-calculator
   ```

2. **Open in browser**
   
   Simply open `index.html` in your web browser. No server required!

   Or use a simple HTTP server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (npx)
   npx serve
   ```

3. **Open your browser**
   ```
   http://localhost:8000
   ```

## 🌍 Deploy to GitHub Pages

1. **Create a GitHub repository** and push your code

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Select **main** branch and **/ (root)** folder
   - Click **Save**

3. **Your site will be live at:**
   ```
   https://YOUR_USERNAME.github.io/REPO_NAME/
   ```

## 📖 Usage

### Loan Disbursements

Loans are often disbursed in multiple installments. Add each disbursement with its date:

1. Click **"Add Disbursement"**
2. Select the **Disbursement Date**
3. Enter the **Disbursement Amount**
4. Add multiple disbursements as needed
5. The total disbursed amount is shown in real-time

**Note:** The first disbursement date becomes the loan start date.

### Initial Loan Settings

1. **Initial Interest Rate** - Annual interest rate (%)
2. **Initial Monthly EMI** - Starting monthly payment amount
3. **EMI Deduction Day** - Select the day of month when your bank deducts EMI
4. **Original Loan Term** - Bank sanctioned tenure (for comparison)

### EMI Deduction Day (Important!)

The EMI deduction day affects interest calculation:
- Interest is calculated from one EMI date to the next
- For the first month, pro-rata interest is calculated from disbursement date to first EMI date
- This ensures accurate interest calculations based on your actual bank deduction schedule

### EMI Changes (Optional)

Change your EMI amount on specific dates (e.g., when you get a salary hike):

1. Click **"Add EMI Change"**
2. Select the **Effective Date**
3. Enter the **New EMI Amount**

### Part Payments (Optional)

Part payments are one-time extra payments made towards the principal:

1. Click **"Add Part Payment"**
2. Select the **Payment Date**
3. Enter the **Part Payment Amount**

### Interest Rate Changes (Optional)

Interest rates may change during the loan tenure:

1. Click **"Add Rate Change"**
2. Select the **Effective Date**
3. Enter the **New Interest Rate**

### Calculate & Export

- Click **"Calculate"** to generate the amortization schedule
- Click **"Export PDF"** to download a complete loan report

## 📁 Project Structure

```
loan-calculator/
├── index.html      # Complete app (HTML + CSS + JS)
├── README.md       # Documentation
├── LICENSE         # MIT License
└── .gitignore      # Git ignore file
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (No frameworks!)
- **Storage**: Browser localStorage
- **PDF Generation**: jsPDF + jsPDF-AutoTable (CDN)
- **Charts**: Chart.js (CDN)
- **Fonts**: Google Fonts (DM Sans, Playfair Display)

## 📊 Calculation Logic

### Monthly Interest
```
Monthly Interest = Remaining Balance × (Annual Rate / 12 / 100)
```

### First Month Pro-rata Interest
```
Days = EMI Deduction Day - Disbursement Day
First Month Interest = Principal × (Annual Rate / 365 / 100) × Days
```

### Principal Payment
```
Principal = EMI Payment + Part Payment - Monthly Interest
```

### New Balance
```
New Balance = Previous Balance + New Disbursement - Principal Paid
```

## 🎨 UI Features

- **Dark Theme** with amber/gold accents
- **Responsive Design** for all screen sizes
- **Smooth Animations** for better UX
- **Auto-save Indicator** shows when data is saved
- **Info Tooltips** explaining each metric
- **Visual Indicators**:
  - 🟣 Purple highlight for disbursement months
  - 🩷 Pink highlight for EMI change months
  - 🔵 Blue highlight for rate change months
  - 🟢 Green highlight for part payment months

## 💾 Data Persistence

All your entered data is **automatically saved** to your browser's localStorage. When you revisit the page, all your data will be restored automatically.

**Note:** Data is stored locally in your browser and is not sent to any server.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspired by modern fintech applications
- Icons from Heroicons
- Fonts from Google Fonts
- PDF generation powered by jsPDF
- Charts powered by Chart.js

---

Made with ❤️ for better loan management
