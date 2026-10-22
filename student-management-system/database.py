"""
database.py
-----------
Handles all SQLite database operations for the Student Management System.
This file is imported by app.py to keep database logic separate from routing.
"""

import sqlite3
import os

# The database file will be created in the same folder as this script
DATABASE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "students.db")


def get_connection():
    """Opens and returns a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Allows dict-like access: row["full_name"]
    return conn


def init_db():
    """
    Creates the students table if it does not already exist.
    Called once when the Flask app starts.
    IF NOT EXISTS means existing records are NEVER deleted on restart.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name      TEXT    NOT NULL,
            roll_number    TEXT    NOT NULL UNIQUE,
            class_year     TEXT    NOT NULL,
            department     TEXT    NOT NULL,
            marks          REAL    NOT NULL CHECK(marks >= 0 AND marks <= 100),
            contact_number TEXT    NOT NULL,
            email          TEXT
        )
    """)
    conn.commit()
    conn.close()
    print(f"[database.py] Database ready at: {DATABASE_PATH}")


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

def add_student(full_name, roll_number, class_year, department, marks,
                contact_number, email):
    """Inserts a new student record. Raises ValueError on duplicate roll_number."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO students (full_name, roll_number, class_year, department,
                                  marks, contact_number, email)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (full_name, roll_number, class_year, department,
              marks, contact_number, email))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        raise ValueError(f"Roll number '{roll_number}' already exists.")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# READ
# ---------------------------------------------------------------------------

def get_all_students():
    """Returns a list of all student records as dictionaries."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students ORDER BY roll_number")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_student_by_id(student_id):
    """Returns a single student record as a dict, or None if not found."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def search_students(query):
    """Searches students by name, roll number, or department (case-insensitive)."""
    conn = get_connection()
    cursor = conn.cursor()
    like_query = f"%{query}%"
    cursor.execute("""
        SELECT * FROM students
        WHERE full_name   LIKE ?
           OR roll_number LIKE ?
           OR department  LIKE ?
        ORDER BY roll_number
    """, (like_query, like_query, like_query))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------

def update_student(student_id, full_name, roll_number, class_year, department,
                   marks, contact_number, email):
    """Updates an existing student record. Raises ValueError on roll_number conflict."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT id FROM students WHERE roll_number = ? AND id != ?",
            (roll_number, student_id)
        )
        if cursor.fetchone():
            raise ValueError(f"Roll number '{roll_number}' is already used by another student.")
        cursor.execute("""
            UPDATE students
            SET full_name=?, roll_number=?, class_year=?, department=?,
                marks=?, contact_number=?, email=?
            WHERE id=?
        """, (full_name, roll_number, class_year, department,
              marks, contact_number, email, student_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

def delete_student(student_id):
    """Deletes a student by id. Returns True if deleted, False if not found."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


# ---------------------------------------------------------------------------
# DASHBOARD STATISTICS
# ---------------------------------------------------------------------------

def get_dashboard_stats():
    """Computes summary statistics. Safe to call on empty database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            COUNT(*)                   AS total,
            ROUND(AVG(marks), 2)       AS average_marks,
            MAX(marks)                 AS highest_marks,
            COUNT(DISTINCT department) AS unique_departments
        FROM students
    """)
    row = cursor.fetchone()
    conn.close()
    return {
        "total":              row["total"] or 0,
        "average_marks":      row["average_marks"] or 0,
        "highest_marks":      row["highest_marks"] or 0,
        "unique_departments": row["unique_departments"] or 0
    }
