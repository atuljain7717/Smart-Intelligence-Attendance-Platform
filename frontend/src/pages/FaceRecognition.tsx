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
  Crosshair,
  Fingerprint,
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

interface AttendanceLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active?: boolean;
}

interface LocationResponse {
  locations?: AttendanceLocation[];
  data?: AttendanceLocation[];
  items?: AttendanceLocation[];
}

interface CheckInResponse {
  success?: boolean;
  status?: string;
  message?: string;
  attendance_id?: number;
  user_id?: number;
  location?: string;
  distance_meters?: number;
  allowed_radius_meters?: number;
}

interface FaceVerificationResponse {
  success?: boolean;
  recognized?: boolean;
  user_id?: number;
  employee_name?: string;
  confidence?: number;
  similarity?: number;
  message?: string;
}

export default function FaceRecognition() {
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(true);

  const [cameraActive, setCameraActive] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [employeeName, setEmployeeName] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [attendanceId, setAttendanceId] = useState<number | null>(null);

  // ==========================================================
  // STOP CAMERA
  // ==========================================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (mountedRef.current) {
      setCameraActive(false);
    }
  }, []);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ==========================================================
  // ATTACH CAMERA
  // ==========================================================

  useEffect(() => {
    if (!cameraActive) return;

    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) return;

    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.error("Video playback error:", err);
      }
    };

    void playVideo();
  }, [cameraActive]);

  // ==========================================================
  // LOAD LOCATIONS
  // ==========================================================

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      setError("");

      const response = await api.get<
        AttendanceLocation[] | LocationResponse
      >("/api/locations/");

      const payload = response.data;

      let receivedLocations: AttendanceLocation[] = [];

      if (Array.isArray(payload)) {
        receivedLocations = payload;
      } else if (
        payload &&
        typeof payload === "object" &&
        Array.isArray(payload.locations)
      ) {
        receivedLocations = payload.locations;
      } else if (
        payload &&
        typeof payload === "object" &&
        Array.isArray(payload.data)
      ) {
        receivedLocations = payload.data;
      } else if (
        payload &&
        typeof payload === "object" &&
        Array.isArray(payload.items)
      ) {
        receivedLocations = payload.items;
      }

      const normalizedLocations: AttendanceLocation[] =
        receivedLocations
          .map((location) => ({
            id: Number(location.id),
            name: location.name || `Workplace ${location.id}`,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            radius_meters: Number(location.radius_meters ?? 100),
            is_active: location.is_active !== false,
          }))
          .filter(
            (location) =>
              Number.isFinite(location.id) &&
              location.id > 0 &&
              Number.isFinite(location.latitude) &&
              Number.isFinite(location.longitude)
          );

      const activeLocations = normalizedLocations.filter(
        (location) => location.is_active !== false
      );

      setLocations(activeLocations);

      if (activeLocations.length === 0) {
        setSelectedLocation("");
        setError(
          "No active workplace locations were found. Add a workplace location first."
        );
        return;
      }

      setSelectedLocation((current) => {
        const currentStillExists = activeLocations.some(
          (location) => String(location.id) === current
        );

        if (currentStillExists) {
          return current;
        }

        return String(activeLocations[0].id);
      });

      setMessage(
        `${activeLocations.length} workplace location${
          activeLocations.length === 1 ? "" : "s"
        } available.`
      );
    } catch (err: any) {
      console.error("Failed to load workplace locations:", err);

      setLocations([]);
      setSelectedLocation("");

      const detail = err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map(
              (item: any) =>
                item?.msg || "Invalid location request."
            )
            .join(", ")
        );
      } else if (typeof detail === "string") {
        setError(detail);
      } else if (err?.code === "ERR_NETWORK") {
        setError(
          "Cannot connect to the FastAPI server. Make sure the backend is running at http://127.0.0.1:8000."
        );
      } else {
        setError(
          "Unable to load workplace locations. Check the backend location API."
        );
      }
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  // ==========================================================
  // START CAMERA
  // ==========================================================

  const startCamera = async () => {
    if (startingCamera || processing) return;

    try {
      setStartingCamera(true);
      setError("");
      setMessage("");
      setSuccess(false);

      stopCamera();

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        throw new Error(
          "Live camera is not supported by this browser."
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

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraActive(true);

      setMessage(
        "Live camera ready. Position your face inside the guide."
      );
    } catch (err: any) {
      console.error("Camera error:", err);

      let cameraMessage =
        "Unable to access the live camera.";

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        cameraMessage =
          "Camera permission was denied. Allow camera access for this site and try again.";
      } else if (err?.name === "NotFoundError") {
        cameraMessage =
          "No camera was found on this device.";
      } else if (err?.name === "NotReadableError") {
        cameraMessage =
          "The camera is already being used by another application.";
      } else if (err?.name === "OverconstrainedError") {
        cameraMessage =
          "The requested camera settings are not available.";
      } else if (err?.message) {
        cameraMessage = err.message;
      }

      setError(cameraMessage);
      setCameraActive(false);
    } finally {
      setStartingCamera(false);
    }
  };

  // ==========================================================
  // CAPTURE LIVE FRAME
  // ==========================================================

  const captureLiveFrame =
    (): Promise<File | null> =>
      new Promise((resolve) => {
        const video = videoRef.current;

        if (!video) {
          resolve(null);
          return;
        }

        if (
          video.readyState <
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
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

        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

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
            if (!blob || blob.size === 0) {
              resolve(null);
              return;
            }

            const file = new File(
              [blob],
              "live-face-capture.jpg",
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              }
            );

            resolve(file);
          },
          "image/jpeg",
          0.92
        );
      });

  // ==========================================================
  // CURRENT GPS
  // ==========================================================

  const getCurrentPosition =
    (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(
            new Error(
              "GPS/location is not supported by this browser."
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

  // ==========================================================
  // VERIFY FACE + GPS + CHECK-IN
  // ==========================================================

  const handleVerifyAndCheckIn = async () => {
    if (processing) return;

    setError("");
    setMessage("");
    setSuccess(false);
    setConfidence(null);
    setDistance(null);
    setAttendanceId(null);

    if (loadingLocations) {
      setError(
        "Workplace locations are still loading. Please wait."
      );
      return;
    }

    if (locations.length === 0) {
      setError(
        "No workplace location is available. Please add an active workplace location first."
      );
      return;
    }

    if (!selectedLocation) {
      setError("Please select a workplace location.");
      return;
    }

    const selectedLocationObject =
      locations.find(
        (location) =>
          String(location.id) === selectedLocation
      );

    if (!selectedLocationObject) {
      setError(
        "The selected workplace location is invalid. Please select it again."
      );
      return;
    }

    if (!cameraActive) {
      setError("Please open the live camera first.");
      return;
    }

    if (
      !streamRef.current ||
      streamRef.current.getVideoTracks().length === 0
    ) {
      setError(
        "The live camera stream is not available. Please restart the camera."
      );
      return;
    }

    if (!user?.id) {
      setError(
        "Your logged-in employee account could not be identified."
      );
      return;
    }

    try {
      setProcessing(true);

      // STEP 1
      setMessage(
        "Capturing current live camera frame..."
      );

      const image = await captureLiveFrame();

      if (!image) {
        throw new Error(
          "Could not capture the live camera frame. Keep your face visible inside the guide and try again."
        );
      }

      // STEP 2
      setMessage("Verifying your live face...");

      let faceResult:
        | FaceVerificationResponse
        | null = null;

      try {
        faceResult = await verifyFace(image);
      } catch (err: any) {
        console.error(
          "Face verification failed:",
          err
        );

        const detail =
          err?.response?.data?.detail;

        if (Array.isArray(detail)) {
          throw new Error(
            detail
              .map(
                (item: any) =>
                  item?.msg ||
                  "Invalid request."
              )
              .join(", ")
          );
        }

        if (typeof detail === "string") {
          throw new Error(detail);
        }

        if (err?.code === "ERR_NETWORK") {
          throw new Error(
            "Cannot reach the face recognition server. Make sure FastAPI is running at http://127.0.0.1:8000."
          );
        }

        throw new Error(
          err?.message ||
            "Face verification failed."
        );
      }

      if (
        !faceResult ||
        faceResult.recognized !== true
      ) {
        throw new Error(
          faceResult?.message ||
            "Face not recognized. Make sure your face is clearly visible and already registered."
        );
      }

      // STEP 3
      if (
        faceResult.user_id !== undefined &&
        Number(faceResult.user_id) !== Number(user.id)
      ) {
        throw new Error(
          "The detected face belongs to another employee. Attendance cannot be marked."
        );
      }

      const detectedConfidence =
        faceResult.confidence ??
        (faceResult.similarity !== undefined
          ? faceResult.similarity * 100
          : null);

      setEmployeeName(
        faceResult.employee_name ||
          user.name ||
          "Employee"
      );

      if (detectedConfidence !== null) {
        setConfidence(
          Number(detectedConfidence)
        );
      }

      // STEP 4
      setMessage(
        "Face verified. Checking your current GPS location..."
      );

      let position: GeolocationPosition;

      try {
        position = await getCurrentPosition();
      } catch (gpsError: any) {
        console.error(
          "GPS error:",
          gpsError
        );

        if (gpsError?.code === 1) {
          throw new Error(
            "Location permission was denied. Allow location access for this site and try again."
          );
        }

        if (gpsError?.code === 2) {
          throw new Error(
            "Your current location could not be determined."
          );
        }

        if (gpsError?.code === 3) {
          throw new Error(
            "Location request timed out. Please try again."
          );
        }

        throw new Error(
          "Unable to get your current location."
        );
      }

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      // STEP 5
      setMessage(
        `Location received. Checking ${selectedLocationObject.name} and marking attendance...`
      );

      const response =
        await api.post<CheckInResponse>(
          "/api/attendance/check-in",
          {
            user_id: Number(user.id),
            latitude,
            longitude,
            location_id: Number(selectedLocation),
          }
        );

      const data = response.data;

      const status =
        String(data.status || "").toLowerCase();

      const isPresent =
        status === "present" ||
        status === "already present";

      if (!isPresent) {
        throw new Error(
          data.message ||
            "Attendance was not marked."
        );
      }

      setSuccess(true);

      setAttendanceId(
        data.attendance_id ?? null
      );

      setDistance(
        data.distance_meters ?? null
      );

      if (status === "already present") {
        setMessage(
          "Attendance was already marked for today."
        );
      } else {
        setMessage(
          "Attendance marked successfully."
        );
      }

      stopCamera();
    } catch (err: any) {
      console.error(
        "Attendance verification error:",
        err
      );

      const detail =
        err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map(
              (item: any) =>
                item?.msg ||
                "Invalid request."
            )
            .join(", ")
        );
      } else if (
        typeof detail === "string"
      ) {
        setError(detail);
      } else if (
        err?.code === "ERR_NETWORK"
      ) {
        setError(
          "Cannot connect to the backend. Make sure FastAPI is running at http://127.0.0.1:8000."
        );
      } else {
        setError(
          err?.message ||
            "Attendance verification failed."
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  // ==========================================================
  // RESET
  // ==========================================================

  const handleReset = () => {
    stopCamera();

    setSuccess(false);
    setError("");
    setMessage("");
    setEmployeeName("");
    setConfidence(null);
    setDistance(null);
    setAttendanceId(null);
  };

  // ==========================================================
  // DERIVED UI DATA
  // ==========================================================

  const selectedLocationObject =
    locations.find(
      (location) =>
        String(location.id) === selectedLocation
    );

  const confidenceValue =
    confidence !== null
      ? Math.max(0, Math.min(100, confidence))
      : 0;

  const systemStatus = success
    ? "VERIFIED"
    : processing
      ? "PROCESSING"
      : cameraActive && selectedLocation
        ? "READY"
        : "STANDBY";

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-full space-y-6 pb-8">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
              <ScanFace className="h-7 w-7" />

              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950">
                <Sparkles className="h-3 w-3" />
              </span>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-blue-600 dark:text-blue-400">
                  SMART ATTENDANCE INTELLIGENCE
                </span>

                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-600">
                  AI BIOMETRIC
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Face Recognition
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Secure biometric verification with
                real-time GPS geofencing for intelligent
                attendance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                systemStatus === "VERIFIED"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : systemStatus === "PROCESSING"
                    ? "bg-blue-500/10 text-blue-600"
                    : systemStatus === "READY"
                      ? "bg-cyan-500/10 text-cyan-600"
                      : "bg-slate-500/10 text-slate-500"
              }`}
            >
              {systemStatus === "VERIFIED" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : systemStatus === "PROCESSING" ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <CircleDot className="h-5 w-5" />
              )}
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                System status
              </p>

              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {systemStatus}
              </p>
            </div>
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
            description: "Face identity",
            active:
              cameraActive ||
              processing ||
              success,
          },
          {
            icon: Navigation,
            number: "02",
            title: "GEOLOCATION",
            description: "GPS verification",
            active:
              processing ||
              success,
          },
          {
            icon: ShieldCheck,
            number: "03",
            title: "ATTENDANCE",
            description: "Secure check-in",
            active: success,
          },
        ].map((step) => {
          const Icon = step.icon;

          return (
            <div
              key={step.number}
              className={`rounded-2xl border p-4 transition-all duration-300 ${
                step.active
                  ? "border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    step.active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-400">
                    {step.number} · {step.title}
                  </p>

                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {step.description}
                  </p>
                </div>

                {step.active && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================
          MAIN GRID
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">

        {/* ====================================================
            CAMERA PANEL
        ==================================================== */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">

          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Camera className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Biometric Capture
                  </h2>

                  <p className="text-xs text-slate-500">
                    Secure live camera verification
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wider ${
                  cameraActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    cameraActive
                      ? "animate-pulse bg-emerald-500"
                      : "bg-slate-400"
                  }`}
                />

                {cameraActive
                  ? "LIVE"
                  : "OFFLINE"}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">

            {/* CAMERA */}
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-slate-950 ring-1 ring-slate-900/10">

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.16),transparent_58%)]" />

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`relative z-10 h-full w-full object-cover ${
                  cameraActive
                    ? "scale-x-[-1]"
                    : "hidden"
                }`}
              />

              {!cameraActive && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-400 backdrop-blur">
                    <Camera className="h-9 w-9" />
                  </div>

                  <p className="text-lg font-bold text-white">
                    Camera Standby
                  </p>

                  <p className="mt-1 max-w-sm text-sm text-slate-400">
                    Activate the camera to begin
                    biometric attendance verification.
                  </p>
                </div>
              )}

              {cameraActive && (
                <>
                  {/* GRID */}
                  <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px]" />

                  {/* FACE GUIDE */}
                  <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                    <div className="relative h-[68%] w-[38%] min-w-[180px] max-w-[300px] rounded-[48%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.32)]">

                      <div className="absolute -left-1 -top-1 h-10 w-10 rounded-tl-2xl border-l-2 border-t-2 border-cyan-400" />

                      <div className="absolute -right-1 -top-1 h-10 w-10 rounded-tr-2xl border-r-2 border-t-2 border-cyan-400" />

                      <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-bl-2xl border-b-2 border-l-2 border-cyan-400" />

                      <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-br-2xl border-b-2 border-r-2 border-cyan-400" />

                      <div
                        className={`absolute left-[8%] right-[8%] h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent ${
                          processing
                            ? "animate-[faceScan_1.8s_ease-in-out_infinite]"
                            : "top-1/2"
                        }`}
                      />
                    </div>
                  </div>

                  {/* LIVE BADGE */}
                  <div className="absolute left-4 top-4 z-40 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] font-bold tracking-wider text-white backdrop-blur">
                    <Crosshair className="h-3.5 w-3.5 text-cyan-400" />
                    FACE ALIGNMENT
                  </div>

                  {/* CAMERA INSTRUCTION */}
                  <div className="absolute bottom-4 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-slate-950/75 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                    {processing
                      ? "AI verification in progress..."
                      : "Position one face inside the guide"}
                  </div>
                </>
              )}
            </div>

            {/* BUTTONS */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">

              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={
                    startingCamera ||
                    processing
                  }
                  className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-700 group-hover:translate-x-full" />

                  <span className="relative flex items-center gap-2">
                    {startingCamera ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Starting Camera...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Open Live Camera
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  disabled={processing}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-red-900/50 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                >
                  <CameraOff className="h-4 w-4" />
                  Stop Camera
                </button>
              )}

              {success && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20 dark:hover:text-blue-400"
                >
                  <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
                  New Verification
                </button>
              )}
            </div>

            {/* QUICK STATUS */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Camera
                  </span>

                  <Camera className="h-4 w-4 text-blue-500" />
                </div>

                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {cameraActive
                    ? "Connected"
                    : "Standby"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    AI Engine
                  </span>

                  <Fingerprint className="h-4 w-4 text-cyan-500" />
                </div>

                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {processing
                    ? "Analyzing"
                    : "Ready"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    GPS
                  </span>

                  <Navigation className="h-4 w-4 text-emerald-500" />
                </div>

                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {success
                    ? "Verified"
                    : "Waiting"}
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
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
                loadingLocations
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {loadingLocations
                  ? "Loading workplaces..."
                  : locations.length > 0
                    ? "Select workplace"
                    : "No workplace locations"}
              </option>

              {locations.map((location) => (
                <option
                  key={location.id}
                  value={String(location.id)}
                >
                  {location.name} —{" "}
                  {location.radius_meters}m radius
                </option>
              ))}
            </select>

            {loadingLocations && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading workplace locations...
              </div>
            )}

            {!loadingLocations &&
              locations.length === 0 && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  No active workplace locations
                  found.
                </div>
              )}

            {selectedLocationObject && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  GEOFENCE READY
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Radius
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {selectedLocationObject.radius_meters} m
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EMPLOYEE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Employee Identity
                </h2>

                <p className="text-xs text-slate-500">
                  Logged-in account
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
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

              {user?.id && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Employee ID
                  </span>

                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    #{user.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* VERIFY */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:via-slate-950 dark:to-cyan-950/20">

            <div className="mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-blue-600" />

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                Verification Control
              </span>
            </div>

            <button
              type="button"
              onClick={handleVerifyAndCheckIn}
              disabled={processing}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-900/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 dark:from-white dark:via-slate-100 dark:to-blue-100 dark:text-slate-950"
            >
              <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-700 group-hover:translate-x-full dark:bg-blue-600/10" />

              <span className="relative flex items-center gap-2">
                {processing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Verify & Check In
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2
                  className={`h-4 w-4 ${
                    cameraActive
                      ? "text-emerald-500"
                      : "text-slate-300"
                  }`}
                />

                Live camera active
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2
                  className={`h-4 w-4 ${
                    selectedLocation
                      ? "text-emerald-500"
                      : "text-slate-300"
                  }`}
                />

                Workplace selected
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                Authenticated employee
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          STATUS
      ====================================================== */}

      {(message || error || success) && (
        <div
          className={`overflow-hidden rounded-3xl border shadow-sm ${
            success
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
              : error
                ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
                : "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20"
          }`}
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  success
                    ? "bg-emerald-500/10 text-emerald-600"
                    : error
                      ? "bg-red-500/10 text-red-600"
                      : "bg-blue-500/10 text-blue-600"
                }`}
              >
                {success ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : error ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={`font-bold ${
                      success
                        ? "text-emerald-700 dark:text-emerald-400"
                        : error
                          ? "text-red-700 dark:text-red-400"
                          : "text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    {success
                      ? "Attendance Successful"
                      : error
                        ? "Verification Failed"
                        : "Processing"}
                  </h3>

                  {success && (
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-bold tracking-wider text-white">
                      VERIFIED
                    </span>
                  )}
                </div>

                {(message || error) && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {error || message}
                  </p>
                )}

                {success && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Employee
                        </p>

                        <UserRound className="h-4 w-4 text-violet-500" />
                      </div>

                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                        {employeeName ||
                          user?.name ||
                          "Employee"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Face Confidence
                        </p>

                        <Fingerprint className="h-4 w-4 text-blue-500" />
                      </div>

                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {confidence !== null
                          ? `${confidence.toFixed(2)}%`
                          : "Verified"}
                      </p>

                      {confidence !== null && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700"
                            style={{
                              width: `${confidenceValue}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Distance
                        </p>

                        <MapPin className="h-4 w-4 text-emerald-500" />
                      </div>

                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {distance !== null
                          ? `${distance.toFixed(2)} m`
                          : "Verified"}
                      </p>
                    </div>
                  </div>
                )}

                {success &&
                  attendanceId !== null && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="text-xs text-slate-500">
                        Attendance ID
                      </span>

                      <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        #{attendanceId}
                      </span>

                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Recorded securely
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          SECURITY INFORMATION
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
                AI + GPS
              </span>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Attendance requires a verified live
              facial identity and current GPS position
              inside the selected workplace radius.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[190px]">
            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Biometric
              </p>

              <p className="mt-1 text-xs font-bold text-emerald-600">
                Protected
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
          </div>
        </div>
      </div>

      {/* ======================================================
          SCAN ANIMATION
      ====================================================== */}

      <style>{`
        @keyframes faceScan {
          0% {
            top: 8%;
            opacity: 0.35;
          }

          50% {
            top: 50%;
            opacity: 1;
          }

          100% {
            top: 92%;
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
}