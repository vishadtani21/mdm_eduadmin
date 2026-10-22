# Student Management System
## Full-Stack Web Application — College Mini Project

A complete web-based Student Management System built with:
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Fetch API
- **Backend:** Python Flask (REST API)
- **Database:** SQLite (via Python built-in sqlite3 module)

---

## QUICK START (Windows)

### Step 1 — Install Python
Download Python from https://www.python.org/downloads/
Make sure to check "Add Python to PATH" during installation.

### Step 2 — Open the project folder in VS Code
1. Open VS Code.
2. Go to File > Open Folder.
3. Select the `student-management-system` folder.

### Step 3 — Open the VS Code terminal
Press Ctrl + ` (backtick) OR go to Terminal > New Terminal.

### Step 4 — (Optional) Create a virtual environment
```powershell
python -m venv venv
```
This creates an isolated Python environment.

### Step 5 — Activate the virtual environment
```powershell
.\venv\Scripts\Activate.ps1
```
If you see an error about execution policy, run this instead:
```powershell
python -m venv venv
& venv\Scripts\python.exe -m pip install flask flask-cors
```

### Step 6 — Install required packages
```powershell
pip install -r requirements.txt
```
This installs Flask and Flask-CORS.

### Step 7 — Run the application
```powershell
python app.py
```
You will see:
```
[database.py] Database ready at: ...students.db
Starting Student Management System...
Open http://127.0.0.1:5000/ in your browser.
```

### Step 8 — Open in browser
Open your web browser and go to:
```
http://127.0.0.1:5000/
```

### Step 9 — Stop the application
Press Ctrl + C in the terminal.

---

## PROJECT STRUCTURE

```
student-management-system/
├── app.py            ← Flask backend (API routes)
├── database.py       ← SQLite database functions
├── requirements.txt  ← Python dependencies
├── README.md         ← This file
├── students.db       ← Auto-created SQLite database
├── templates/
│   └── index.html    ← Main HTML page
└── static/
    ├── css/
    │   └── style.css ← Styling
    └── js/
        └── script.js ← Frontend JavaScript
```

---

## API ENDPOINTS

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students | Get all students |
| POST | /api/students | Add a student |
| GET | /api/students/search?q=term | Search students |
| GET | /api/students/<id> | Get one student |
| PUT | /api/students/<id> | Update a student |
| DELETE | /api/students/<id> | Delete a student |
| GET | /api/dashboard/stats | Get statistics |

---

## TROUBLESHOOTING

**Error: "flask is not recognized"**
Run: `python -m flask run` instead of `flask run`

**Error: PowerShell execution policy**
Run: `& venv\Scripts\python.exe app.py`

**Port 5000 already in use**
Change the port in app.py: `app.run(debug=True, port=5001)`
Then open: http://127.0.0.1:5001/

**Database not found**
The database is created automatically. Just run `python app.py`.
