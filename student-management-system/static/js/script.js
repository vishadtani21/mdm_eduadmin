/**
 * script.js
 * ---------
 * Frontend logic for the Student Management System.
 * Uses Fetch API to communicate with the Python Flask backend.
 * All student data comes from the SQLite database via the API.
 */

"use strict";

/* ================================================================
   CONSTANTS
================================================================ */
const API_BASE = "";          // Flask serves on same origin
const DEBOUNCE_DELAY = 350;   // ms delay for search debounce

/* ================================================================
   STATE
================================================================ */
let allStudents = [];          // Full list from the API
let displayedStudents = [];    // After search / sort / filter
let deleteTargetId = null;     // Id of student pending deletion
let debounceTimer = null;

/* ================================================================
   1. INITIALISATION
================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
  loadStudents();
  setupSearchInput();
});

/* ================================================================
   2. NAVIGATION
================================================================ */
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  document.getElementById(`section-${name}`).classList.add("active");
  document.getElementById(`nav-${name}`).classList.add("active");

  const titles = { dashboard: "Dashboard Overview", students: "Student Records" };
  document.getElementById("topbarTitle").textContent = titles[name] || "";
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

/* Close sidebar when clicking outside on mobile */
document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  const toggle  = document.getElementById("menuToggle");
  if (sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !toggle.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});

