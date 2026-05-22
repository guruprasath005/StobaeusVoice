"""PACS / DICOMweb integration — QIDO-RS search + WADO-RS fetch + pydicom SR parsing."""
import io
import logging
from typing import Optional

import httpx
import pydicom
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from routers.auth import User, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pacs", tags=["pacs"])

# ── LOINC → echo findings key mapping ─────────────────────────────────────────
ECHO_LOINC: dict[str, str] = {
    "59063-1": "lv_ef",    # EF biplane Simpson — %
    "18156-0": "lvedd",    # LVIDd — mm
    "18033-1": "lvesd",    # LVIDs — mm
    "18090-1": "ivsd",     # IVSd — mm
    "29436-9": "rvsp",     # RVSP — mmHg
    "80009-3": "la_diam",  # LA diameter — mm
    "18149-5": "ao_root",  # Aortic root — mm
}

CATH_LOINC: dict[str, str] = {
    "8218-2": "lvedp",     # LVEDP — mmHg
}


# ── Schemas ────────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    wado_base: str                    # e.g. http://31.97.63.234:8042/dicom-web
    patient_id: Optional[str] = None
    accession_number: Optional[str] = None
    study_date: Optional[str] = None  # YYYYMMDD or YYYYMMDD-YYYYMMDD
    modality: Optional[str] = None    # SR, US, XA, etc.
    username: str = "orthanc"
    password: str = "orthanc"


class ImportRequest(BaseModel):
    wado_base: str
    study_uid: str
    template: str = "echo"           # echo | cath
    username: str = "orthanc"
    password: str = "orthanc"


# ── SR parsing ─────────────────────────────────────────────────────────────────

def _walk_sr(dataset, results: dict, loinc_map: dict) -> None:
    """Recursively walk DICOM SR ContentSequence and extract NUM items by LOINC."""
    cs = getattr(dataset, "ContentSequence", None)
    if not cs:
        return
    for item in cs:
        if getattr(item, "ValueType", "") == "NUM":
            try:
                concept = item.ConceptNameCodeSequence[0]
                scheme = getattr(concept, "CodingSchemeDesignator", "")
                code = getattr(concept, "CodeValue", "")
                if scheme in ("LN", "LOINC") and code in loinc_map:
                    val = float(item.MeasuredValueSequence[0].NumericValue)
                    key = loinc_map[code]
                    if key not in results:
                        results[key] = str(int(val) if val == int(val) else round(val, 1))
            except Exception:
                pass
        _walk_sr(item, results, loinc_map)


def _parse_dicom_bytes(data: bytes, template: str) -> dict:
    """Parse raw DICOM bytes and return extracted findings dict."""
    try:
        ds = pydicom.dcmread(io.BytesIO(data), force=True)
    except Exception as exc:
        raise HTTPException(422, f"Failed to parse DICOM file: {exc}")

    loinc_map = ECHO_LOINC if template == "echo" else CATH_LOINC
    results: dict = {}
    _walk_sr(ds, results, loinc_map)
    return results


