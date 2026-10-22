"""
app.py
------
Flask backend for the Student Management System.
Serves the frontend HTML and provides REST API endpoints.
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import re
import database

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)  # Allows the browser to call our API

# Initialise the database (creates table if not already present)
database.init_db()


# ---------------------------------------------------------------------------
# Helper: validation
# ---------------------------------------------------------------------------

def validate_student_data(data, student_id=None):
    """
    Validates all student fields.
    Returns a list of error messages; an empty list means everything is valid.
    student_id is passed when updating so we can allow the same roll number.
    """
    errors = []

    full_name = data.get("full_name", "").strip()
    roll_number = data.get("roll_number", "").strip()
    class_year = data.get("class_year", "").strip()
    department = data.get("department", "").strip()
    marks_raw = data.get("marks", "")
    contact_number = data.get("contact_number", "").strip()
    email = data.get("email", "").strip()

    # Required fields
    if not full_name:
        errors.append("Full name is required.")
    if not roll_number:
        errors.append("Roll number is required.")
    if not class_year:
        errors.append("Class / Year is required.")
    if not department:
        errors.append("Department is required.")
    if not contact_number:
        errors.append("Contact number is required.")

    # Marks
    try:
        marks = float(marks_raw)
        if marks < 0 or marks > 100:
            errors.append("Marks must be between 0 and 100.")
    except (ValueError, TypeError):
        errors.append("Marks must be a valid number.")
        marks = None

    # Contact number: 10 digits
    if contact_number and not re.fullmatch(r"[6-9]\d{9}", contact_number):
        errors.append("Contact number must be a valid 10-digit Indian mobile number starting with 6-9.")

    # Email (optional)
    if email:
        email_pattern = r"^[\w\.\+\-]+@[\w\-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, email):
            errors.append("Email address is not valid.")

    return errors


# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serves the main HTML page."""
    return render_template("index.html")


# ---------------------------------------------------------------------------
# API: Dashboard statistics
# ---------------------------------------------------------------------------

@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    """Returns summary statistics for the dashboard cards."""
    stats = database.get_dashboard_stats()
    return jsonify(stats), 200


# ---------------------------------------------------------------------------
# API: Search (must be registered BEFORE /api/students/<id>)
# ---------------------------------------------------------------------------

@app.route("/api/students/search", methods=["GET"])
def search_students():
    """Searches students by name, roll number, or department."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([]), 200
    results = database.search_students(query)
    return jsonify(results), 200


# ---------------------------------------------------------------------------
# API: CRUD
# ---------------------------------------------------------------------------

@app.route("/api/students", methods=["GET"])
def get_students():
    """Returns all student records."""
    students = database.get_all_students()
    return jsonify(students), 200


@app.route("/api/students", methods=["POST"])
def add_student():
    """Adds a new student record."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400

    errors = validate_student_data(data)
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        new_id = database.add_student(
            full_name=data["full_name"].strip(),
            roll_number=data["roll_number"].strip(),
            class_year=data["class_year"].strip(),
            department=data["department"].strip(),
            marks=float(data["marks"]),
            contact_number=data["contact_number"].strip(),
            email=data.get("email", "").strip() or None
        )
        student = database.get_student_by_id(new_id)
        return jsonify({"message": "Student added successfully.", "student": student}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409  # 409 Conflict = duplicate roll number


@app.route("/api/students/<int:student_id>", methods=["GET"])
def get_student(student_id):
    """Returns a single student by id."""
    student = database.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404
    return jsonify(student), 200


@app.route("/api/students/<int:student_id>", methods=["PUT"])
def update_student(student_id):
    """Updates an existing student record."""
    student = database.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found."}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided."}), 400

    errors = validate_student_data(data, student_id=student_id)
    if errors:
        return jsonify({"errors": errors}), 400

    try:
        updated = database.update_student(
            student_id=student_id,
            full_name=data["full_name"].strip(),
            roll_number=data["roll_number"].strip(),
            class_year=data["class_year"].strip(),
            department=data["department"].strip(),
            marks=float(data["marks"]),
            contact_number=data["contact_number"].strip(),
            email=data.get("email", "").strip() or None
        )
        if not updated:
            return jsonify({"error": "Student not found."}), 404
        updated_student = database.get_student_by_id(student_id)
        return jsonify({"message": "Student updated successfully.", "student": updated_student}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@app.route("/api/students/<int:student_id>", methods=["DELETE"])
def delete_student(student_id):
    """Deletes a student record."""
    deleted = database.delete_student(student_id)
    if not deleted:
        return jsonify({"error": "Student not found."}), 404
    return jsonify({"message": "Student deleted successfully."}), 200


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Starting Student Management System...")
    print("Open http://127.0.0.1:5000/ in your browser.")
    app.run(debug=True, port=5000)