/* ================================================================
   3. DASHBOARD STATISTICS
================================================================ */
async function loadDashboardStats() {
  try {
    const res  = await fetch(`${API_BASE}/api/dashboard/stats`);
    const data = await res.json();
    document.getElementById("stat-total").textContent   = data.total;
    document.getElementById("stat-avg").textContent     = data.average_marks ? data.average_marks.toFixed(1) : "0";
    document.getElementById("stat-highest").textContent = data.highest_marks  ? data.highest_marks  : "0";
    document.getElementById("stat-depts").textContent   = data.unique_departments;
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

/* ================================================================
   4. LOAD ALL STUDENTS
================================================================ */
async function loadStudents() {
  showLoading(true);
  hideEmptyState();
  clearTableBody();

  try {
    const res  = await fetch(`${API_BASE}/api/students`);
    const data = await res.json();
    allStudents = data;
    populateDeptFilter();
    applySortAndFilter();
  } catch (err) {
    console.error("Failed to load students:", err);
    showToast("Failed to load students. Is the Flask server running?", "error");
  } finally {
    showLoading(false);
  }
}

/* ================================================================
   5. RENDER TABLE
================================================================ */
function renderTable(students) {
  const tbody = document.getElementById("studentsTableBody");
  tbody.innerHTML = "";

  if (students.length === 0) {
    const searchVal = document.getElementById("searchInput").value.trim();
    showEmptyState(
      searchVal ? "No Students Found" : "No Students Yet",
      searchVal ? `No results for "${searchVal}". Try a different search.`
                : 'Click "Add Student" to add your first student record.'
    );
    document.getElementById("studentsTable").style.display = "none";
    document.getElementById("recordCount").textContent = "0 records";
    return;
  }

  hideEmptyState();
  document.getElementById("studentsTable").style.display = "";
  document.getElementById("recordCount").textContent =
    `${students.length} record${students.length !== 1 ? "s" : ""}`;

  students.forEach(student => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td title="${esc(student.roll_number)}">${esc(student.roll_number)}</td>
      <td title="${esc(student.full_name)}">${esc(student.full_name)}</td>
      <td>${esc(student.class_year)}</td>
      <td>${esc(student.department)}</td>
      <td>${renderMarksBadge(student.marks)}</td>
      <td>${esc(student.contact_number)}</td>
      <td title="${esc(student.email || '')}">${esc(student.email || "—")}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-icon btn-edit"  onclick="openEditModal(${student.id})" title="Edit student">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit
          </button>
          <button class="btn btn-icon btn-delete" onclick="openDeleteModal(${student.id}, '${esc(student.full_name)}')" title="Delete student">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm3.46-7.12l1.41-1.41L12 11.59l1.12-1.12 1.41 1.41L13.41 13l1.12 1.12-1.41 1.41L12 14.41l-1.12 1.12-1.41-1.41L10.59 13l-1.13-1.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMarksBadge(marks) {
  const m = parseFloat(marks);
  let cls = "marks-high";
  if (m < 40)      cls = "marks-low";
  else if (m < 70) cls = "marks-medium";
  return `<span class="marks-badge ${cls}">${m}</span>`;
}

/* ================================================================
   6. SEARCH, SORT, FILTER
================================================================ */
function setupSearchInput() {
  const input    = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearch");

  input.addEventListener("input", () => {
    clearBtn.style.display = input.value ? "block" : "none";
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applySortAndFilter(), DEBOUNCE_DELAY);
  });
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("clearSearch").style.display = "none";
  applySortAndFilter();
}

function applySortAndFilter() {
  const query   = document.getElementById("searchInput").value.trim().toLowerCase();
  const sortBy  = document.getElementById("sortBy").value;
  const deptFil = document.getElementById("filterDept").value.toLowerCase();

  let filtered = [...allStudents];

  // Filter by search
  if (query) {
    filtered = filtered.filter(s =>
      s.full_name.toLowerCase().includes(query) ||
      s.roll_number.toLowerCase().includes(query) ||
      s.department.toLowerCase().includes(query)
    );
  }

  // Filter by department
  if (deptFil) {
    filtered = filtered.filter(s => s.department.toLowerCase() === deptFil);
  }

  // Sort
  switch (sortBy) {
    case "full_name":
      filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
      break;
    case "marks_desc":
      filtered.sort((a, b) => b.marks - a.marks);
      break;
    case "marks_asc":
      filtered.sort((a, b) => a.marks - b.marks);
      break;
    default: // roll_number
      filtered.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
  }

  displayedStudents = filtered;
  renderTable(displayedStudents);
}

function populateDeptFilter() {
  const select = document.getElementById("filterDept");
  const current = select.value;
  // Keep first option (All Departments), rebuild rest
  while (select.options.length > 1) select.remove(1);

  const depts = [...new Set(allStudents.map(s => s.department))].sort();
  depts.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.toLowerCase();
    opt.textContent = d;
    select.appendChild(opt);
  });
  select.value = current;
}

/* ================================================================
   7. ADD STUDENT MODAL
================================================================ */
function openAddModal() {
  resetForm();
  document.getElementById("modalTitle").textContent    = "Add New Student";
  document.getElementById("submitBtnText").textContent = "Add Student";
  document.getElementById("studentId").value           = "";
  document.getElementById("rollNumber").removeAttribute("readonly");
  openModal("modalOverlay");
}

/* ================================================================
   8. EDIT STUDENT MODAL
================================================================ */
async function openEditModal(id) {
  resetForm();
  document.getElementById("modalTitle").textContent    = "Edit Student";
  document.getElementById("submitBtnText").textContent = "Save Changes";

  try {
    const res = await fetch(`${API_BASE}/api/students/${id}`);
    if (!res.ok) { showToast("Student not found.", "error"); return; }
    const s = await res.json();

    document.getElementById("studentId").value     = s.id;
    document.getElementById("fullName").value      = s.full_name;
    document.getElementById("rollNumber").value    = s.roll_number;
    document.getElementById("classYear").value     = s.class_year;
    document.getElementById("department").value    = s.department;
    document.getElementById("marks").value         = s.marks;
    document.getElementById("contactNumber").value = s.contact_number;
    document.getElementById("email").value         = s.email || "";

    openModal("modalOverlay");
  } catch (err) {
    showToast("Could not load student data.", "error");
  }
}

/* ================================================================
   9. FORM SUBMIT (Add or Edit)
================================================================ */
async function handleFormSubmit(e) {
  e.preventDefault();
  clearFieldErrors();

  const id      = document.getElementById("studentId").value;
  const payload = {
    full_name:      document.getElementById("fullName").value.trim(),
    roll_number:    document.getElementById("rollNumber").value.trim(),
    class_year:     document.getElementById("classYear").value.trim(),
    department:     document.getElementById("department").value.trim(),
    marks:          document.getElementById("marks").value,
    contact_number: document.getElementById("contactNumber").value.trim(),
    email:          document.getElementById("email").value.trim()
  };

  // --- Frontend validation ---
  const frontendErrors = validateFrontend(payload);
  if (frontendErrors.length) {
    showFormErrors(frontendErrors);
    return;
  }

  // Show loading state on button
  setSubmitLoading(true);

  try {
    const url    = id ? `${API_BASE}/api/students/${id}` : `${API_BASE}/api/students`;
    const method = id ? "PUT" : "POST";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      closeModal();
      showToast(id ? "Student updated successfully!" : "Student added successfully!", "success");
      await loadStudents();
      await loadDashboardStats();
    } else {
      // Backend validation errors
      if (data.errors) {
        showFormErrors(data.errors);
      } else if (data.error) {
        showFormErrors([data.error]);
      }
    }
  } catch (err) {
    showFormErrors(["Network error. Please check your connection."]);
  } finally {
    setSubmitLoading(false);
  }
}

