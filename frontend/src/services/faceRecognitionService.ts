import api from "./api";

export interface FaceRegisterResponse {
  success: boolean;
  message: string;
  user_id?: number;
  action?: string;
  embedding_size?: number;
  [key: string]: unknown;
}

export interface FaceVerifyResponse {
  success: boolean;
  recognized: boolean;
  user_id?: number;
  employee_name?: string;
  employee_email?: string;
  similarity?: number;
  confidence?: number;
  message: string;
}

function validateImage(
  image: File,
  errorMessage: string
): void {
  if (!image) {
    throw new Error(errorMessage);
  }

  if (!(image instanceof File)) {
    throw new Error(
      "The captured image is not a valid File object."
    );
  }

  if (image.size <= 0) {
    throw new Error(
      "The captured image is empty."
    );
  }

  if (
    !image.type ||
    !image.type.startsWith("image/")
  ) {
    throw new Error(
      "The captured image is not a valid image."
    );
  }
}

/**
 * Register an employee's biometric face.
 *
 * This is used from the Admin Employees page.
 */
export async function registerFace(
  userId: number,
  image: File
): Promise<FaceRegisterResponse> {
  validateImage(
    image,
    "No face image was provided."
  );

  const formData = new FormData();

  formData.append(
    "user_id",
    String(userId)
  );

  formData.append(
    "file",
    image,
    image.name || "employee-face.jpg"
  );

  /*
   * IMPORTANT:
   *
   * Do NOT manually set Content-Type.
   *
   * The browser must generate:
   *
   * multipart/form-data;
   * boundary=------------------------
   *
   * FastAPI needs that boundary to detect
   * the UploadFile field correctly.
   */
  const response =
    await api.post<FaceRegisterResponse>(
      "/api/face/register",
      formData,
      {
        transformRequest: [
          (data) => data,
        ],
      }
    );

  return response.data;
}

/**
 * Verify the CURRENT live webcam frame.
 *
 * This function does NOT upload a stored
 * employee photograph.
 *
 * FaceRecognition.tsx creates a JPEG File
 * from the current webcam frame and sends
 * that File here.
 */
export async function verifyFace(
  image: File
): Promise<FaceVerifyResponse> {
  validateImage(
    image,
    "No live face image was captured."
  );

  console.log(
    "Live face image:",
    {
      name: image.name,
      type: image.type,
      size: image.size,
    }
  );

  const formData = new FormData();

  formData.append(
    "file",
    image,
    "live-face-capture.jpg"
  );

  /*
   * Do not set Content-Type manually.
   *
   * transformRequest returns the FormData
   * untouched so Axios/browser can create
   * the multipart boundary automatically.
   */
  const response =
    await api.post<FaceVerifyResponse>(
      "/api/face/verify",
      formData,
      {
        transformRequest: [
          (data) => data,
        ],
      }
    );

  return response.data;
}