
from __future__ import annotations

import json
from typing import Any

import cv2
import numpy as np
from insightface.app import FaceAnalysis
from sqlalchemy import text
from sqlalchemy.orm import Session


class FaceService:
    """
    Face recognition service using InsightFace.

    Biometric storage:
        public.users.face_embedding -> JSONB
        public.users.face_enrolled_at -> TIMESTAMPTZ

    Responsibilities:
    - Decode live camera images
    - Detect exactly one face
    - Generate normalized face embeddings
    - Register/update employee face embeddings
    - Verify live faces against registered employees
    """

    MATCH_THRESHOLD = 0.45

    def __init__(self) -> None:
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )

        self.app.prepare(
            ctx_id=0,
            det_size=(640, 640),
        )

    # ========================================================
    # IMAGE DECODING
    # ========================================================

    @staticmethod
    def _read_image(image_bytes: bytes) -> np.ndarray:
        """
        Convert JPEG/PNG binary data into an OpenCV image.
        """

        if not image_bytes:
            raise ValueError(
                "Invalid image file: image is empty."
            )

        if not isinstance(image_bytes, bytes):
            raise ValueError(
                "Invalid image data."
            )

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        if image_array.size == 0:
            raise ValueError(
                "Invalid image file."
            )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            raise ValueError(
                "Invalid image file. Please capture the face again."
            )

        if image.size == 0:
            raise ValueError(
                "Invalid image file."
            )

        return image

    # ========================================================
    # FACE EMBEDDING
    # ========================================================

    def generate_embedding(
        self,
        image_bytes: bytes,
    ) -> np.ndarray:
        """
        Detect exactly one face and generate
        a normalized InsightFace embedding.
        """

        image = self._read_image(
            image_bytes
        )

        try:
            faces = self.app.get(image)
        except Exception as exc:
            raise ValueError(
                f"Face detection failed: {str(exc)}"
            ) from exc

        if faces is None or len(faces) == 0:
            raise ValueError(
                "No face detected in the image. "
                "Please position your face clearly inside the camera."
            )

        if len(faces) > 1:
            raise ValueError(
                "Multiple faces detected. "
                "Please show only one person."
            )

        face = faces[0]

        embedding = getattr(
            face,
            "embedding",
            None,
        )

        if embedding is None:
            raise ValueError(
                "Could not generate face embedding."
            )

        embedding = np.asarray(
            embedding,
            dtype=np.float32,
        ).flatten()

        if embedding.size == 0:
            raise ValueError(
                "Invalid face embedding."
            )

        if not np.all(
            np.isfinite(embedding)
        ):
            raise ValueError(
                "Face embedding contains invalid values."
            )

        norm = np.linalg.norm(
            embedding
        )

        if (
            not np.isfinite(norm)
            or norm == 0
        ):
            raise ValueError(
                "Invalid face embedding."
            )

        embedding = embedding / norm

        return embedding.astype(
            np.float32
        )

    # ========================================================
    # JSON SERIALIZATION
    # ========================================================

    @staticmethod
    def embedding_to_json(
        embedding: np.ndarray,
    ) -> list[float]:
        """
        Convert NumPy embedding into a JSON-compatible
        list for PostgreSQL JSONB storage.
        """

        embedding = np.asarray(
            embedding,
            dtype=np.float32,
        ).flatten()

        if embedding.size == 0:
            raise ValueError(
                "Cannot store an empty face embedding."
            )

        if not np.all(
            np.isfinite(embedding)
        ):
            raise ValueError(
                "Cannot store an invalid face embedding."
            )

        return [
            float(value)
            for value in embedding
        ]

    # ========================================================
    # JSON DESERIALIZATION
    # ========================================================

    @staticmethod
    def json_to_embedding(
        data: Any,
    ) -> np.ndarray:
        """
        Convert PostgreSQL JSONB face embedding
        into a normalized NumPy array.
        """

        if data is None:
            raise ValueError(
                "Stored face embedding is empty."
            )

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception as exc:
                raise ValueError(
                    "Stored face embedding could not be decoded."
                ) from exc

        if not isinstance(
            data,
            (list, tuple),
        ):
            raise ValueError(
                "Stored face embedding has an invalid format."
            )

        if len(data) == 0:
            raise ValueError(
                "Stored face embedding is empty."
            )

        try:
            embedding = np.asarray(
                data,
                dtype=np.float32,
            ).flatten()
        except Exception as exc:
            raise ValueError(
                "Stored face embedding could not be converted."
            ) from exc

        if embedding.size == 0:
            raise ValueError(
                "Stored face embedding is empty."
            )

        if not np.all(
            np.isfinite(embedding)
        ):
            raise ValueError(
                "Stored face embedding contains invalid values."
            )

        norm = np.linalg.norm(
            embedding
        )

        if (
            not np.isfinite(norm)
            or norm == 0
        ):
            raise ValueError(
                "Stored face embedding is invalid."
            )

        embedding = embedding / norm

        return embedding.astype(
            np.float32
        )

    # ========================================================
    # COSINE SIMILARITY
    # ========================================================

    @staticmethod
    def cosine_similarity(
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> float:
        """
        Calculate cosine similarity between
        two face embeddings.
        """

        a = np.asarray(
            embedding_a,
            dtype=np.float32,
        ).flatten()

        b = np.asarray(
            embedding_b,
            dtype=np.float32,
        ).flatten()

        if (
            a.size == 0
            or b.size == 0
        ):
            return -1.0

        if a.shape != b.shape:
            return -1.0

        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if (
            not np.isfinite(norm_a)
            or not np.isfinite(norm_b)
            or norm_a == 0
            or norm_b == 0
        ):
            return -1.0

        a = a / norm_a
        b = b / norm_b

        similarity = float(
            np.dot(a, b)
        )

        if not np.isfinite(similarity):
            return -1.0

        return similarity

    # ========================================================
    # REGISTER FACE
    # ========================================================

    def register_face(
        self,
        db: Session,
        user_id: int,
        image_bytes: bytes,
    ) -> dict[str, Any]:
        """
        Register or update an employee's face biometric.

        The embedding is stored directly in:

            public.users.face_embedding

        and the enrollment time is stored in:

            public.users.face_enrolled_at
        """

        # ----------------------------------------------------
        # Validate employee
        # ----------------------------------------------------

        employee = db.execute(
            text(
                """
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    face_embedding
                FROM public.users
                WHERE id = :user_id
                LIMIT 1
                """
            ),
            {
                "user_id": user_id,
            },
        ).mappings().first()

        if not employee:
            raise ValueError(
                f"Employee with ID {user_id} was not found."
            )

        if employee["role"] != "employee":
            raise ValueError(
                "Face registration is available only for employees."
            )

        if employee["is_active"] is False:
            raise ValueError(
                "This employee account is inactive."
            )

        # ----------------------------------------------------
        # Generate embedding from live camera image
        # ----------------------------------------------------

        embedding = self.generate_embedding(
            image_bytes
        )

        # ----------------------------------------------------
        # Convert embedding to JSON-compatible list
        # ----------------------------------------------------

        embedding_json = (
            self.embedding_to_json(
                embedding
            )
        )

        # ----------------------------------------------------
        # Determine whether biometric already exists
        # ----------------------------------------------------

        was_registered = bool(
            employee["face_embedding"]
        )

        # ----------------------------------------------------
        # Convert embedding safely to JSON
        # ----------------------------------------------------

        embedding_json_string = json.dumps(
            embedding_json,
            separators=(",", ":"),
        )

        # ----------------------------------------------------
        # Store biometric directly in users table
        # ----------------------------------------------------

        db.execute(
            text(
                """
                UPDATE public.users
                SET
                    face_embedding = CAST(
                        :face_embedding AS jsonb
                    ),
                    face_enrolled_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                """
            ),
            {
                "user_id": user_id,
                "face_embedding": embedding_json_string,
            },
        )

        db.commit()

        # ----------------------------------------------------
        # Return successful registration information
        # ----------------------------------------------------

        return {
            "user_id": user_id,
            "action": (
                "updated"
                if was_registered
                else "created"
            ),
            "embedding_size": int(
                embedding.shape[0]
            ),
            "face_enrolled": True,
            "face_enrolled_at": True,
        }

    # ========================================================
    # VERIFY FACE
    # ========================================================

    def verify_face(
        self,
        db: Session,
        image_bytes: bytes,
    ) -> dict[str, Any]:
        """
        Compare a live camera face against
        all registered active employees.
        """

        # ----------------------------------------------------
        # Generate live face embedding
        # ----------------------------------------------------

        query_embedding = (
            self.generate_embedding(
                image_bytes
            )
        )

        # ----------------------------------------------------
        # Load registered employee faces
        # ----------------------------------------------------

        rows = db.execute(
            text(
                """
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    face_embedding
                FROM public.users
                WHERE role = 'employee'
                  AND is_active = TRUE
                  AND face_embedding IS NOT NULL
                """
            )
        ).mappings().all()

        # ----------------------------------------------------
        # No registered faces
        # ----------------------------------------------------

        if not rows:
            return {
                "recognized": False,
                "similarity": 0.0,
                "confidence": 0.0,
                "message": (
                    "No registered employee faces found."
                ),
            }

        best_match = None
        best_similarity = -1.0

        # ----------------------------------------------------
        # Compare against every registered employee
        # ----------------------------------------------------

        for employee in rows:

            try:
                stored_embedding = (
                    self.json_to_embedding(
                        employee["face_embedding"]
                    )
                )

                # Embedding dimensions must match.
                if (
                    query_embedding.shape
                    != stored_embedding.shape
                ):
                    continue

                similarity = (
                    self.cosine_similarity(
                        query_embedding,
                        stored_embedding,
                    )
                )

                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = employee

            except Exception:
                # Ignore corrupted biometric records.
                continue

        # ----------------------------------------------------
        # No valid embeddings
        # ----------------------------------------------------

        if best_match is None:
            return {
                "recognized": False,
                "similarity": 0.0,
                "confidence": 0.0,
                "message": (
                    "No valid registered face embeddings found."
                ),
            }

        # ----------------------------------------------------
        # Determine recognition
        # ----------------------------------------------------

        recognized = (
            best_similarity
            >= self.MATCH_THRESHOLD
        )

        confidence = max(
            0.0,
            min(
                100.0,
                best_similarity * 100.0,
            ),
        )

        # ----------------------------------------------------
        # Face not recognized
        # ----------------------------------------------------

        if not recognized:
            return {
                "recognized": False,
                "similarity": round(
                    best_similarity,
                    4,
                ),
                "confidence": round(
                    confidence,
                    2,
                ),
                "message": (
                    "Face not recognized. "
                    "Please make sure you are registered "
                    "and your face is clearly visible."
                ),
            }

        # ----------------------------------------------------
        # Face recognized
        # ----------------------------------------------------

        return {
            "recognized": True,
            "user_id": best_match["id"],
            "employee_name": best_match["name"],
            "employee_email": best_match["email"],
            "similarity": round(
                best_similarity,
                4,
            ),
            "confidence": round(
                confidence,
                2,
            ),
            "message": (
                "Face recognized successfully."
            ),
        }


# ============================================================
# SINGLE SERVICE INSTANCE
# ============================================================

face_service = FaceService()