/* ================================================================
   10. FRONTEND VALIDATION
================================================================ */
function validateFrontend(p) {
  const errors = [];

  if (!p.full_name)      errors.push("Full name is required.");
  if (!p.roll_number)    errors.push("Roll number is required.");
  if (!p.class_year)     errors.push("Class / Year is required.");
  if (!p.department)     errors.push("Department is required.");
  if (!p.contact_number) errors.push("Contact number is required.");

  const marks = parseFloat(p.marks);
  if (p.marks === "" || isNaN(marks)) {
    errors.push("Marks must be a valid number.");
  } else if (marks < 0 || marks > 100) {
    errors.push("Marks must be between 0 and 100.");
  }

  if (p.contact_number && !/^[6-9]\d{9}$/.test(p.contact_number)) {
    errors.push("Contact number must be a valid 10-digit Indian mobile number starting with 6–9.");
  }

  if (p.email && !/^[\w.\+\-]+@[\w\-]+\.[a-zA-Z]{2,}$/.test(p.email)) {
    errors.push("Email address is not valid.");
  }

  return errors;
}

/* ================================================================
   11. DELETE STUDENT
================================================================ */
function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById("deleteMessage").textContent =
    `Are you sure you want to delete "${name}"?`;
  openModal("deleteOverlay");
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  document.getElementById("confirmDeleteBtn").disabled = true;
  document.getElementById("confirmDeleteBtn").textContent = "Deleting...";

  try {
    const res = await fetch(`${API_BASE}/api/students/${deleteTargetId}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      closeDeleteModal();
      showToast("Student deleted successfully.", "success");
      await loadStudents();
      await loadDashboardStats();
    } else {
      showToast(data.error || "Failed to delete student.", "error");
      closeDeleteModal();
    }
  } catch (err) {
    showToast("Network error during deletion.", "error");
    closeDeleteModal();
  }
}

function closeDeleteModal() {
  closeModal("deleteOverlay");
  deleteTargetId = null;
  const btn = document.getElementById("confirmDeleteBtn");
  btn.disabled = false;
  btn.textContent = "Delete";
}

/* ================================================================
   12. MODAL HELPERS
================================================================ */
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
  resetForm();
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeDeleteModal();
  }
});

/* ================================================================
   13. FORM HELPERS
================================================================ */
function resetForm() {
  document.getElementById("studentForm").reset();
  document.getElementById("studentId").value = "";
  clearFieldErrors();
  hideFormErrors();
}

function showFormErrors(errors) {
  const container = document.getElementById("formErrors");
  container.innerHTML = errors.map(e => `<p>&#x2022; ${esc(e)}</p>`).join("");
  container.style.display = "block";
}

function hideFormErrors() {
  const container = document.getElementById("formErrors");
  container.style.display = "none";
  container.innerHTML = "";
}

function clearFieldErrors() {
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
  hideFormErrors();
}

function setSubmitLoading(isLoading) {
  document.getElementById("submitBtnText").style.display = isLoading ? "none" : "inline";
  document.getElementById("submitSpinner").style.display = isLoading ? "inline-block" : "none";
  document.getElementById("submitBtn").disabled = isLoading;
}

/* ================================================================
   14. TABLE HELPERS
================================================================ */
function clearTableBody() {
  document.getElementById("studentsTableBody").innerHTML = "";
}

function showLoading(show) {
  document.getElementById("loadingState").style.display = show ? "block" : "none";
}

function showEmptyState(title, msg) {
  document.getElementById("emptyStateTitle").textContent = title;
  document.getElementById("emptyStateMsg").textContent   = msg;
  document.getElementById("emptyState").style.display    = "block";
}

function hideEmptyState() {
  document.getElementById("emptyState").style.display = "none";
  document.getElementById("studentsTable").style.display = "";
}

/* ================================================================
   15. TOAST NOTIFICATIONS
================================================================ */
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: "&#10004;",
    error:   "&#10006;",
    info:    "&#8505;"
  };

  toast.innerHTML = `<span style="font-size:16px">${icons[type] || icons.info}</span> ${esc(message)}`;
  container.appendChild(toast);

  // Auto remove after 3.5 s
  setTimeout(() => {
    toast.classList.add("toast-fade-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3500);
}

/* ================================================================
   16. UTILITY
================================================================ */
function esc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function closeModal(overlayId) {
  const id = overlayId || "modalOverlay";
  document.getElementById(id).classList.remove("open");
  if (id === "modalOverlay") { document.body.style.overflow = ""; resetForm(); }
}
