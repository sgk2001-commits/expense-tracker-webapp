<<<<<<< HEAD
# Ledger — Expense Tracker

A clean, minimal expense tracker built with Flask + MongoDB + Vanilla JS.

## Stack
- **Backend**: Python (Flask)
- **Database**: MongoDB (via pymongo)
- **Frontend**: HTML/CSS/JavaScript + Chart.js

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start MongoDB
Make sure MongoDB is running locally:
```bash
# macOS (homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 --name mongo mongo:latest
```

### 3. Run the App
```bash
python app.py
```

Visit: http://localhost:5000

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGO_URI` || MongoDB connection string |

Example with custom URI:
```bash

```

## Features
- ✅ Add / Edit / Delete expenses
- ✅ Filter by category and date range
- ✅ Dashboard with totals and stats
- ✅ Doughnut chart — breakdown by category
- ✅ Bar chart — monthly spending trend
- ✅ Categories: Food, Transport, Housing, Entertainment, Health, Shopping, Education, Other
- ✅ Persistent storage in MongoDB

## Project Structure
```
expense-tracker/
├── app.py              # Flask routes + MongoDB logic
├── requirements.txt    # Python dependencies
├── templates/
│   └── index.html      # Single-page HTML template
└── static/
    ├── css/style.css   # Dark editorial theme
    └── js/app.js       # Frontend JS (fetch API + Chart.js)
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/expenses` | List expenses (supports ?category=, ?start=, ?end=) |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/stats` | Aggregated stats + chart data |
=======
# expense-tracker-webapp
Full-stack expense tracker using Flask, MongoDB, and JavaScript Public
>>>>>>> ea87f3c902afbdee2085be079d834eeadc20272a
