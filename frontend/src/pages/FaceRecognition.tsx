import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  CircleDot,
  Clock3,
  Crosshair,
  Gauge,
  MapPin,
  Navigation,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import api from "../services/api";
import { verifyFace } from "../services/faceRecognitionService";
import { useAuth } from "../context/AuthContext";

interface LocationItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active?: boolean;
}

interface LocationResponse {
  locations?: LocationItem[];
  data?: LocationItem[];
  items?: LocationItem[];
}

interface FaceResponse {
  recognized?: boolean;
  user_id?: number;
  employee_name?: string;
  confidence?: number;
  similarity?: number;
  message?: string;
}

interface CheckInResponse {
  status?: string;
  message?: string;
  attendance_id?: number;
  distance_meters?: number;
}

interface AttendanceStatusResponse {
  has_attendance?: boolean;
  is_checked_in?: boolean;
  attendance?: {
    id?: number;
    check_in?: string | null;
    check_out?: string | null;
    working_seconds?: number;
    working_hours?: string;
    is_checked_in?: boolean;
  } | null;
}

interface CheckOutResponse {
  status?: string;
  message?: string;
  attendance_id?: number;
  check_in?: string;
  check_out?: string;
  working_seconds?: number;
  working_hours?: string;
}

export default function FaceRecognition() {
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [cameraActive, setCameraActive] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [employeeName, setEmployeeName] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [attendanceId, setAttendanceId] = useState<number | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [hasAttendance, setHasAttendance] = useState(false);

  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState("");

  // ============================================================
  // HELPERS
  // ============================================================

  const apiError = (err: any, fallback: string) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item: any) => item?.msg || "Invalid request")
        .join(", ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (err?.code === "ERR_NETWORK") {
      return "Backend server is not reachable. Start FastAPI and try again.";
    }

    return err?.message || fallback;
  };

  const formatTime = (value: string | null) => {
    if (!value) return "--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatWorkingHours = (
    seconds?: number,
    fallback?: string
  ) => {
    if (fallback) return fallback;

    if (
      seconds === undefined ||
      seconds === null ||
      seconds < 0
    ) {
      return "--";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
  };

  // ============================================================
  // CAMERA
  // ============================================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    if (
      startingCamera ||
      processing ||
      checkingOut ||
      isCheckedIn ||
      hasAttendance
    ) {
      return;
    }

    try {
      setStartingCamera(true);
      setError("");
      setMessage("");
      setSuccess(false);

      stopCamera();

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          "Your browser does not support live camera access."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

      streamRef.current = stream;
      setCameraActive(true);

      setMessage(
        "Live camera ready. Position your face inside the guide."
      );
    } catch (err: any) {
      console.error(err);

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setError(
          "Camera permission was denied. Allow camera access and try again."
        );
      } else if (err?.name === "NotFoundError") {
        setError("No camera was found on this device.");
      } else if (err?.name === "NotReadableError") {
        setError(
          "Camera is already being used by another application."
        );
      } else {
        setError(
          apiError(err, "Unable to start camera.")
        );
      }
    } finally {
      setStartingCamera(false);
    }
  };

  useEffect(() => {
    if (!cameraActive) return;

    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    void video.play().catch((err) => {
      console.error("Video playback error:", err);
    });
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // ============================================================
  // LOCATIONS
  // ============================================================

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);

      const response =
        await api.get<
          LocationItem[] | LocationResponse
        >("/api/locations/");

      const payload = response.data;

      let list: LocationItem[] = [];

      if (Array.isArray(payload)) {
        list = payload;
      } else if (Array.isArray(payload.locations)) {
        list = payload.locations;
      } else if (Array.isArray(payload.data)) {
        list = payload.data;
      } else if (Array.isArray(payload.items)) {
        list = payload.items;
      }

      const active = list
        .map((item) => ({
          ...item,
          id: Number(item.id),
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          radius_meters: Number(
            item.radius_meters ?? 100
          ),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.id) &&
            Number.isFinite(item.latitude) &&
            Number.isFinite(item.longitude) &&
            item.is_active !== false
        );

      setLocations(active);

      if (active.length > 0) {
        setSelectedLocation((current) => {
          if (
            current &&
            active.some(
              (item) => String(item.id) === current
            )
          ) {
            return current;
          }

          return String(active[0].id);
        });
      } else {
        setSelectedLocation("");
      }
    } catch (err: any) {
      console.error(err);

      setLocations([]);
      setSelectedLocation("");

      setError(
        apiError(
          err,
          "Unable to load workplace locations."
        )
      );
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  // ============================================================
  // ATTENDANCE STATUS
  // ============================================================

  const loadAttendanceStatus = useCallback(async () => {
    if (!user?.id) {
      setLoadingStatus(false);
      return;
    }

    try {
      setLoadingStatus(true);

      const response =
        await api.get<AttendanceStatusResponse>(
          "/api/attendance/my-status"
        );

      const data = response.data;
      const attendance = data.attendance;

      const active =
        data.is_checked_in === true ||
        attendance?.is_checked_in === true ||
        Boolean(
          attendance?.check_in &&
          !attendance?.check_out
        );

      setIsCheckedIn(active);

      setHasAttendance(
        data.has_attendance === true ||
          Boolean(attendance)
      );

      setAttendanceId(
        attendance?.id !== undefined
          ? Number(attendance.id)
          : null
      );

      setCheckInTime(
        attendance?.check_in ?? null
      );

      setCheckOutTime(
        attendance?.check_out ?? null
      );

      setWorkingHours(
        formatWorkingHours(
          attendance?.working_seconds,
          attendance?.working_hours
        )
      );

      if (active || attendance) {
        setEmployeeName(
          user.name ||
            user.email ||
            "Employee"
        );
      }
    } catch (err: any) {
      console.error(
        "Attendance status error:",
        err
      );

      const detail =
        err?.response?.data?.detail;

      if (
        typeof detail === "string" &&
        !detail.toLowerCase().includes("not found")
      ) {
        setError(detail);
      }
    } finally {
      setLoadingStatus(false);
    }
  }, [
    user?.id,
    user?.name,
    user?.email,
  ]);

  useEffect(() => {
    void loadAttendanceStatus();
  }, [loadAttendanceStatus]);

  // ============================================================
  // CAPTURE FRAME
  // ============================================================

  const captureFrame = (): Promise<File | null> =>
    new Promise((resolve) => {
      const video = videoRef.current;

      if (!video) {
        resolve(null);
        return;
      }

      if (
        video.videoWidth <= 0 ||
        video.videoHeight <= 0
      ) {
        resolve(null);
        return;
      }

      const canvas =
        document.createElement("canvas");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        resolve(null);
        return;
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

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          resolve(
            new File(
              [blob],
              "attendance-face.jpg",
              {
                type: "image/jpeg",
              }
            )
          );
        },
        "image/jpeg",
        0.92
      );
    });

  // ============================================================
  // GPS
  // ============================================================

  const getPosition =
    (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(
            new Error(
              "Geolocation is not supported by this browser."
            )
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      });

  // ============================================================
  // CHECK IN
  // ============================================================

  const handleCheckIn = async () => {
    if (
      processing ||
      checkingOut ||
      isCheckedIn ||
      hasAttendance
    ) {
      return;
    }

    setError("");
    setMessage("");
    setSuccess(false);
    setConfidence(null);
    setDistance(null);

    if (!selectedLocation) {
      setError(
        "Please select your workplace location."
      );
      return;
    }

    if (!cameraActive) {
      setError(
        "Please open the live camera first."
      );
      return;
    }

    if (!user?.id) {
      setError(
        "Unable to identify the logged-in employee."
      );
      return;
    }

    try {
      setProcessing(true);

      setMessage(
        "Capturing live biometric frame..."
      );

      const image = await captureFrame();

      if (!image) {
        throw new Error(
          "Unable to capture your face. Keep your face visible and try again."
        );
      }

      setMessage(
        "AI face recognition in progress..."
      );

      const faceResult =
        (await verifyFace(
          image
        )) as FaceResponse;

      if (
        !faceResult ||
        faceResult.recognized !== true
      ) {
        throw new Error(
          faceResult?.message ||
            "Face not recognized. Please try again."
        );
      }

      if (
        faceResult.user_id !== undefined &&
        Number(faceResult.user_id) !==
          Number(user.id)
      ) {
        throw new Error(
          "The detected face does not match the logged-in employee."
        );
      }

      const faceConfidence =
        faceResult.confidence ??
        (faceResult.similarity !== undefined
          ? faceResult.similarity * 100
          : null);

      if (faceConfidence !== null) {
        setConfidence(
          Number(faceConfidence)
        );
      }

      setEmployeeName(
        faceResult.employee_name ||
          user.name ||
          user.email ||
          "Employee"
      );

      setMessage(
        "Identity verified. Checking GPS geofence..."
      );

      let position: GeolocationPosition;

      try {
        position = await getPosition();
      } catch (gpsError: any) {
        if (gpsError?.code === 1) {
          throw new Error(
            "Location permission was denied. Allow location access and try again."
          );
        }

        if (gpsError?.code === 2) {
          throw new Error(
            "Unable to determine your current location."
          );
        }

        if (gpsError?.code === 3) {
          throw new Error(
            "GPS request timed out. Please try again."
          );
        }

        throw new Error(
          "Unable to access your current GPS location."
        );
      }

      setMessage(
        "GPS verified. Recording attendance..."
      );

      const response =
        await api.post<CheckInResponse>(
          "/api/attendance/check-in",
          {
            user_id: Number(user.id),
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            location_id:
              Number(selectedLocation),
          }
        );

      const data = response.data;

      const status =
        String(
          data.status || ""
        ).toLowerCase();

      if (
        status !== "present" &&
        status !== "already present"
      ) {
        throw new Error(
          data.message ||
            "Attendance was not recorded."
        );
      }

      setSuccess(true);
      setIsCheckedIn(true);
      setHasAttendance(true);

      setAttendanceId(
        data.attendance_id ?? null
      );

      setDistance(
        data.distance_meters ?? null
      );

      setCheckOutTime(null);
      setWorkingHours("");

      setMessage(
        status === "already present"
          ? "Attendance was already marked for today."
          : "Check-in successful. You are now marked as working."
      );

      await loadAttendanceStatus();

      stopCamera();
    } catch (err: any) {
      console.error(
        "Check-in error:",
        err
      );

      setError(
        apiError(
          err,
          "Attendance verification failed."
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  // ============================================================
  // CHECK OUT
  // ============================================================

  const handleCheckOut = async () => {
    if (
      checkingOut ||
      processing ||
      !isCheckedIn
    ) {
      return;
    }

    try {
      setCheckingOut(true);
      setError("");
      setMessage("");
      setSuccess(false);

      const response =
        await api.post<CheckOutResponse>(
          "/api/attendance/check-out"
        );

      const data = response.data;

      setIsCheckedIn(false);
      setHasAttendance(true);
      setSuccess(true);

      setAttendanceId(
        data.attendance_id ??
          attendanceId
      );

      setCheckInTime(
        data.check_in ??
          checkInTime
      );

      setCheckOutTime(
        data.check_out ?? null
      );

      setWorkingHours(
        data.working_hours ||
          formatWorkingHours(
            data.working_seconds
          )
      );

      setMessage(
        data.message ||
          "Check-out recorded successfully."
      );

      stopCamera();

      await loadAttendanceStatus();
    } catch (err: any) {
      console.error(
        "Check-out error:",
        err
      );

      setError(
        apiError(
          err,
          "Unable to complete check-out."
        )
      );
    } finally {
      setCheckingOut(false);
    }
  };

  // ============================================================
  // DERIVED
  // ============================================================

  const selectedLocationObject =
    locations.find(
      (item) =>
        String(item.id) ===
        selectedLocation
    );

  const status =
    loadingStatus
      ? "SYNCING"
      : checkingOut
        ? "CHECKING OUT"
        : processing
          ? "PROCESSING"
          : isCheckedIn
            ? "WORKING"
            : checkOutTime
              ? "COMPLETED"
              : cameraActive
                ? "READY"
                : "STANDBY";

  const confidenceValue =
    confidence === null
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            confidence
          )
        );

  return (
    <div className="min-h-full space-y-6 pb-8">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">

        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute -bottom-20 left-1/3 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">

              <ScanFace className="h-7 w-7" />

              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950">
                <Sparkles className="h-3 w-3" />
              </span>

            </div>

            <div>

              <div className="mb-2 flex flex-wrap gap-2">

                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-blue-600 dark:text-blue-400">
                  SMART ATTENDANCE INTELLIGENCE
                </span>

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                  AI BIOMETRIC
                </span>

              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Face Recognition
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Secure biometric verification with
                real-time GPS geofencing and intelligent
                attendance control.
              </p>

            </div>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">

            <div
              className={
                "flex h-10 w-10 items-center justify-center rounded-xl " +
                (isCheckedIn
                  ? "bg-emerald-500/10 text-emerald-600"
                  : checkOutTime
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-slate-500/10 text-slate-500")
              }
            >
              {isCheckedIn ? (
                <Clock3 className="h-5 w-5" />
              ) : checkOutTime ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <CircleDot className="h-5 w-5" />
              )}
            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                System Status
              </p>

              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {status}
              </p>

            </div>

          </div>

        </div>
      </div>

      {/* ======================================================
          TODAY ATTENDANCE
      ====================================================== */}

      <div
        className={
          "rounded-3xl border p-5 shadow-sm sm:p-6 " +
          (isCheckedIn
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            : checkOutTime
              ? "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950")
        }
      >

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div
              className={
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " +
                (isCheckedIn
                  ? "bg-emerald-500/10 text-emerald-600"
                  : checkOutTime
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-slate-500/10 text-slate-500")
              }
            >
              {isCheckedIn ? (
                <Clock3 className="h-6 w-6" />
              ) : checkOutTime ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <UserRound className="h-6 w-6" />
              )}
            </div>

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Today's Attendance
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                {loadingStatus
                  ? "Checking attendance..."
                  : isCheckedIn
                    ? "You are currently working"
                    : checkOutTime
                      ? "Attendance completed"
                      : "Ready to start your workday"}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isCheckedIn
                  ? "Your attendance session is active."
                  : checkOutTime
                    ? "Your attendance session has been completed."
                    : "Use biometric verification to securely check in."}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() => {
              void loadAttendanceStatus();
            }}
            disabled={
              loadingStatus ||
              processing ||
              checkingOut
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw
              className={
                "h-4 w-4 " +
                (loadingStatus
                  ? "animate-spin"
                  : "")
              }
            />
            Refresh
          </button>

        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Check In
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatTime(checkInTime)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Check Out
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatTime(checkOutTime)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Working Hours
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {isCheckedIn
                ? "In progress"
                : workingHours || "--"}
            </p>
          </div>

        </div>
      </div>

      {/* ======================================================
          VERIFICATION PIPELINE
      ====================================================== */}

      <div className="grid gap-3 sm:grid-cols-3">

        {[
          {
            icon: ScanFace,
            number: "01",
            title: "BIOMETRIC",
            text: "Face identity",
            active:
              cameraActive ||
              processing ||
              success ||
              isCheckedIn,
          },
          {
            icon: Navigation,
            number: "02",
            title: "GEOLOCATION",
            text: "GPS verification",
            active:
              processing ||
              success ||
              isCheckedIn,
          },
          {
            icon: ShieldCheck,
            number: "03",
            title: isCheckedIn
              ? "WORKING"
              : "ATTENDANCE",
            text: isCheckedIn
              ? "Session active"
              : checkOutTime
                ? "Session completed"
                : "Secure record",
            active:
              success ||
              isCheckedIn ||
              Boolean(checkOutTime),
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.number}
              className={
                "rounded-2xl border p-4 transition-all " +
                (item.active
                  ? "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950")
              }
            >

              <div className="flex items-center gap-3">

                <div
                  className={
                    "flex h-10 w-10 items-center justify-center rounded-xl " +
                    (item.active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-900")
                  }
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div>

                  <p className="text-[10px] font-bold tracking-widest text-slate-400">
                    {item.number} · {item.title}
                  </p>

                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {item.text}
                  </p>

                </div>

                {item.active && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                )}

              </div>

            </div>
          );
        })}

      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">

        {/* CAMERA PANEL */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">

          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Camera className="h-5 w-5" />
                </div>

                <div>

                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Biometric Capture
                  </h2>

                  <p className="text-xs text-slate-500">
                    Live facial verification
                  </p>

                </div>

              </div>

              <div
                className={
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wider " +
                  (cameraActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900")
                }
              >

                <span
                  className={
                    "h-2 w-2 rounded-full " +
                    (cameraActive
                      ? "animate-pulse bg-emerald-500"
                      : "bg-slate-400")
                  }
                />

                {cameraActive
                  ? "LIVE"
                  : "OFFLINE"}

              </div>

            </div>
          </div>

          <div className="p-5 sm:p-6">

            <div className="relative aspect-video overflow-hidden rounded-3xl bg-slate-950">

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={
                  "h-full w-full object-cover " +
                  (cameraActive
                    ? "scale-x-[-1]"
                    : "hidden")
                }
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">

                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-400">
                    <Camera className="h-9 w-9" />
                  </div>

                  <p className="text-lg font-bold text-white">
                    Camera Standby
                  </p>

                  <p className="mt-1 max-w-sm text-sm text-slate-400">
                    {isCheckedIn
                      ? "Camera is not required while you are working."
                      : checkOutTime
                        ? "Today's attendance is already completed."
                        : "Open the live camera to begin biometric verification."}
                  </p>

                </div>
              )}

              {cameraActive && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px]" />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                    <div className="relative h-[68%] w-[38%] min-w-[180px] max-w-[300px] rounded-[48%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.32)]">

                      <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-2xl border-l-2 border-t-2 border-cyan-400" />

                      <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-2xl border-r-2 border-t-2 border-cyan-400" />

                      <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-2xl border-b-2 border-l-2 border-cyan-400" />

                      <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-2xl border-b-2 border-r-2 border-cyan-400" />

                      {processing && (
                        <div className="absolute left-[8%] right-[8%] top-1/2 h-0.5 animate-pulse bg-cyan-400 shadow-lg shadow-cyan-400" />
                      )}

                    </div>

                  </div>

                  <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-bold tracking-wider text-white backdrop-blur">

                    <Crosshair className="h-3.5 w-3.5 text-cyan-400" />

                    FACE ALIGNMENT

                  </div>

                  <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/75 px-4 py-2 text-xs font-medium text-white backdrop-blur">

                    {processing
                      ? "AI verification in progress..."
                      : "Position your face inside the guide"}

                  </div>

                </>
              )}

            </div>

            {/* CAMERA CONTROL */}

            <div className="mt-5 flex gap-3">

              {!cameraActive &&
              !isCheckedIn &&
              !checkOutTime ? (

                <button
                  type="button"
                  onClick={startCamera}
                  disabled={
                    startingCamera ||
                    processing ||
                    checkingOut ||
                    loadingStatus ||
                    hasAttendance
                  }
                  className="group relative flex flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-700 group-hover:translate-x-full" />

                  <span className="relative flex items-center gap-2">

                    {startingCamera ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Starting Camera...
                      </>
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        Open Live Camera
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}

                  </span>

                </button>

              ) : cameraActive ? (

                <button
                  type="button"
                  onClick={stopCamera}
                  disabled={processing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <CameraOff className="h-5 w-5" />
                  Stop Camera
                </button>

              ) : (

                <div className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Attendance Active
                </div>

              )}

            </div>

            {/* QUICK INFO */}

            <div className="mt-5 grid grid-cols-3 gap-3">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-900">
                <ScanFace className="mx-auto h-5 w-5 text-blue-500" />

                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Face
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  AI Verified
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-900">
                <Navigation className="mx-auto h-5 w-5 text-cyan-500" />

                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  GPS
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Geofenced
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-900">
                <ShieldCheck className="mx-auto h-5 w-5 text-emerald-500" />

                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Security
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  Protected
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* ====================================================
            RIGHT CONTROL PANEL
        ==================================================== */}

        <div className="space-y-5">

          {/* LOCATION */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Attendance Location
                </h2>

                <p className="text-xs text-slate-500">
                  Select your workplace
                </p>
              </div>

            </div>

            <select
              value={selectedLocation}
              onChange={(event) => {
                setSelectedLocation(
                  event.target.value
                );

                setError("");
                setSuccess(false);
              }}
              disabled={
                processing ||
                checkingOut ||
                loadingLocations ||
                isCheckedIn ||
                Boolean(checkOutTime)
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >

              <option value="">
                {loadingLocations
                  ? "Loading workplaces..."
                  : "Select workplace"}
              </option>

              {locations.map((location) => (
                <option
                  key={location.id}
                  value={String(location.id)}
                >
                  {location.name} —{" "}
                  {location.radius_meters}m
                </option>
              ))}

            </select>

            {selectedLocationObject && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/20">

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  GEOFENCE READY
                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Allowed Radius
                  </span>

                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {selectedLocationObject.radius_meters} m
                  </span>

                </div>

              </div>
            )}

          </div>

          {/* EMPLOYEE */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
                <UserRound className="h-5 w-5" />
              </div>

              <div>

                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Employee Identity
                </h2>

                <p className="text-xs text-slate-500">
                  Logged-in account
                </p>

              </div>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 font-bold text-white">
                  {(user?.name ||
                    user?.email ||
                    "E")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                    {user?.name ||
                      user?.email ||
                      "Employee"}
                  </p>

                  {user?.email && (
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  )}

                </div>

              </div>

            </div>
          </div>

          {/* ==================================================
              ATTENDANCE CONTROL
          ================================================== */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">

            <div className="mb-5 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div
                  className={
                    "flex h-11 w-11 items-center justify-center rounded-2xl " +
                    (isCheckedIn
                      ? "bg-emerald-500/10 text-emerald-500"
                      : checkOutTime
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-blue-500/10 text-blue-600")
                  }
                >
                  {isCheckedIn ? (
                    <Clock3 className="h-5 w-5" />
                  ) : checkOutTime ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>

                <div>

                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Attendance Control
                  </h2>

                  <p className="text-[11px] text-slate-500">
                    Secure employee attendance
                  </p>

                </div>

              </div>

              <span
                className={
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider " +
                  (isCheckedIn
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : checkOutTime
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-900")
                }
              >

                <span
                  className={
                    "h-1.5 w-1.5 rounded-full " +
                    (isCheckedIn
                      ? "animate-pulse bg-emerald-500"
                      : checkOutTime
                        ? "bg-blue-500"
                        : "bg-slate-400")
                  }
                />

                {isCheckedIn
                  ? "Working"
                  : checkOutTime
                    ? "Completed"
                    : "Ready"}

              </span>

            </div>

            {/* ==================================================
                ACTIVE WORKING STATE
            ================================================== */}

            {isCheckedIn ? (

              <div className="space-y-4">

                <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20">

                  <div className="relative flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                      <Clock3 className="h-5 w-5" />
                    </div>

                    <div className="flex-1">

                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                        Currently Working
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                        Since {formatTime(checkInTime)}
                      </p>

                    </div>

                    <span className="hidden rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-600 sm:block">
                      ACTIVE
                    </span>

                  </div>
                </div>

                {/* ==================================================
                    REDESIGNED CHECK OUT BUTTON
                ================================================== */}

                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={
                    checkingOut ||
                    processing
                  }
                  className="group relative w-full overflow-hidden rounded-2xl border border-emerald-300/40 bg-slate-950 p-[1px] text-left shadow-[0_14px_40px_rgba(16,185,129,0.16)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(16,185,129,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/20"
                >

                  {/* animated border glow */}
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* shine */}
                  <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 transition-all duration-700 group-hover:left-[120%]" />

                  <span className="relative flex items-center justify-between rounded-[15px] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-4">

                    <span className="flex min-w-0 items-center gap-3">

                      {/* icon */}
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 shadow-inner backdrop-blur-sm">

                        {!checkingOut && (
                          <span className="absolute inset-0 animate-ping rounded-xl bg-white/10" />
                        )}

                        {checkingOut ? (
                          <RefreshCw className="relative h-5 w-5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="relative h-5 w-5" />
                        )}

                      </span>

                      {/* text */}
                      <span className="min-w-0">

                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-emerald-50">
                          {checkingOut
                            ? "Processing"
                            : "End Work Session"}
                        </span>

                        <span className="mt-1 block truncate text-sm font-extrabold text-white">
                          {checkingOut
                            ? "CHECKING OUT..."
                            : "CHECK OUT"}
                        </span>

                        <span className="mt-0.5 block text-[10px] font-medium text-emerald-50/80">
                          {checkingOut
                            ? "Recording your final attendance time"
                            : "Complete today's attendance"}
                        </span>

                      </span>

                    </span>

                    {/* action indicator */}
                    {!checkingOut && (
                      <span className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-white/20">

                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />

                      </span>
                    )}

                  </span>
                </button>

                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 px-3 py-2.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">

                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />

                  Check-out automatically calculates your working hours.

                </div>

              </div>

            ) : checkOutTime ? (

              /* ==================================================
                 COMPLETED STATE
              ================================================== */

              <div className="space-y-4">

                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-slate-950 dark:to-cyan-950/20">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                        Attendance Completed
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                        Today's session is closed
                      </p>

                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">

                    <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60">

                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Check In
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                        {formatTime(checkInTime)}
                      </p>

                    </div>

                    <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60">

                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Check Out
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                        {formatTime(checkOutTime)}
                      </p>

                    </div>

                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                      <Gauge className="h-5 w-5" />
                    </div>

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Total Working Hours
                      </p>

                      <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
                        {workingHours || "--"}
                      </p>

                    </div>

                  </div>

                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />

                </div>

                <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-500/5 px-3 py-3 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="h-4 w-4" />
                  Attendance securely recorded
                </div>

              </div>

            ) : (

              /* ==================================================
                 CHECK IN STATE
              ================================================== */

              <div className="space-y-4">

                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 dark:border-blue-900/30 dark:from-blue-950/20 dark:via-slate-950 dark:to-cyan-950/20">

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                      <ScanFace className="h-5 w-5" />
                    </div>

                    <div>

                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                        AI Verification
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                        Ready for secure check-in
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        Face recognition and GPS geofencing
                        will validate your attendance.
                      </p>

                    </div>

                  </div>
                </div>

                {/* ==================================================
                    REDESIGNED CHECK IN BUTTON
                ================================================== */}

                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={
                    processing ||
                    checkingOut ||
                    loadingStatus ||
                    loadingLocations ||
                    !selectedLocation ||
                    !cameraActive ||
                    hasAttendance
                  }
                  className="group relative w-full overflow-hidden rounded-2xl border border-blue-300/40 bg-slate-950 p-[1px] text-left shadow-[0_14px_40px_rgba(37,99,235,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(37,99,235,0.30)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/20"
                >

                  {/* animated gradient border */}
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

                  {/* moving shine */}
                  <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 transition-all duration-700 group-hover:left-[120%]" />

                  <span className="relative flex items-center justify-between rounded-[15px] bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-4">

                    <span className="flex min-w-0 items-center gap-3">

                      {/* icon */}
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 shadow-inner backdrop-blur-sm">

                        {!processing && (
                          <span className="absolute inset-0 rounded-xl border border-white/20 opacity-0 transition-opacity duration-300 group-hover:animate-pulse group-hover:opacity-100" />
                        )}

                        {processing ? (
                          <RefreshCw className="relative h-5 w-5 animate-spin" />
                        ) : (
                          <ScanFace className="relative h-5 w-5" />
                        )}

                      </span>

                      {/* text */}
                      <span className="min-w-0">

                        <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-blue-50">
                          {processing
                            ? "AI Verification"
                            : "Start Work Session"}
                        </span>

                        <span className="mt-1 block truncate text-sm font-extrabold text-white">
                          {processing
                            ? "VERIFYING ATTENDANCE..."
                            : "VERIFY & CHECK IN"}
                        </span>

                        <span className="mt-0.5 block text-[10px] font-medium text-blue-50/80">
                          {processing
                            ? "Face + GPS validation in progress"
                            : "Start your secure attendance session"}
                        </span>

                      </span>

                    </span>

                    {/* action indicator */}
                    {!processing && (
                      <span className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-white/20">

                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />

                      </span>
                    )}

                  </span>
                </button>

                {/* REQUIREMENTS */}

                <div className="grid grid-cols-3 gap-2">

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900">

                    <ScanFace className="mx-auto h-4 w-4 text-blue-500" />

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Face
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900">

                    <Navigation className="mx-auto h-4 w-4 text-cyan-500" />

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      GPS
                    </p>

                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900">

                    <ShieldCheck className="mx-auto h-4 w-4 text-emerald-500" />

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Secure
                    </p>

                  </div>

                </div>

                <p className="text-center text-[10px] leading-5 text-slate-400">

                  {!cameraActive
                    ? "Open the live camera first to enable check-in."
                    : !selectedLocation
                      ? "Select a workplace location to continue."
                      : "Your identity and location will be verified before attendance is recorded."}

                </p>

              </div>

            )}

          </div>
        </div>
      </div>

      {/* ======================================================
          RESULT
      ====================================================== */}

      {(message ||
        error ||
        success ||
        checkOutTime) && (

        <div
          className={
            "rounded-3xl border shadow-sm " +
            (error
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
              : checkOutTime
                ? "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20"
                : success
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                  : "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20")
          }
        >

          <div className="p-5 sm:p-6">

            <div className="flex items-start gap-4">

              <div
                className={
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " +
                  (error
                    ? "bg-red-500/10 text-red-600"
                    : checkOutTime
                      ? "bg-blue-500/10 text-blue-600"
                      : success
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-blue-500/10 text-blue-600")
                }
              >
                {error ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0 flex-1">

                <h3 className="font-bold text-slate-900 dark:text-white">

                  {error
                    ? "Attendance Error"
                    : checkOutTime
                      ? "Attendance Completed"
                      : success
                        ? "Attendance Successful"
                        : "Attendance Status"}

                </h3>

                {(error || message) && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {error || message}
                  </p>
                )}

                {(success ||
                  isCheckedIn ||
                  checkOutTime) && (

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">

                    <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/50">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Employee
                      </p>

                      <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                        {employeeName ||
                          user?.name ||
                          "Employee"}
                      </p>

                    </div>

                    <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/50">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Check In
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatTime(checkInTime)}
                      </p>

                    </div>

                    <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/50">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Check Out
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatTime(checkOutTime)}
                      </p>

                    </div>

                    <div className="rounded-2xl bg-white/70 p-4 dark:bg-slate-900/50">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Working Hours
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isCheckedIn
                          ? "In progress"
                          : workingHours || "--"}
                      </p>

                    </div>

                  </div>
                )}

                {confidence !== null && (

                  <div className="mt-4">

                    <div className="mb-2 flex justify-between">

                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Face Confidence
                      </span>

                      <span className="text-xs font-bold text-blue-600">
                        {confidenceValue.toFixed(1)}%
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                        style={{
                          width: `${confidenceValue}%`,
                        }}
                      />

                    </div>

                  </div>
                )}

                {(attendanceId !== null ||
                  distance !== null) && (

                  <div className="mt-4 flex flex-wrap gap-3">

                    {attendanceId !== null && (
                      <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        Attendance #{attendanceId}
                      </span>
                    )}

                    {distance !== null && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {distance.toFixed(2)} m from workplace
                      </span>
                    )}

                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          SECURITY
      ====================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div className="flex-1">

            <div className="flex flex-wrap items-center gap-2">

              <h3 className="font-bold text-slate-900 dark:text-white">
                Secure Attendance Protocol
              </h3>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold tracking-wider text-slate-500 dark:bg-slate-900">
                AI + GPS + CHECK-OUT
              </span>

            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Your attendance is protected using biometric
              identity verification, GPS geofencing and
              controlled check-out processing.
            </p>

          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[285px]">

            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">

              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Biometric
              </p>

              <p className="mt-1 text-xs font-bold text-emerald-600">
                Active
              </p>

            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">

              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Geofence
              </p>

              <p className="mt-1 text-xs font-bold text-emerald-600">
                Active
              </p>

            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">

              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Checkout
              </p>

              <p className="mt-1 text-xs font-bold text-emerald-600">
                Enabled
              </p>

            </div>

          </div>

        </div>
      </div>

    </div>
  );
}