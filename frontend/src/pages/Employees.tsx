import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  Activity,
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Database,
  Fingerprint,
  Mail,
  MapPin,
  RefreshCw,
  ScanFace,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";

import api from "../services/api";

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  location_id?: number | null;
  location_name?: string | null;
}

interface EmployeeApiData {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  location_id?: number | null;
  location_name?: string | null;
}

interface CreateEmployeeResponse {
  message?: string;
  employee?: EmployeeApiData;
  user?: EmployeeApiData;
  id?: number;
  name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
  location_id?: number | null;
  location_name?: string | null;
}

interface FaceRegisterResponse {
  success?: boolean;
  message?: string;
  user_id?: number;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  const apiError = error as {
    response?: {
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
    message?: string;
  };

  const detail = apiError.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item
        ) {
          return String(
            (item as { msg?: unknown }).msg ?? ""
          );
        }

        return "";
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  const message = apiError.response?.data?.message;

  if (typeof message === "string") {
    return message;
  }

  if (typeof apiError.message === "string") {
    return apiError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [createdEmployee, setCreatedEmployee] =
    useState<Employee | null>(null);

  const [faceFile, setFaceFile] =
    useState<File | null>(null);

  const [facePreview, setFacePreview] =
    useState<string | null>(null);

  const [registeringFace, setRegisteringFace] =
    useState(false);

  const [faceMessage, setFaceMessage] =
    useState("");

  const [faceError, setFaceError] =
    useState("");

  const [faceRegistered, setFaceRegistered] =
    useState(false);

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [cameraStarting, setCameraStarting] =
    useState(false);

  /*
   * DELETE STATE
   */
  const [employeeToDelete, setEmployeeToDelete] =
    useState<Employee | null>(null);

  const [deletingEmployee, setDeletingEmployee] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const facePreviewRef =
    useRef<string | null>(null);

  /*
   * LOAD EMPLOYEES
   */
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const response =
        await api.get<Employee[]>("/api/users/");

      setEmployees(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (error) {
      console.error(
        "Unable to load employees:",
        error
      );

      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  /*
   * REFRESH
   */
  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await loadEmployees();
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * CAMERA
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraStarting(false);
  }, []);

  const startCamera = async () => {
    if (cameraStarting) {
      return;
    }

    setFaceError("");
    setFaceMessage("");

    try {
      stopCamera();

      setCameraStarting(true);

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Camera access is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      setCameraOpen(true);
    } catch (error) {
      console.error(
        "Camera access error:",
        error
      );

      setFaceError(
        getErrorMessage(
          error,
          "Unable to access the camera. Please allow camera permission."
        )
      );

      stopCamera();
    } finally {
      setCameraStarting(false);
    }
  };

  useEffect(() => {
    if (
      !cameraOpen ||
      !streamRef.current ||
      !videoRef.current
    ) {
      return;
    }

    const video = videoRef.current;

    video.srcObject = streamRef.current;
    video.muted = true;
    video.playsInline = true;

    void video.play().catch((error) => {
      console.warn(
        "Camera preview could not start:",
        error
      );

      setFaceError(
        "Camera preview could not be started."
      );
    });

    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [cameraOpen]);

  /*
   * CAPTURE FACE
   */
  const captureCameraImage =
    async (): Promise<File | null> => {
      const video = videoRef.current;

      if (!video) {
        setFaceError(
          "Camera preview is not available."
        );

        return null;
      }

      if (
        video.readyState <
          HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        setFaceError(
          "Camera is still starting. Please wait a moment and try again."
        );

        return null;
      }

      const canvas =
        document.createElement("canvas");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        setFaceError(
          "Unable to capture the camera image."
        );

        return null;
      }

      context.translate(canvas.width, 0);
      context.scale(-1, 1);

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      return new Promise<File | null>(
        (resolve) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                setFaceError(
                  "Unable to create the captured image."
                );

                resolve(null);

                return;
              }

              resolve(
                new File(
                  [blob],
                  "employee-face.jpg",
                  {
                    type: "image/jpeg",
                  }
                )
              );
            },
            "image/jpeg",
            0.92
          );
        }
      );
    };

  const handleCaptureFace = async () => {
    setFaceError("");
    setFaceMessage("");

    const file =
      await captureCameraImage();

    if (!file) {
      return;
    }

    setFaceFile(file);

    if (facePreviewRef.current) {
      URL.revokeObjectURL(
        facePreviewRef.current
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    facePreviewRef.current =
      previewUrl;

    setFacePreview(previewUrl);

    setFaceMessage(
      "Face captured successfully. Review the image and register the biometric identity."
    );

    stopCamera();
  };

  /*
   * UPLOAD FACE
   */
  const handleFaceFile = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setFaceError("");
    setFaceMessage("");
    setFaceRegistered(false);

    if (!file.type.startsWith("image/")) {
      setFaceError(
        "Please select a valid image file."
      );

      event.target.value = "";

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFaceError(
        "Image size must be less than 10 MB."
      );

      event.target.value = "";

      return;
    }

    setFaceFile(file);

    if (facePreviewRef.current) {
      URL.revokeObjectURL(
        facePreviewRef.current
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    facePreviewRef.current =
      previewUrl;

    setFacePreview(previewUrl);

    setFaceMessage(
      "Face image selected. Review the image and register the biometric identity."
    );

    event.target.value = "";
  };

  /*
   * CREATE EMPLOYEE
   */
  const createEmployee = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      setFaceError(
        "Employee name is required."
      );

      return;
    }

    if (!email.trim()) {
      setFaceError(
        "Employee email is required."
      );

      return;
    }

    if (!password) {
      setFaceError(
        "Employee password is required."
      );

      return;
    }

    try {
      setCreating(true);

      setFaceError("");
      setFaceMessage("");

      const response =
        await api.post<CreateEmployeeResponse>(
          "/api/users/",
          {
            name: name.trim(),
            email: email.trim(),
            password,
          }
        );

      const responseData =
        response.data;

      const employeeData =
        responseData.employee ??
        responseData.user ??
        (responseData.id !== undefined
          ? responseData
          : null);

      if (!employeeData?.id) {
        throw new Error(
          responseData.message ||
            "Employee was created, but no employee ID was returned."
        );
      }

      const employee: Employee = {
        id: Number(employeeData.id),
        name:
          employeeData.name ??
          name.trim(),
        email:
          employeeData.email ??
          email.trim(),
        role:
          employeeData.role ??
          "employee",
        is_active:
          employeeData.is_active ??
          true,
        location_id:
          employeeData.location_id ??
          null,
        location_name:
          employeeData.location_name ??
          null,
      };

      setCreatedEmployee(employee);

      stopCamera();

      setFaceFile(null);
      setFacePreview(null);
      setFaceRegistered(false);

      setFaceMessage(
        "Employee account created successfully. Register the employee's face to enable biometric attendance."
      );

      await loadEmployees();
    } catch (error) {
      console.error(
        "Unable to create employee:",
        error
      );

      setFaceError(
        getErrorMessage(
          error,
          "Unable to create employee."
        )
      );
    } finally {
      setCreating(false);
    }
  };

  /*
   * REGISTER FACE
   */
  const registerFace = async () => {
    if (!createdEmployee) {
      setFaceError(
        "Create the employee account first."
      );

      return;
    }

    if (!faceFile) {
      setFaceError(
        "Please capture a face or upload an image first."
      );

      return;
    }

    try {
      setRegisteringFace(true);

      setFaceError("");

      setFaceMessage(
        "Registering biometric face identity..."
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        faceFile,
        faceFile.name
      );

      const response =
        await api.post<FaceRegisterResponse>(
          `/api/face/register?user_id=${createdEmployee.id}`,
          formData
        );

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.message ||
            "Face registration failed."
        );
      }

      setFaceRegistered(true);

      setFaceMessage(
        response.data?.message ||
          "Face registered successfully. Employee can now use biometric attendance."
      );

      stopCamera();

      await loadEmployees();
    } catch (error) {
      console.error(
        "Unable to register face:",
        error
      );

      setFaceRegistered(false);

      setFaceError(
        getErrorMessage(
          error,
          "Unable to register face. Please try again."
        )
      );
    } finally {
      setRegisteringFace(false);
    }
  };

  /*
   * REMOVE FACE PREVIEW
   */
  const removeFace = () => {
    if (registeringFace) {
      return;
    }

    setFaceFile(null);
    setFacePreview(null);
    setFaceRegistered(false);
    setFaceMessage("");
    setFaceError("");

    if (facePreviewRef.current) {
      URL.revokeObjectURL(
        facePreviewRef.current
      );

      facePreviewRef.current = null;
    }
  };

  /*
   * CLOSE EMPLOYEE MODAL
   */
  const closeModal = () => {
    if (
      creating ||
      registeringFace
    ) {
      return;
    }

    stopCamera();

    if (facePreviewRef.current) {
      URL.revokeObjectURL(
        facePreviewRef.current
      );

      facePreviewRef.current = null;
    }

    setShowModal(false);

    setName("");
    setEmail("");
    setPassword("");

    setCreatedEmployee(null);

    setFaceFile(null);
    setFacePreview(null);

    setFaceMessage("");
    setFaceError("");

    setFaceRegistered(false);
  };

  /*
   * OPEN EMPLOYEE CREATION MODAL
   */
  const openAddEmployee = () => {
    stopCamera();

    if (facePreviewRef.current) {
      URL.revokeObjectURL(
        facePreviewRef.current
      );

      facePreviewRef.current = null;
    }

    setName("");
    setEmail("");
    setPassword("");

    setCreatedEmployee(null);

    setFaceFile(null);
    setFacePreview(null);

    setFaceMessage("");
    setFaceError("");

    setFaceRegistered(false);

    setShowModal(true);
  };

  /*
   * DELETE EMPLOYEE
   */
  const openDeleteConfirmation = (
    employee: Employee
  ) => {
    setDeleteError("");
    setEmployeeToDelete(employee);
  };

  const closeDeleteConfirmation = () => {
    if (deletingEmployee) {
      return;
    }

    setEmployeeToDelete(null);
    setDeleteError("");
  };

  const deleteEmployee = async () => {
    if (!employeeToDelete) {
      return;
    }

    try {
      setDeletingEmployee(true);
      setDeleteError("");

      await api.delete(
        `/api/users/${employeeToDelete.id}`
      );

      setEmployees((currentEmployees) =>
        currentEmployees.filter(
          (employee) =>
            employee.id !==
            employeeToDelete.id
        )
      );

      setEmployeeToDelete(null);
    } catch (error) {
      console.error(
        "Unable to delete employee:",
        error
      );

      setDeleteError(
        getErrorMessage(
          error,
          "Unable to delete employee. Please try again."
        )
      );
    } finally {
      setDeletingEmployee(false);
    }
  };

  /*
   * CLEANUP
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      if (facePreviewRef.current) {
        URL.revokeObjectURL(
          facePreviewRef.current
        );
      }
    };
  }, []);

  /*
   * SEARCH
   */
  const filteredEmployees =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return employees;
      }

      return employees.filter(
        (employee) =>
          [
            employee.name,
            employee.email,
            employee.role,
            employee.location_name,
            String(employee.id),
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query)
            )
      );
    }, [employees, search]);

  const totalEmployees =
    employees.length;

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.is_active
    ).length;

  const inactiveEmployees =
    totalEmployees -
    activeEmployees;

  const getInitials = (
    employeeName: string
  ) => {
    const parts = employeeName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "EM";
    }

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  };

  return (
    <div className="employees-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="employees-content">
        {/* HEADER */}
        <header className="page-header">
          <div className="title-zone">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              SMART ATTENDANCE INTELLIGENCE
            </div>

            <div className="title-row">
              <div className="title-icon">
                <Users size={22} />
              </div>

              <div>
                <h1>
                  Employee Intelligence
                </h1>

                <p>
                  Central workforce identity
                  management with biometric
                  enrollment, account
                  intelligence and attendance
                  readiness.
                </p>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                void handleRefresh()
              }
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />

              {refreshing
                ? "Syncing..."
                : "Sync Registry"}
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={openAddEmployee}
            >
              <Users size={15} />
              Employee Management
            </button>
          </div>
        </header>

        {/* SYSTEM STATUS */}
        <div className="system-strip">
          <div className="system-status">
            <div className="live-orb">
              <span />
            </div>

            <div>
              <strong>
                Workforce Intelligence
                Online
              </strong>

              <span>
                Identity registry and
                attendance services
                operational
              </span>
            </div>
          </div>

          <div className="system-features">
            <span>
              <Activity size={13} />
              LIVE NETWORK
            </span>

            <span>
              <Fingerprint size={13} />
              BIOMETRIC ENGINE
            </span>

            <span>
              <MapPin size={13} />
              GEO-FENCE
            </span>

            <span>
              <ShieldCheck size={13} />
              SECURE
            </span>
          </div>
        </div>

        {/* KPI */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">
                TOTAL WORKFORCE
              </span>

              <div className="kpi-icon">
                <Users size={18} />
              </div>
            </div>

            <div className="kpi-value-row">
              <strong>
                {totalEmployees}
              </strong>

              <span className="kpi-trend">
                <Activity size={12} />
                Registry
              </span>
            </div>

            <div className="kpi-progress">
              <span
                style={{
                  width: "100%",
                }}
              />
            </div>

            <small>
              Registered workforce
              identities
            </small>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">
                ACTIVE ACCOUNTS
              </span>

              <div className="kpi-icon green">
                <UserRoundCheck
                  size={18}
                />
              </div>
            </div>

            <div className="kpi-value-row">
              <strong>
                {activeEmployees}
              </strong>

              <span className="kpi-trend green-text">
                <CheckCircle2 size={12} />
                Active
              </span>
            </div>

            <div className="kpi-progress green-bar">
              <span
                style={{
                  width:
                    totalEmployees > 0
                      ? `${
                          (activeEmployees /
                            totalEmployees) *
                          100
                        }%`
                      : "0%",
                }}
              />
            </div>

            <small>
              Accounts currently enabled
            </small>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">
                INACTIVE ACCOUNTS
              </span>

              <div className="kpi-icon red">
                <UserRoundX size={18} />
              </div>
            </div>

            <div className="kpi-value-row">
              <strong>
                {inactiveEmployees}
              </strong>

              <span className="kpi-trend red-text">
                <Activity size={12} />
                Review
              </span>
            </div>

            <div className="kpi-progress red-bar">
              <span
                style={{
                  width:
                    totalEmployees > 0
                      ? `${
                          (inactiveEmployees /
                            totalEmployees) *
                          100
                        }%`
                      : "0%",
                }}
              />
            </div>

            <small>
              Accounts requiring attention
            </small>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">
                BIOMETRIC ENGINE
              </span>

              <div className="kpi-icon purple">
                <ScanFace size={18} />
              </div>
            </div>

            <div className="kpi-value-row">
              <strong className="engine-active">
                ACTIVE
              </strong>

              <span className="kpi-trend purple-text">
                <Sparkles size={12} />
                AI Layer
              </span>
            </div>

            <div className="engine-status">
              <span />
              Face enrollment available
            </div>

            <small>
              Identity verification layer
              ready
            </small>
          </div>
        </div>

        {/* DIRECTORY */}
        <section className="directory-card">
          <div className="directory-header">
            <div className="directory-heading">
              <div className="section-label">
                <Database size={12} />
                EMPLOYEE DATA CORE
              </div>

              <h2>
                Workforce Directory
              </h2>

              <p>
                View employee identities,
                account status, locations and
                biometric readiness.
              </p>
            </div>

            <div className="directory-tools">
              <div className="registry-count">
                <span>
                  RECORDS
                </span>

                <strong>
                  {filteredEmployees.length}
                </strong>
              </div>

              <div className="search-box">
                <Search size={16} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search identity, email, role..."
                />

                {search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() =>
                      setSearch("")
                    }
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>IDENTITY</th>
                  <th>EMPLOYEE PROFILE</th>
                  <th>CONTACT CHANNEL</th>
                  <th>ACCESS ROLE</th>
                  <th>LOCATION</th>
                  <th>ACCOUNT STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="table-state">
                        <div className="state-loader">
                          <RefreshCw
                            size={20}
                            className="spin"
                          />
                        </div>

                        <strong>
                          Synchronizing workforce
                          registry
                        </strong>

                        <span>
                          Fetching employee
                          identity records...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length ===
                  0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="table-state">
                        <div className="state-loader empty">
                          <Users size={20} />
                        </div>

                        <strong>
                          {search
                            ? "No matching identities"
                            : "No employee identities found"}
                        </strong>

                        <span>
                          {search
                            ? "Try another search term."
                            : "No employee records are currently available."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(
                    (employee) => (
                      <tr
                        key={employee.id}
                      >
                        <td>
                          <div className="identity-column">
                            <span className="identity-id">
                              EMP-
                              {String(
                                employee.id
                              ).padStart(
                                4,
                                "0"
                              )}
                            </span>

                            <span className="identity-type">
                              VERIFIED IDENTITY
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              <span>
                                {getInitials(
                                  employee.name
                                )}
                              </span>

                              <i />
                            </div>

                            <div className="employee-info">
                              <strong>
                                {employee.name}
                              </strong>

                              <span>
                                Employee ID #
                                {
                                  employee.id
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="contact-cell">
                            <div className="mini-icon">
                              <Mail
                                size={13}
                              />
                            </div>

                            <span>
                              {
                                employee.email
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="role-badge">
                            <ShieldCheck
                              size={11}
                            />

                            {
                              employee.role
                            }
                          </span>
                        </td>

                        <td>
                          <div className="location-cell">
                            <div className="mini-icon location">
                              <MapPin
                                size={13}
                              />
                            </div>

                            <span>
                              {employee.location_name ||
                                "Not assigned"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              employee.is_active
                                ? "status-badge active"
                                : "status-badge inactive"
                            }
                          >
                            <span className="status-pulse" />

                            {employee.is_active
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="delete-row-button"
                            onClick={() =>
                              openDeleteConfirmation(
                                employee
                              )
                            }
                            title={`Delete ${employee.name}`}
                          >
                            <Trash2
                              size={14}
                            />

                            <span>
                              Delete
                            </span>
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="directory-footer">
            <div>
              <span className="footer-dot" />
              Registry synchronized
            </div>

            <span>
              {filteredEmployees.length}{" "}
              of {totalEmployees} identities
              displayed
            </span>
          </div>
        </section>
      </div>

      {/* CREATE / BIOMETRIC MODAL */}
      {showModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="employee-modal">
            <div className="modal-glow" />

            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-symbol">
                  <Fingerprint size={20} />
                </div>

                <div>
                  <div className="section-label">
                    BIOMETRIC IDENTITY
                  </div>

                  <h2>
                    {createdEmployee
                      ? "Biometric Enrollment"
                      : "Employee Identity"}
                  </h2>

                  <p>
                    Secure employee identity
                    and biometric management.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeModal}
                disabled={
                  creating ||
                  registeringFace
                }
              >
                <X size={17} />
              </button>
            </div>

            {!createdEmployee ? (
              <form
                className="employee-form"
                onSubmit={createEmployee}
              >
                <div className="provisioning-banner">
                  <div className="banner-icon">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <strong>
                      Secure Identity
                      Provisioning
                    </strong>

                    <span>
                      Employee account creation
                      is required before
                      biometric enrollment.
                    </span>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    <span>
                      Employee Name
                    </span>

                    <div className="input-shell">
                      <Users size={15} />

                      <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                          setName(
                            event.target
                              .value
                          )
                        }
                        placeholder="Enter full name"
                        autoComplete="name"
                        disabled={creating}
                        required
                      />
                    </div>
                  </label>

                  <label>
                    <span>
                      Email Address
                    </span>

                    <div className="input-shell">
                      <Mail size={15} />

                      <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target
                              .value
                          )
                        }
                        placeholder="employee@company.com"
                        autoComplete="email"
                        disabled={creating}
                        required
                      />
                    </div>
                  </label>

                  <label className="full-field">
                    <span>
                      Account Password
                    </span>

                    <div className="input-shell">
                      <Fingerprint
                        size={15}
                      />

                      <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                          setPassword(
                            event.target
                              .value
                          )
                        }
                        placeholder="Create employee password"
                        autoComplete="new-password"
                        disabled={creating}
                        required
                      />
                    </div>
                  </label>
                </div>

                {faceError && (
                  <div className="error-message">
                    <X size={15} />
                    <span>
                      {faceError}
                    </span>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                    disabled={creating}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <RefreshCw
                          size={15}
                          className="spin"
                        />
                        Creating Identity...
                      </>
                    ) : (
                      <>
                        <Users size={15} />
                        Create Employee
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="face-enrollment">
                <div className="created-employee">
                  <div className="created-avatar">
                    {getInitials(
                      createdEmployee.name
                    )}

                    <span>
                      <CheckCircle2
                        size={11}
                      />
                    </span>
                  </div>

                  <div className="created-info">
                    <span>
                      IDENTITY CREATED
                    </span>

                    <strong>
                      {
                        createdEmployee.name
                      }
                    </strong>

                    <small>
                      {
                        createdEmployee.email
                      }
                    </small>

                    <small>
                      Employee ID #
                      {
                        createdEmployee.id
                      }
                    </small>
                  </div>

                  <div className="created-check">
                    <CheckCircle2
                      size={18}
                    />

                    <span>
                      ACCOUNT READY
                    </span>
                  </div>
                </div>

                <div className="face-scanner-card">
                  <div className="scanner-top-line" />

                  <div className="face-scanner-header">
                    <div>
                      <div className="scanner-label">
                        <ScanLine
                          size={12}
                        />
                        BIOMETRIC PROCESSOR
                      </div>

                      <h3>
                        Register Employee
                        Face
                      </h3>

                      <p>
                        Capture or upload a
                        clear employee face
                        image.
                      </p>
                    </div>

                    <div
                      className={
                        faceRegistered
                          ? "biometric-status registered"
                          : "biometric-status"
                      }
                    >
                      <Fingerprint
                        size={13}
                      />

                      {faceRegistered
                        ? "IDENTITY REGISTERED"
                        : "AWAITING ENROLLMENT"}
                    </div>
                  </div>

                  {cameraOpen ? (
                    <div className="camera-section">
                      <div className="camera-view">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                        />

                        <div className="scanner-grid" />

                        <div className="camera-overlay">
                          <div className="face-frame">
                            <span className="corner top-left" />
                            <span className="corner top-right" />
                            <span className="corner bottom-left" />
                            <span className="corner bottom-right" />

                            <div className="scan-line" />
                          </div>

                          <div className="camera-guide">
                            ALIGN FACE WITH
                            SCANNER
                          </div>
                        </div>

                        <div className="camera-live">
                          <span />
                          CAMERA LIVE
                        </div>

                        <div className="camera-security">
                          <ShieldCheck
                            size={12}
                          />
                          LOCAL CAMERA
                          STREAM
                        </div>
                      </div>

                      <div className="camera-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={
                            stopCamera
                          }
                        >
                          <CameraOff
                            size={15}
                          />
                          Close Camera
                        </button>

                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            void handleCaptureFace()
                          }
                        >
                          <ScanFace
                            size={16}
                          />
                          Capture Biometric
                        </button>
                      </div>
                    </div>
                  ) : facePreview ? (
                    <div className="face-preview-section">
                      <div className="face-preview">
                        <img
                          src={facePreview}
                          alt="Employee face preview"
                        />

                        <div className="preview-grid" />

                        <div className="preview-overlay">
                          {faceRegistered ? (
                            <span className="preview-success">
                              <CheckCircle2
                                size={13}
                              />
                              IDENTITY VERIFIED
                            </span>
                          ) : (
                            <span className="preview-ready">
                              <ScanFace
                                size={13}
                              />
                              FACE READY
                            </span>
                          )}
                        </div>

                        <div className="preview-id">
                          EMP-
                          {String(
                            createdEmployee.id
                          ).padStart(
                            4,
                            "0"
                          )}
                        </div>
                      </div>

                      <div className="preview-actions">
                        {!faceRegistered && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={
                              removeFace
                            }
                            disabled={
                              registeringFace
                            }
                          >
                            <X size={15} />
                            Remove
                          </button>
                        )}

                        {!faceRegistered && (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                              void registerFace()
                            }
                            disabled={
                              registeringFace
                            }
                          >
                            {registeringFace ? (
                              <>
                                <RefreshCw
                                  size={15}
                                  className="spin"
                                />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Fingerprint
                                  size={16}
                                />
                                Register Biometric
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="face-empty">
                      <div className="biometric-rings">
                        <div className="ring ring-one" />
                        <div className="ring ring-two" />
                        <div className="ring ring-three" />

                        <div className="face-icon">
                          <ScanFace
                            size={34}
                          />
                        </div>
                      </div>

                      <strong>
                        Biometric Enrollment
                        Required
                      </strong>

                      <span>
                        Start the camera or
                        upload a clear
                        employee image to
                        create a biometric
                        identity.
                      </span>

                      <div className="face-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            void startCamera()
                          }
                          disabled={
                            cameraStarting
                          }
                        >
                          {cameraStarting ? (
                            <>
                              <RefreshCw
                                size={15}
                                className="spin"
                              />
                              Initializing...
                            </>
                          ) : (
                            <>
                              <Camera
                                size={15}
                              />
                              Use Camera
                            </>
                          )}
                        </button>

                        <label className="upload-button">
                          <Users size={15} />
                          Upload Image

                          <input
                            type="file"
                            accept="image/*"
                            onChange={
                              handleFaceFile
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {faceRegistered && (
                    <div className="face-success-panel">
                      <div className="face-success-icon">
                        <CheckCircle2
                          size={20}
                        />
                      </div>

                      <div>
                        <strong>
                          Biometric Identity
                          Activated
                        </strong>

                        <span>
                          {
                            createdEmployee.name
                          }{" "}
                          is now enrolled in
                          the biometric
                          attendance engine.
                        </span>
                      </div>

                      <div className="success-tag">
                        READY
                      </div>
                    </div>
                  )}

                  {faceMessage &&
                    !faceRegistered && (
                      <div className="success-message">
                        <CheckCircle2
                          size={15}
                        />

                        <span>
                          {faceMessage}
                        </span>
                      </div>
                    )}

                  {faceError && (
                    <div className="error-message">
                      <X size={15} />

                      <span>
                        {faceError}
                      </span>
                    </div>
                  )}

                  <div className="face-security-note">
                    <div className="security-note-icon">
                      <ShieldCheck
                        size={14}
                      />
                    </div>

                    <span>
                      Biometric identity is
                      securely linked to
                      <strong>
                        {" "}
                        Employee ID #
                        {
                          createdEmployee.id
                        }
                      </strong>
                      .
                    </span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeModal}
                    disabled={
                      registeringFace
                    }
                  >
                    Close
                  </button>

                  {!faceRegistered &&
                    facePreview && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          void registerFace()
                        }
                        disabled={
                          registeringFace
                        }
                      >
                        {registeringFace ? (
                          <>
                            <RefreshCw
                              size={15}
                              className="spin"
                            />
                            Registering...
                          </>
                        ) : (
                          <>
                            <Fingerprint
                              size={16}
                            />
                            Register Biometric
                          </>
                        )}
                      </button>
                    )}

                  {faceRegistered && (
                    <div className="registration-complete">
                      <CheckCircle2
                        size={16}
                      />
                      REGISTRATION COMPLETE
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {employeeToDelete && (
        <div
          className="delete-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDeleteConfirmation();
            }
          }}
        >
          <div className="delete-modal">
            <div className="delete-modal-glow" />

            <div className="delete-warning-icon">
              <AlertTriangle size={27} />
            </div>

            <div className="delete-header">
              <div className="delete-eyebrow">
                SECURITY ACTION
              </div>

              <h2>
                Delete Employee?
              </h2>

              <p>
                You are about to permanently
                remove this employee identity
                from the workforce registry.
              </p>
            </div>

            <div className="delete-employee-card">
              <div className="delete-avatar">
                {getInitials(
                  employeeToDelete.name
                )}
              </div>

              <div className="delete-employee-info">
                <strong>
                  {
                    employeeToDelete.name
                  }
                </strong>

                <span>
                  {
                    employeeToDelete.email
                  }
                </span>

                <small>
                  Employee ID #
                  {
                    employeeToDelete.id
                  }
                </small>
              </div>

              <span className="delete-status">
                {employeeToDelete.is_active
                  ? "ACTIVE"
                  : "INACTIVE"}
              </span>
            </div>

            <div className="delete-danger-box">
              <AlertTriangle size={15} />

              <div>
                <strong>
                  Permanent action
                </strong>

                <span>
                  This action cannot be undone.
                  The employee account and
                  associated identity record may
                  no longer be available through
                  the application.
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="delete-error">
                <X size={15} />

                <span>
                  {deleteError}
                </span>
              </div>
            )}

            <div className="delete-actions">
              <button
                type="button"
                className="secondary-button delete-cancel"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={
                  deletingEmployee
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm-button"
                onClick={() =>
                  void deleteEmployee()
                }
                disabled={
                  deletingEmployee
                }
              >
                {deletingEmployee ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="spin"
                    />
                    Deleting Employee...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .employees-page {
          min-height: 100%;
          position: relative;
          overflow: hidden;
          padding: 30px;
          color: #e8eefc;
          background:
            radial-gradient(
              circle at 12% 8%,
              rgba(99, 102, 241, 0.12),
              transparent 27%
            ),
            radial-gradient(
              circle at 88% 14%,
              rgba(14, 165, 233, 0.09),
              transparent 25%
            ),
            #070b16;
        }

        .employees-content {
          position: relative;
          z-index: 2;
          max-width: 1500px;
          margin: 0 auto;
        }

        .ambient {
          position: absolute;
          pointer-events: none;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.32;
        }

        .ambient-one {
          width: 280px;
          height: 280px;
          top: 250px;
          right: -100px;
          background: rgba(99, 102, 241, 0.16);
        }

        .ambient-two {
          width: 220px;
          height: 220px;
          bottom: -80px;
          left: -70px;
          background: rgba(14, 165, 233, 0.12);
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 20px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8b9ab9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.2em;
          margin-bottom: 10px;
        }

        .eyebrow-line {
          width: 22px;
          height: 1px;
          background: linear-gradient(
            90deg,
            #818cf8,
            transparent
          );
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .title-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.25
          );
          border-radius: 12px;
          color: #a5b4fc;
          background:
            linear-gradient(
              145deg,
              rgba(99, 102, 241, 0.19),
              rgba(79, 70, 229, 0.05)
            );
          box-shadow:
            0 0 30px rgba(
              99,
              102,
              241,
              0.08
            ),
            inset 0 1px
              rgba(255,255,255,0.06);
        }

        .page-header h1 {
          margin: 0;
          color: #f4f7ff;
          font-size: 28px;
          line-height: 1.1;
          letter-spacing: -0.035em;
        }

        .page-header p {
          max-width: 760px;
          margin: 7px 0 0;
          color: #7f8ca7;
          font-size: 11px;
          line-height: 1.6;
        }

        .header-actions {
          display: flex;
          gap: 9px;
          flex-shrink: 0;
          padding-top: 20px;
        }

        button {
          font: inherit;
        }

        .primary-button,
        .secondary-button,
        .danger-button {
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.01em;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .primary-button {
          color: #fff;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.5
          );
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #4f46e5
            );
          box-shadow:
            0 8px 24px rgba(
              79,
              70,
              229,
              0.23
            ),
            inset 0 1px
              rgba(255,255,255,0.14);
        }

        .primary-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 11px 30px rgba(
              79,
              70,
              229,
              0.3
            );
        }

        .secondary-button {
          color: #b5c0d6;
          border: 1px solid #202b40;
          background: rgba(
            13,
            19,
            32,
            0.76
          );
        }

        .secondary-button:hover {
          color: #e8eefc;
          border-color: #34415c;
          background: #101827;
        }

        .danger-button {
          color: #fecdd3;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.22
          );
          background: rgba(
            244,
            63,
            94,
            0.07
          );
        }

        .danger-button:hover {
          color: #fff1f2;
          border-color: rgba(
            244,
            63,
            94,
            0.4
          );
          background: rgba(
            244,
            63,
            94,
            0.12
          );
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .system-strip {
          min-height: 61px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 15px;
          padding: 0 16px;
          border: 1px solid #1c2639;
          border-radius: 12px;
          background:
            linear-gradient(
              90deg,
              rgba(13, 20, 34, 0.96),
              rgba(10, 15, 27, 0.9)
            );
          box-shadow:
            0 10px 30px
              rgba(0,0,0,0.13),
            inset 0 1px
              rgba(255,255,255,0.025);
        }

        .system-status {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .live-orb {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(
            34,
            197,
            94,
            0.25
          );
          border-radius: 50%;
          background: rgba(
            34,
            197,
            94,
            0.07
          );
        }

        .live-orb span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px
              rgba(34,197,94,0.08),
            0 0 12px
              rgba(34,197,94,0.45);
          animation:
            pulse 2s ease-in-out
            infinite;
        }

        .system-status > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .system-status strong {
          color: #dce5f8;
          font-size: 10px;
        }

        .system-status span {
          color: #68758f;
          font-size: 9px;
        }

        .system-features {
          display: flex;
          align-items: center;
          gap: 18px;
          color: #66748e;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .system-features span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 12px;
          margin-bottom: 15px;
        }

        .kpi-card {
          min-height: 128px;
          position: relative;
          overflow: hidden;
          padding: 15px;
          border: 1px solid #1c2639;
          border-radius: 12px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 38, 0.98),
              rgba(9, 14, 25, 0.98)
            );
          box-shadow:
            0 10px 28px
              rgba(0,0,0,0.12),
            inset 0 1px
              rgba(255,255,255,0.025);
        }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-label {
          color: #64728d;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .kpi-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.16
          );
          border-radius: 9px;
          color: #9ba7ff;
          background: rgba(
            99,
            102,
            241,
            0.08
          );
        }

        .kpi-icon.green {
          color: #4ade80;
          border-color: rgba(
            34,
            197,
            94,
            0.16
          );
          background: rgba(
            34,
            197,
            94,
            0.07
          );
        }

        .kpi-icon.red {
          color: #fb7185;
          border-color: rgba(
            244,
            63,
            94,
            0.16
          );
          background: rgba(
            244,
            63,
            94,
            0.07
          );
        }

        .kpi-icon.purple {
          color: #c4b5fd;
          border-color: rgba(
            139,
            92,
            246,
            0.2
          );
          background: rgba(
            139,
            92,
            246,
            0.1
          );
        }

        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 9px;
          margin-top: 9px;
        }

        .kpi-value-row strong {
          color: #f1f5ff;
          font-size: 25px;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .kpi-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #7f8ca5;
          font-size: 8px;
          font-weight: 700;
        }

        .green-text {
          color: #4ade80;
        }

        .red-text {
          color: #fb7185;
        }

        .purple-text {
          color: #a78bfa;
        }

        .engine-active {
          color: #4ade80 !important;
          font-size: 15px !important;
          letter-spacing: 0.05em !important;
        }

        .kpi-progress {
          height: 3px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 99px;
          background: #182135;
        }

        .kpi-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #6366f1,
            #818cf8
          );
        }

        .green-bar span {
          background: linear-gradient(
            90deg,
            #16a34a,
            #4ade80
          );
        }

        .red-bar span {
          background: linear-gradient(
            90deg,
            #be123c,
            #fb7185
          );
        }

        .kpi-card small {
          display: block;
          margin-top: 9px;
          color: #53617a;
          font-size: 8px;
        }

        .engine-status {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 11px;
          color: #7886a2;
          font-size: 8px;
        }

        .engine-status span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 7px
            rgba(34,197,94,0.6);
        }

        .directory-card {
          overflow: hidden;
          border: 1px solid #1c2639;
          border-radius: 13px;
          background: #0b111e;
          box-shadow:
            0 18px 45px
              rgba(0,0,0,0.16),
            inset 0 1px
              rgba(255,255,255,0.025);
        }

        .directory-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px;
          border-bottom: 1px solid #182236;
          background:
            linear-gradient(
              180deg,
              rgba(17,25,41,0.88),
              rgba(11,17,30,0.95)
            );
        }

        .section-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #7482a0;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .directory-heading h2 {
          margin: 6px 0 4px;
          color: #e7edf9;
          font-size: 16px;
        }

        .directory-heading p {
          margin: 0;
          color: #65728a;
          font-size: 9px;
        }

        .directory-tools {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .registry-count {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
        }

        .registry-count span {
          color: #56637c;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .registry-count strong {
          color: #9ba8c0;
          font-size: 12px;
        }

        .search-box {
          width: 280px;
          height: 38px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          border: 1px solid #222e43;
          border-radius: 8px;
          color: #66748d;
          background: #080e19;
        }

        .search-box:focus-within {
          border-color: rgba(
            129,
            140,
            248,
            0.48
          );
          box-shadow:
            0 0 0 3px
              rgba(99,102,241,0.08);
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #dce5f5;
          background: transparent;
          font-size: 9px;
        }

        .search-box input::placeholder {
          color: #4f5c73;
        }

        .clear-search {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 5px;
          color: #72809a;
          background: transparent;
          cursor: pointer;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1080px;
          border-collapse: collapse;
        }

        th {
          padding: 11px 18px;
          text-align: left;
          color: #58667f;
          background: #0d1523;
          border-bottom: 1px solid #182236;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.13em;
          white-space: nowrap;
        }

        td {
          padding: 13px 18px;
          color: #8d9ab2;
          border-bottom: 1px solid #141e30;
          font-size: 9px;
        }

        tbody tr:hover {
          background:
            linear-gradient(
              90deg,
              rgba(99,102,241,0.045),
              transparent
            );
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        .identity-column {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .identity-id {
          color: #a5b4fc;
          font-size: 9px;
          font-weight: 800;
        }

        .identity-type {
          color: #414e67;
          font-size: 6px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .employee-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .employee-avatar {
          width: 34px;
          height: 34px;
          position: relative;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #2a3650;
          border-radius: 9px;
          color: #c7d2fe;
          background:
            linear-gradient(
              145deg,
              #1a2540,
              #111a2b
            );
          font-size: 9px;
          font-weight: 900;
        }

        .employee-avatar i {
          position: absolute;
          width: 6px;
          height: 6px;
          right: -2px;
          bottom: -2px;
          border: 2px solid #0b111e;
          border-radius: 50%;
          background: #22c55e;
        }

        .employee-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .employee-info strong {
          color: #dce5f5;
          font-size: 10px;
        }

        .employee-info span {
          color: #56637b;
          font-size: 7px;
        }

        .contact-cell,
        .location-cell {
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }

        .contact-cell span,
        .location-cell span {
          color: #7e8ba4;
        }

        .mini-icon {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid #202c41;
          border-radius: 7px;
          color: #7584a0;
          background: #101827;
        }

        .mini-icon.location {
          color: #7dd3fc;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border: 1px solid #263149;
          border-radius: 6px;
          color: #aebbd1;
          background: #111a2a;
          font-size: 7px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .role-badge svg {
          color: #818cf8;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .status-pulse {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .status-badge.active {
          color: #4ade80;
          border: 1px solid rgba(
            34,
            197,
            94,
            0.14
          );
          background: rgba(
            34,
            197,
            94,
            0.06
          );
        }

        .status-badge.active
          .status-pulse {
          background: #22c55e;
          box-shadow: 0 0 8px
            rgba(34,197,94,0.7);
        }

        .status-badge.inactive {
          color: #fb7185;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.14
          );
          background: rgba(
            244,
            63,
            94,
            0.06
          );
        }

        .status-badge.inactive
          .status-pulse {
          background: #f43f5e;
        }

        .delete-row-button {
          min-height: 31px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 9px;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.18
          );
          border-radius: 7px;
          color: #fb7185;
          background: rgba(
            244,
            63,
            94,
            0.055
          );
          cursor: pointer;
          font-size: 8px;
          font-weight: 800;
        }

        .delete-row-button:hover {
          color: #fff1f2;
          border-color: rgba(
            244,
            63,
            94,
            0.4
          );
          background: rgba(
            244,
            63,
            94,
            0.12
          );
        }

        .table-state {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          text-align: center;
        }

        .state-loader {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin-bottom: 5px;
          border: 1px solid rgba(
            99,
            102,
            241,
            0.2
          );
          border-radius: 12px;
          color: #818cf8;
          background: rgba(
            99,
            102,
            241,
            0.07
          );
        }

        .state-loader.empty {
          color: #68758d;
          background: #101827;
        }

        .table-state strong {
          color: #aebbd0;
          font-size: 10px;
        }

        .table-state span {
          color: #4f5c73;
          font-size: 8px;
        }

        .directory-footer {
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 17px;
          border-top: 1px solid #182236;
          color: #4f5d76;
          background: #090f1a;
          font-size: 7px;
        }

        .directory-footer div {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .footer-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 7px
            rgba(34,197,94,0.45);
        }

        /* MODAL */

        .modal-backdrop,
        .delete-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(
            2,
            6,
            23,
            0.78
          );
          backdrop-filter: blur(12px);
        }

        .employee-modal {
          width: min(
            760px,
            100%
          );
          max-height: calc(
            100vh - 40px
          );
          position: relative;
          overflow-y: auto;
          border: 1px solid #27334b;
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              #0e1626,
              #080e19
            );
          box-shadow:
            0 35px 100px
              rgba(0,0,0,0.45),
            0 0 60px
              rgba(79,70,229,0.08);
        }

        .modal-glow {
          position: absolute;
          width: 260px;
          height: 100px;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(
            99,
            102,
            241,
            0.14
          );
          filter: blur(45px);
          pointer-events: none;
        }

        .modal-header {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 21px;
          border-bottom: 1px solid #1b263a;
          background: rgba(
            13,
            20,
            34,
            0.72
          );
        }

        .modal-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-symbol {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.2
          );
          border-radius: 10px;
          color: #a5b4fc;
          background: rgba(
            99,
            102,
            241,
            0.08
          );
        }

        .modal-header h2 {
          margin: 5px 0;
          color: #edf2ff;
          font-size: 17px;
        }

        .modal-header p {
          margin: 0;
          color: #65728a;
          font-size: 8px;
        }

        .close-button {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 1px solid #27334a;
          border-radius: 8px;
          color: #75839d;
          background: #0c1422;
          cursor: pointer;
        }

        .employee-form {
          padding: 20px 21px 21px;
        }

        .provisioning-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding: 12px;
          border: 1px solid rgba(
            99,
            102,
            241,
            0.15
          );
          border-radius: 10px;
          background: rgba(
            99,
            102,
            241,
            0.05
          );
        }

        .banner-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #a5b4fc;
          background: rgba(
            99,
            102,
            241,
            0.1
          );
        }

        .provisioning-banner > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .provisioning-banner strong {
          color: #cbd5e9;
          font-size: 9px;
        }

        .provisioning-banner span {
          color: #68758d;
          font-size: 8px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .employee-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .employee-form label > span {
          color: #8290aa;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .full-field {
          grid-column: 1 / -1;
        }

        .input-shell {
          height: 41px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          border: 1px solid #253148;
          border-radius: 8px;
          color: #64738e;
          background: #080f1b;
        }

        .input-shell input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          color: #dce5f4;
          background: transparent;
          font-size: 9px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          margin-top: 19px;
        }

        /* BIOMETRIC */

        .face-enrollment {
          padding: 18px 21px 21px;
        }

        .created-employee {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 14px;
          padding: 11px;
          border: 1px solid rgba(
            34,
            197,
            94,
            0.15
          );
          border-radius: 10px;
          background: rgba(
            34,
            197,
            94,
            0.055
          );
        }

        .created-avatar {
          width: 45px;
          height: 45px;
          position: relative;
          display: grid;
          place-items: center;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.25
          );
          border-radius: 11px;
          color: #c7d2fe;
          background: #131d31;
          font-size: 12px;
          font-weight: 900;
        }

        .created-avatar > span {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 16px;
          height: 16px;
          display: grid;
          place-items: center;
          border: 2px solid #0c1422;
          border-radius: 50%;
          color: #052e16;
          background: #4ade80;
        }

        .created-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .created-info > span {
          color: #4ade80;
          font-size: 7px;
          font-weight: 900;
        }

        .created-info strong {
          color: #dce6f7;
          font-size: 11px;
        }

        .created-info small {
          color: #62708a;
          font-size: 7px;
        }

        .created-check {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4ade80;
          font-size: 7px;
          font-weight: 900;
        }

        .face-scanner-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #253149;
          border-radius: 12px;
          background: #080f1a;
        }

        .scanner-top-line {
          height: 2px;
          background:
            linear-gradient(
              90deg,
              transparent,
              #6366f1 25%,
              #22d3ee 50%,
              #6366f1 75%,
              transparent
            );
        }

        .face-scanner-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 15px;
          border-bottom: 1px solid #192439;
          background: #0c1422;
        }

        .scanner-label {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #818cf8;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .face-scanner-header h3 {
          margin: 5px 0 4px;
          color: #e7edf9;
          font-size: 13px;
        }

        .face-scanner-header p {
          margin: 0;
          color: #62708a;
          font-size: 8px;
        }

        .biometric-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border: 1px solid rgba(
            251,
            146,
            60,
            0.14
          );
          border-radius: 6px;
          color: #fb923c;
          background: rgba(
            251,
            146,
            60,
            0.06
          );
          font-size: 7px;
          font-weight: 900;
          white-space: nowrap;
        }

        .biometric-status.registered {
          color: #4ade80;
          border-color: rgba(
            34,
            197,
            94,
            0.15
          );
          background: rgba(
            34,
            197,
            94,
            0.06
          );
        }

        .face-empty {
          min-height: 290px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px;
          text-align: center;
        }

        .biometric-rings {
          width: 86px;
          height: 86px;
          position: relative;
          display: grid;
          place-items: center;
          margin-bottom: 15px;
        }

        .ring {
          position: absolute;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.13
          );
          border-radius: 50%;
        }

        .ring-one {
          width: 86px;
          height: 86px;
        }

        .ring-two {
          width: 68px;
          height: 68px;
        }

        .ring-three {
          width: 52px;
          height: 52px;
          border-color: rgba(
            34,
            211,
            238,
            0.2
          );
        }

        .face-icon {
          width: 42px;
          height: 42px;
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.25
          );
          border-radius: 12px;
          color: #a5b4fc;
          background: #131d31;
        }

        .face-empty > strong {
          color: #cdd7e9;
          font-size: 11px;
        }

        .face-empty > span {
          max-width: 390px;
          margin-top: 5px;
          color: #5f6d86;
          font-size: 8px;
          line-height: 1.55;
        }

        .face-actions {
          display: flex;
          gap: 8px;
          margin-top: 17px;
        }

        .upload-button {
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid #263249;
          border-radius: 9px;
          color: #b0bdd2;
          background: #101827;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .upload-button input {
          display: none;
        }

        .camera-section {
          padding: 13px;
        }

        .camera-view {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 320px;
          overflow: hidden;
          border: 1px solid #25324b;
          border-radius: 9px;
          background: #030712;
        }

        .camera-view video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .scanner-grid,
        .preview-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.1;
          background-image:
            linear-gradient(
              rgba(255,255,255,0.15)
              1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.15)
              1px,
              transparent 1px
            );
          background-size: 38px 38px;
        }

        .camera-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .face-frame {
          width: 190px;
          height: 235px;
          position: relative;
        }

        .corner {
          position: absolute;
          width: 27px;
          height: 27px;
          border-color: rgba(
            165,
            180,
            252,
            0.95
          );
        }

        .corner.top-left {
          top: 0;
          left: 0;
          border-top: 2px solid;
          border-left: 2px solid;
        }

        .corner.top-right {
          top: 0;
          right: 0;
          border-top: 2px solid;
          border-right: 2px solid;
        }

        .corner.bottom-left {
          bottom: 0;
          left: 0;
          border-bottom: 2px solid;
          border-left: 2px solid;
        }

        .corner.bottom-right {
          right: 0;
          bottom: 0;
          border-right: 2px solid;
          border-bottom: 2px solid;
        }

        .scan-line {
          position: absolute;
          left: 5px;
          right: 5px;
          top: 5px;
          height: 1px;
          background: #22d3ee;
          box-shadow:
            0 0 8px #22d3ee,
            0 0 20px
              rgba(34,211,238,0.5);
          animation:
            scan 2.4s ease-in-out
            infinite;
        }

        .camera-guide {
          position: absolute;
          left: 50%;
          bottom: -36px;
          transform: translateX(-50%);
          padding: 6px 9px;
          color: #dbeafe;
          background: rgba(
            3,
            7,
            18,
            0.68
          );
          font-size: 7px;
          font-weight: 900;
          white-space: nowrap;
        }

        .camera-live {
          position: absolute;
          top: 11px;
          left: 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          color: white;
          background: rgba(
            3,
            7,
            18,
            0.65
          );
          font-size: 7px;
          font-weight: 900;
        }

        .camera-live span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ef4444;
          animation:
            pulse 1.4s ease-in-out
            infinite;
        }

        .camera-security {
          position: absolute;
          right: 11px;
          bottom: 11px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          color: #a7f3d0;
          background: rgba(
            3,
            7,
            18,
            0.62
          );
          font-size: 6px;
        }

        .camera-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 11px;
        }

        .face-preview-section {
          padding: 13px;
        }

        .face-preview {
          height: 315px;
          position: relative;
          overflow: hidden;
          display: grid;
          place-items: center;
          border: 1px solid #27344c;
          border-radius: 9px;
          background: #030712;
        }

        .face-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .preview-overlay {
          position: absolute;
          top: 11px;
          right: 11px;
        }

        .preview-ready,
        .preview-success {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 5px;
          font-size: 7px;
          font-weight: 900;
        }

        .preview-ready {
          color: #c7d2fe;
          background: rgba(
            15,
            23,
            42,
            0.84
          );
        }

        .preview-success {
          color: #4ade80;
          background: rgba(
            6,
            78,
            59,
            0.72
          );
        }

        .preview-id {
          position: absolute;
          left: 11px;
          bottom: 11px;
          padding: 5px 7px;
          color: #94a3b8;
          background: rgba(
            3,
            7,
            18,
            0.72
          );
          font-size: 7px;
          font-weight: 800;
        }

        .preview-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
        }

        .face-success-panel {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 13px 13px;
          padding: 12px;
          border: 1px solid rgba(
            34,
            197,
            94,
            0.16
          );
          border-radius: 9px;
          background: rgba(
            34,
            197,
            94,
            0.06
          );
        }

        .face-success-icon {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          color: #4ade80;
          background: rgba(
            34,
            197,
            94,
            0.1
          );
          border-radius: 9px;
        }

        .face-success-panel > div:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .face-success-panel strong {
          color: #86efac;
          font-size: 9px;
        }

        .face-success-panel span {
          color: #587263;
          font-size: 7px;
        }

        .success-tag,
        .registration-complete {
          color: #4ade80;
          font-size: 7px;
          font-weight: 900;
        }

        .success-message,
        .error-message {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin: 0 13px 13px;
          padding: 9px 10px;
          border-radius: 7px;
          font-size: 8px;
          line-height: 1.5;
        }

        .success-message {
          color: #86efac;
          border: 1px solid rgba(
            34,
            197,
            94,
            0.14
          );
          background: rgba(
            34,
            197,
            94,
            0.05
          );
        }

        .error-message {
          color: #fda4af;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.16
          );
          background: rgba(
            244,
            63,
            94,
            0.06
          );
        }

        .face-security-note {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 13px;
          border-top: 1px solid #192438;
          color: #53617a;
          background: #0a111d;
          font-size: 7px;
          line-height: 1.55;
        }

        .security-note-icon {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 6px;
          color: #818cf8;
          background: rgba(
            99,
            102,
            241,
            0.08
          );
        }

        /* DELETE MODAL */

        .delete-backdrop {
          z-index: 1100;
          background: rgba(
            2,
            6,
            23,
            0.84
          );
        }

        .delete-modal {
          width: min(
            465px,
            100%
          );
          position: relative;
          overflow: hidden;
          padding: 25px;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.25
          );
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              #121624,
              #090e18
            );
          box-shadow:
            0 35px 100px
              rgba(0,0,0,0.55),
            0 0 70px
              rgba(244,63,94,0.07);
        }

        .delete-modal-glow {
          position: absolute;
          width: 220px;
          height: 120px;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(
            244,
            63,
            94,
            0.12
          );
          filter: blur(45px);
        }

        .delete-warning-icon {
          width: 58px;
          height: 58px;
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          margin: 0 auto 15px;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.25
          );
          border-radius: 15px;
          color: #fb7185;
          background: rgba(
            244,
            63,
            94,
            0.08
          );
          box-shadow:
            0 0 30px
              rgba(244,63,94,0.08);
        }

        .delete-header {
          position: relative;
          text-align: center;
        }

        .delete-eyebrow {
          color: #fb7185;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.17em;
        }

        .delete-header h2 {
          margin: 6px 0;
          color: #f8fafc;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .delete-header p {
          margin: 0 auto;
          max-width: 360px;
          color: #69768e;
          font-size: 9px;
          line-height: 1.6;
        }

        .delete-employee-card {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 11px;
          border: 1px solid #273147;
          border-radius: 10px;
          background: #0d1523;
        }

        .delete-avatar {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border: 1px solid rgba(
            129,
            140,
            248,
            0.2
          );
          border-radius: 10px;
          color: #c7d2fe;
          background: #151f34;
          font-size: 10px;
          font-weight: 900;
        }

        .delete-employee-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }

        .delete-employee-info strong {
          color: #dce5f5;
          font-size: 10px;
        }

        .delete-employee-info span {
          overflow: hidden;
          color: #69768d;
          font-size: 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .delete-employee-info small {
          color: #4f5c73;
          font-size: 7px;
        }

        .delete-status {
          padding: 5px 7px;
          border: 1px solid rgba(
            34,
            197,
            94,
            0.15
          );
          border-radius: 5px;
          color: #4ade80;
          background: rgba(
            34,
            197,
            94,
            0.05
          );
          font-size: 6px;
          font-weight: 900;
        }

        .delete-danger-box {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 12px;
          padding: 10px;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.15
          );
          border-radius: 8px;
          color: #fb7185;
          background: rgba(
            244,
            63,
            94,
            0.045
          );
        }

        .delete-danger-box > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .delete-danger-box strong {
          color: #fda4af;
          font-size: 8px;
        }

        .delete-danger-box span {
          color: #73545e;
          font-size: 7px;
          line-height: 1.55;
        }

        .delete-error {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 9px;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.18
          );
          border-radius: 7px;
          color: #fda4af;
          background: rgba(
            244,
            63,
            94,
            0.06
          );
          font-size: 8px;
        }

        .delete-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 17px;
        }

        .delete-confirm-button {
          min-height: 39px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid rgba(
            244,
            63,
            94,
            0.4
          );
          border-radius: 9px;
          color: #fff;
          background:
            linear-gradient(
              135deg,
              #e11d48,
              #be123c
            );
          box-shadow:
            0 8px 22px
              rgba(190,24,93,0.18);
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
        }

        .delete-confirm-button:hover {
          background:
            linear-gradient(
              135deg,
              #f43f5e,
              #e11d48
            );
        }

        .delete-cancel {
          min-width: 82px;
        }

        .spin {
          animation:
            spin 0.9s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.55;
            transform: scale(0.82);
          }
        }

        @keyframes scan {
          0%, 100% {
            top: 5px;
            opacity: 0.4;
          }

          50% {
            top: calc(100% - 6px);
            opacity: 1;
          }
        }

        @media (max-width: 1150px) {
          .kpi-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .system-features span:nth-child(4) {
            display: none;
          }
        }

        @media (max-width: 800px) {
          .employees-page {
            padding: 18px;
          }

          .page-header,
          .directory-header,
          .system-strip {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            padding-top: 0;
          }

          .header-actions button {
            flex: 1;
          }

          .system-strip {
            padding: 14px;
          }

          .system-features {
            flex-wrap: wrap;
          }

          .directory-tools {
            flex-direction: column;
            align-items: stretch;
          }

          .registry-count {
            align-items: flex-start;
          }

          .search-box {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 23px;
          }

          .header-actions {
            flex-direction: column;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .full-field {
            grid-column: auto;
          }

          .face-scanner-header {
            flex-direction: column;
          }

          .created-check {
            display: none;
          }

          .face-actions,
          .camera-actions,
          .preview-actions,
          .modal-actions,
          .delete-actions {
            flex-direction: column;
          }

          .face-actions button,
          .face-actions label,
          .camera-actions button,
          .preview-actions button,
          .modal-actions button,
          .delete-actions button {
            width: 100%;
          }

          .face-preview {
            height: 260px;
          }

          .camera-view {
            min-height: 250px;
          }

          .directory-footer {
            gap: 8px;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            padding: 9px 14px;
          }

          .delete-modal {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}