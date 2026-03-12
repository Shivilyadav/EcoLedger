import io
import json
import os
from typing import Optional

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google.oauth2.service_account import Credentials

DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]

GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
GOOGLE_SERVICE_ACCOUNT_CONTENT = os.getenv("GOOGLE_SERVICE_ACCOUNT_CONTENT")
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID")


def _load_credentials() -> Credentials:
    if GOOGLE_SERVICE_ACCOUNT_CONTENT:
        info = json.loads(GOOGLE_SERVICE_ACCOUNT_CONTENT)
        return Credentials.from_service_account_info(info, scopes=DRIVE_SCOPES)
    if GOOGLE_SERVICE_ACCOUNT_JSON:
        return Credentials.from_service_account_file(GOOGLE_SERVICE_ACCOUNT_JSON, scopes=DRIVE_SCOPES)
    raise RuntimeError("Missing Google service account credentials")


def _drive_client():
    creds = _load_credentials()
    return build("drive", "v3", credentials=creds)


def upload_image_to_drive(
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    folder_id: Optional[str] = None
) -> str:
    if not DRIVE_FOLDER_ID and not folder_id:
        raise RuntimeError("DRIVE_FOLDER_ID is not set")

    service = _drive_client()
    metadata = {
        "name": filename,
        "parents": [folder_id or DRIVE_FOLDER_ID]
    }
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type, resumable=False)

    created = service.files().create(
        body=metadata,
        media_body=media,
        fields="id, webViewLink"
    ).execute()

    file_id = created.get("id")
    if not file_id:
        raise RuntimeError("Failed to create file in Drive")

    # Make viewable by link
    service.permissions().create(
        fileId=file_id,
        body={"type": "anyone", "role": "reader"},
    ).execute()

    return created.get("webViewLink") or f"https://drive.google.com/file/d/{file_id}/view"