def _extract_multipart(content: bytes, content_type: str) -> bytes:
    """Extract the first DICOM instance from a WADO-RS multipart/related response."""
    boundary = None
    for part in content_type.split(";"):
        part = part.strip()
        if part.startswith("boundary="):
            boundary = part[9:].strip('"')
    if boundary:
        sep = f"--{boundary}".encode()
        parts = content.split(sep)
        for p in parts[1:]:
            if b"\r\n\r\n" in p:
                return p.split(b"\r\n\r\n", 1)[1].rstrip(b"--").strip()
    return content


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/search")
def pacs_search(req: SearchRequest, _: User = Depends(get_current_user)):
    """QIDO-RS: search for studies in the PACS by patient ID / accession / date."""
    base = req.wado_base.rstrip("/")
    params: dict = {"includefield": "all"}
    if req.patient_id:
        params["PatientID"] = req.patient_id
    if req.accession_number:
        params["AccessionNumber"] = req.accession_number
    if req.study_date:
        params["StudyDate"] = req.study_date
    if req.modality:
        params["ModalitiesInStudy"] = req.modality

    try:
        resp = httpx.get(
            f"{base}/studies",
            params=params,
            auth=(req.username, req.password),
            timeout=10,
            headers={"Accept": "application/dicom+json"},
        )
    except httpx.RequestError as exc:
        raise HTTPException(502, f"PACS connection failed: {exc}")

    if resp.status_code == 204:
        return []
    if resp.status_code != 200:
        raise HTTPException(502, f"PACS returned HTTP {resp.status_code}: {resp.text[:200]}")

    try:
        studies_raw = resp.json()
    except Exception:
        return []

    studies = []
    for s in studies_raw:
        def tag(t: str, default: str = "") -> str:
            node = s.get(t, {})
            vals = node.get("Value", [])
            return str(vals[0]) if vals else default

        studies.append({
            "study_uid":          tag("0020000D"),
            "patient_id":         tag("00100020"),
            "patient_name":       tag("00100010"),
            "study_date":         tag("00080020"),
            "study_description":  tag("00081030"),
            "accession_number":   tag("00080050"),
            "modalities":         tag("00080061"),
            "num_series":         tag("00201206"),
        })
    return studies


@router.post("/import")
def pacs_import(req: ImportRequest, _: User = Depends(get_current_user)):
    """WADO-RS: fetch all SR instances in a study and extract cardiac fields."""
    base = req.wado_base.rstrip("/")
    auth = (req.username, req.password)
    loinc_map = ECHO_LOINC if req.template == "echo" else CATH_LOINC

    # Step 1 — get series list for the study
    try:
        series_resp = httpx.get(
            f"{base}/studies/{req.study_uid}/series",
            auth=auth,
            timeout=10,
            headers={"Accept": "application/dicom+json"},
        )
    except httpx.RequestError as exc:
        raise HTTPException(502, f"PACS connection failed: {exc}")

    if series_resp.status_code not in (200, 204):
        raise HTTPException(502, f"PACS series list failed: HTTP {series_resp.status_code}")

    series_list = series_resp.json() if series_resp.status_code == 200 else []

    # Step 2 — for each series, look for SR modality instances
    results: dict = {}
    for series in series_list:
        modality = series.get("00080060", {}).get("Value", [""])[0]
        series_uid = series.get("0020000E", {}).get("Value", [""])[0]
        if not series_uid:
            continue

        # Get instances in this series
        try:
            inst_resp = httpx.get(
                f"{base}/studies/{req.study_uid}/series/{series_uid}/instances",
                auth=auth,
                timeout=10,
                headers={"Accept": "application/dicom+json"},
            )
            if inst_resp.status_code != 200:
                continue
            instances = inst_resp.json()
        except Exception:
            continue

        for inst in instances:
            sop_uid = inst.get("00080018", {}).get("Value", [""])[0]
            sop_class = inst.get("00080016", {}).get("Value", [""])[0]
            if not sop_uid:
                continue

            # Fetch the DICOM instance
            try:
                dicom_resp = httpx.get(
                    f"{base}/studies/{req.study_uid}/series/{series_uid}/instances/{sop_uid}",
                    auth=auth,
                    timeout=15,
                    headers={"Accept": 'multipart/related; type="application/dicom"'},
                )
                if dicom_resp.status_code != 200:
                    continue
            except Exception:
                continue

            ct = dicom_resp.headers.get("content-type", "")
            raw = _extract_multipart(dicom_resp.content, ct) if "multipart" in ct else dicom_resp.content

            extracted = _parse_dicom_bytes(raw, req.template)
            results.update({k: v for k, v in extracted.items() if k not in results})

        if results:
            break  # Got enough data — stop searching series

    return {
        "ok": True,
        "findings": results,
        "fields_found": list(results.keys()),
    }


@router.post("/upload")
async def pacs_upload(
    template: str = Form("echo"),
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload a DICOM SR file directly (for testing without a live PACS)."""
    data = await file.read()
    findings = _parse_dicom_bytes(data, template)
    return {
        "ok": True,
        "findings": findings,
        "fields_found": list(findings.keys()),
    }
