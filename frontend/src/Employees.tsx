import { useEffect, useState } from "react";
interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}
const API_URL = "http://127.0.0.1:8000";
export default function Employees() {
  // ============================================================
  // EMPLOYEE STATE
  // ============================================================
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] =
    useState<number | null>(null);
  // ============================================================
  // ADD EMPLOYEE STATE
  // ============================================================
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  // ============================================================
  // VIEW EMPLOYEE STATE
  // ============================================================
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  // ============================================================
  // EDIT EMPLOYEE STATE
  // ============================================================
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] =
    useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  // ============================================================
  // TOKEN
  // ============================================================
  const getToken = () => {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token")
    );
  };
  // ============================================================
  // NORMALIZE EMPLOYEE
  // ============================================================
  const normalizeEmployee = (user: any): Employee => {
    return {
      id: Number(user.id ?? user.user_id),
      name:
        user.name ??
        user.full_name ??
        user.username ??
        "Unknown Employee",
      email: user.email ?? "",
      role: String(user.role ?? "employee"),
      is_active:
        user.is_active ??
        user.active ??
        true,
    };
  };
  // ============================================================
  // LOAD EMPLOYEES
  // ============================================================
  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const token = getToken();
      const headers: HeadersInit = {
        Accept: "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(
        `${API_URL}/api/users/`,
        {
          method: "GET",
          headers,
        }
      );
      console.log(
        "Employees API status:",
        response.status
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Employees API error:",
          errorText
        );
        throw new Error(
          `Failed to load employees (${response.status})`
        );
      }
      const rawData = await response.json();
      console.log(
        "Employees API response:",
        rawData
      );
      // ========================================================
      // SUPPORT MULTIPLE API RESPONSE FORMATS
      // ========================================================
      let users: any[] = [];
      if (Array.isArray(rawData)) {
        users = rawData;
      } else if (Array.isArray(rawData.users)) {
        users = rawData.users;
      } else if (Array.isArray(rawData.employees)) {
        users = rawData.employees;
      } else if (Array.isArray(rawData.data)) {
        users = rawData.data;
      } else if (Array.isArray(rawData.results)) {
        users = rawData.results;
      }
      const normalizedUsers =
        users.map(normalizeEmployee);
      console.log(
        "All users:",
        normalizedUsers
      );
      // ========================================================
      // EMPLOYEE ROLE FILTER
      // ========================================================
      const employeeUsers =
        normalizedUsers.filter((user) => {
          const role = user.role
            .toLowerCase()
            .trim();
          return (
            role === "employee" ||
            role === "staff" ||
            role === "user"
          );
        });
      console.log(
        "Employees:",
        employeeUsers
      );
      // If backend already returns employee-only data,
      // don't accidentally hide it because of role naming.
      if (
        normalizedUsers.length > 0 &&
        employeeUsers.length === 0
      ) {
        setEmployees(normalizedUsers);
      } else {
        setEmployees(employeeUsers);
      }
    } catch (err) {
      console.error(
        "Unable to load employees:",
        err
      );
      setEmployees([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load employees."
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadEmployees();
  }, []);
  // ============================================================
  // ADD EMPLOYEE
  // ============================================================
  const handleAddEmployee = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    setFormError("");
    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setFormError(
        "Please fill in all fields."
      );
      return;
    }
    if (password.length < 6) {
      setFormError(
        "Password must contain at least 6 characters."
      );
      return;
    }
    try {
      setFormLoading(true);
      const token = getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(
        `${API_URL}/api/users/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            role: "employee",
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to create employee."
        );
      }
      setName("");
      setEmail("");
      setPassword("");
      setShowAddModal(false);
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to create employee."
      );
    } finally {
      setFormLoading(false);
    }
  };
  // ============================================================
  // ACTIVATE / DEACTIVATE
  // ============================================================
  const handleStatusChange = async (
    employee: Employee
  ) => {
    try {
      setActionLoading(employee.id);
      setError("");
      const action = employee.is_active
        ? "deactivate"
        : "activate";
      const token = getToken();
      const headers: HeadersInit = {
        Accept: "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(
        `${API_URL}/api/users/${employee.id}/${action}`,
        {
          method: "PATCH",
          headers,
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to update employee status."
        );
      }
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update employee status."
      );
    } finally {
      setActionLoading(null);
    }
  };
  // ============================================================
  // VIEW EMPLOYEE
  // ============================================================
  const handleViewEmployee = (
    employee: Employee
  ) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEmployee(null);
  };
  // ============================================================
  // EDIT EMPLOYEE
  // ============================================================
  const handleEditEmployee = (
    employee: Employee
  ) => {
    setEditEmployee(employee);
    setEditName(employee.name);
    setEditEmail(employee.email);
    setEditRole(employee.role);
    setEditError("");
    setShowEditModal(true);
  };
  const closeEditModal = () => {
    if (editLoading) return;
    setShowEditModal(false);
    setEditEmployee(null);
    setEditName("");
    setEditEmail("");
    setEditRole("");
    setEditError("");
  };
  // ============================================================
  // UPDATE EMPLOYEE
  // ============================================================
  const handleUpdateEmployee = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();
    if (!editEmployee) return;
    setEditError("");
    if (
      !editName.trim() ||
      !editEmail.trim()
    ) {
      setEditError(
        "Name and email are required."
      );
      return;
    }
    try {
      setEditLoading(true);
      const token = getToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(
        `${API_URL}/api/users/${editEmployee.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim(),
            role: editRole,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to update employee."
        );
      }
      setShowEditModal(false);
      setEditEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error(err);
      setEditError(
        err instanceof Error
          ? err.message
          : "Unable to update employee."
      );
    } finally {
      setEditLoading(false);
    }
  };
  // ============================================================
  // CLOSE ADD MODAL
  // ============================================================
  const closeAddModal = () => {
    if (formLoading) return;
    setShowAddModal(false);
    setFormError("");
    setName("");
    setEmail("");
    setPassword("");
  };
  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="employees-page">
      {/* ======================================================
          HEADER
          ====================================================== */}
      <div className="employees-header">
        <div>
          <span className="employees-eyebrow">
            WORKFORCE MANAGEMENT
          </span>
          <h1 className="employees-title">
            Employees
          </h1>
          <p className="employees-subtitle">
            Manage employees and monitor their
            account status.
          </p>
        </div>
        <button
          type="button"
          className="employees-add-button"
          onClick={() => {
            setFormError("");
            setShowAddModal(true);
          }}
        >
          <span>+</span>
          Add Employee
        </button>
      </div>
      {/* ======================================================
          ERROR
          ====================================================== */}
      {error && (
        <div className="employees-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
      {/* ======================================================
          DIRECTORY
          ====================================================== */}
      <div className="employees-card">
        <div className="employees-card-header">
          <div>
            <h2>
              Employee Directory
            </h2>
            <p>
              View and manage all registered
              employees.
            </p>
          </div>
          <span className="employees-count">
            {employees.length}{" "}
            {employees.length === 1
              ? "Employee"
              : "Employees"}
          </span>
        </div>
        {/* ====================================================
            LOADING
            ==================================================== */}
        {loading && (
          <div className="employees-message">
            <div className="employees-spinner" />
            <span>
              Loading employees...
            </span>
          </div>
        )}
        {/* ====================================================
            EMPTY
            ==================================================== */}
        {!loading &&
          !error &&
          employees.length === 0 && (
            <div className="employees-message">
              <strong>
                No employees found.
              </strong>
              <span>
                Add your first employee
                to get started.
              </span>
            </div>
          )}
        {/* ====================================================
            TABLE
            ==================================================== */}
        {!loading &&
          employees.length > 0 && (
            <div className="employees-table-wrapper">
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      Employee
                    </th>
                    <th>
                      Email
                    </th>
                    <th>
                      Role
                    </th>
                    <th>
                      Status
                    </th>
                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(
                    (employee) => (
                      <tr
                        key={employee.id}
                      >
                        {/* ID */}
                        <td>
                          <span className="employee-id">
                            #{employee.id}
                          </span>
                        </td>
                        {/* EMPLOYEE */}
                        <td>
                          <div className="employee-info">
                            <div className="employee-avatar">
                              {employee.name
                                ?.charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <strong>
                                {employee.name}
                              </strong>
                              <span>
                                Employee ID #
                                {employee.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        {/* EMAIL */}
                        <td>
                          <span className="employee-email">
                            {employee.email}
                          </span>
                        </td>
                        {/* ROLE */}
                        <td>
                          <span className="employee-role">
                            {employee.role}
                          </span>
                        </td>
                        {/* STATUS */}
                        <td>
                          <span
                            className={`employee-status ${
                              employee.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <span className="employee-status-dot" />
                            {employee.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>
                        {/* ACTIONS */}
                        <td>
                          <div className="employee-actions">
                            <button
                              type="button"
                              className="employee-action employee-action-view"
                              onClick={() =>
                                handleViewEmployee(
                                  employee
                                )
                              }
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="employee-action employee-action-edit"
                              onClick={() =>
                                handleEditEmployee(
                                  employee
                                )
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`employee-action ${
                                employee.is_active
                                  ? "employee-action-deactivate"
                                  : "employee-action-activate"
                              }`}
                              disabled={
                                actionLoading ===
                                employee.id
                              }
                              onClick={() =>
                                handleStatusChange(
                                  employee
                                )
                              }
                            >
                              {actionLoading ===
                              employee.id
                                ? "Updating..."
                                : employee.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>
      {/* ======================================================
          VIEW EMPLOYEE MODAL
          ====================================================== */}
      {showViewModal &&
        selectedEmployee && (
          <div
            className="employee-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeViewModal();
              }
            }}
          >
            <div className="employee-modal employee-view-modal">
              <div className="employee-modal-header">
                <div>
                  <span className="employee-modal-eyebrow">
                    EMPLOYEE PROFILE
                  </span>
                  <h2>
                    Employee Details
                  </h2>
                  <p>
                    View employee account
                    information.
                  </p>
                </div>
                <button
                  type="button"
                  className="employee-modal-close"
                  onClick={closeViewModal}
                >
                  ×
                </button>
              </div>
              <div className="employee-view-profile">
                <div className="employee-view-avatar">
                  {selectedEmployee.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <h3>
                    {selectedEmployee.name}
                  </h3>
                  <span>
                    Employee #
                    {selectedEmployee.id}
                  </span>
                </div>
              </div>
              <div className="employee-details-grid">
                <div className="employee-detail-item">
                  <span>
                    Full Name
                  </span>
                  <strong>
                    {selectedEmployee.name}
                  </strong>
                </div>
                <div className="employee-detail-item">
                  <span>
                    Employee ID
                  </span>
                  <strong>
                    #{selectedEmployee.id}
                  </strong>
                </div>
                <div className="employee-detail-item">
                  <span>
                    Email Address
                  </span>
                  <strong>
                    {selectedEmployee.email}
                  </strong>
                </div>
                <div className="employee-detail-item">
                  <span>
                    Role
                  </span>
                  <strong>
                    {selectedEmployee.role}
                  </strong>
                </div>
                <div className="employee-detail-item">
                  <span>
                    Account Status
                  </span>
                  <strong
                    className={
                      selectedEmployee.is_active
                        ? "detail-active"
                        : "detail-inactive"
                    }
                  >
                    {selectedEmployee.is_active
                      ? "Active"
                      : "Inactive"}
                  </strong>
                </div>
              </div>
              <div className="employee-form-actions">
                <button
                  type="button"
                  className="employee-cancel-button"
                  onClick={closeViewModal}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="employee-submit-button"
                  onClick={() => {
                    closeViewModal();
                    handleEditEmployee(
                      selectedEmployee
                    );
                  }}
                >
                  Edit Employee
                </button>
              </div>
            </div>
          </div>
        )}
      {/* ======================================================
          EDIT EMPLOYEE MODAL
          ====================================================== */}
      {showEditModal &&
        editEmployee && (
          <div
            className="employee-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeEditModal();
              }
            }}
          >
            <div className="employee-modal">
              <div className="employee-modal-header">
                <div>
                  <span className="employee-modal-eyebrow">
                    WORKFORCE
                  </span>
                  <h2>
                    Edit Employee
                  </h2>
                  <p>
                    Update employee account
                    information.
                  </p>
                </div>
                <button
                  type="button"
                  className="employee-modal-close"
                  onClick={closeEditModal}
                  disabled={editLoading}
                >
                  ×
                </button>
              </div>
              <form
                onSubmit={
                  handleUpdateEmployee
                }
                className="employee-form"
              >
                <div className="employee-form-group">
                  <label htmlFor="edit-employee-name">
                    Full Name
                  </label>
                  <input
                    id="edit-employee-name"
                    type="text"
                    placeholder="Enter employee name"
                    value={editName}
                    onChange={(event) =>
                      setEditName(
                        event.target.value
                      )
                    }
                    disabled={editLoading}
                  />
                </div>
                <div className="employee-form-group">
                  <label htmlFor="edit-employee-email">
                    Email Address
                  </label>
                  <input
                    id="edit-employee-email"
                    type="email"
                    placeholder="employee@example.com"
                    value={editEmail}
                    onChange={(event) =>
                      setEditEmail(
                        event.target.value
                      )
                    }
                    disabled={editLoading}
                  />
                </div>
                <div className="employee-form-group">
                  <label htmlFor="edit-employee-role">
                    Role
                  </label>
                  <input
                    id="edit-employee-role"
                    type="text"
                    value={editRole}
                    onChange={(event) =>
                      setEditRole(
                        event.target.value
                      )
                    }
                    disabled={editLoading}
                  />
                </div>
                {editError && (
                  <div className="employee-form-error">
                    {editError}
                  </div>
                )}
                <div className="employee-form-actions">
                  <button
                    type="button"
                    className="employee-cancel-button"
                    onClick={closeEditModal}
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="employee-submit-button"
                    disabled={editLoading}
                  >
                    {editLoading
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      {/* ======================================================
          ADD EMPLOYEE MODAL
          ====================================================== */}
      {showAddModal && (
        <div
          className="employee-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddModal();
            }
          }}
        >
          <div className="employee-modal">
            <div className="employee-modal-header">
              <div>
                <span className="employee-modal-eyebrow">
                  WORKFORCE
                </span>
                <h2>
                  Add Employee
                </h2>
                <p>
                  Create a new employee
                  account.
                </p>
              </div>
              <button
                type="button"
                className="employee-modal-close"
                onClick={closeAddModal}
                disabled={formLoading}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={
                handleAddEmployee
              }
              className="employee-form"
            >
              <div className="employee-form-group">
                <label htmlFor="employee-name">
                  Full Name
                </label>
                <input
                  id="employee-name"
                  type="text"
                  placeholder="Enter employee name"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  disabled={formLoading}
                />
              </div>
              <div className="employee-form-group">
                <label htmlFor="employee-email">
                  Email Address
                </label>
                <input
                  id="employee-email"
                  type="email"
                  placeholder="employee@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  disabled={formLoading}
                />
              </div>
              <div className="employee-form-group">
                <label htmlFor="employee-password">
                  Password
                </label>
                <input
                  id="employee-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  disabled={formLoading}
                />
              </div>
              {formError && (
                <div className="employee-form-error">
                  {formError}
                </div>
              )}
              <div className="employee-form-actions">
                <button
                  type="button"
                  className="employee-cancel-button"
                  onClick={closeAddModal}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="employee-submit-button"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Creating..."
                    : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}