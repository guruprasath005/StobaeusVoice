"""
Generate synthetic DICOM test data and push to Orthanc.

Creates for each patient:
  - One DICOM SR (Structured Report) with echo measurements using LOINC codes
  - One minimal US (ultrasound) image instance

Run:
  python scripts/generate_dicom_test_data.py
"""
import io
import struct
import uuid
import datetime
import requests
import pydicom
from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
from pydicom.sequence import Sequence
from pydicom.uid import (
    generate_uid, ExplicitVRLittleEndian,
    UID,
)

ORTHANC_BASE = "http://31.97.63.234:8042"
ORTHANC_AUTH = ("orthanc", "orthanc")

# ── Echo measurements per patient ─────────────────────────────────────────────
# LOINC codes as used in backend/routers/pacs.py
ECHO_LOINC = {
    "59063-1": "lv_ef",    # EF biplane Simpson — %
    "18156-0": "lvedd",    # LVIDd — mm
    "18033-1": "lvesd",    # LVIDs — mm
    "18090-1": "ivsd",     # IVSd — mm
    "29436-9": "rvsp",     # RVSP — mmHg
    "80009-3": "la_diam",  # LA diameter — mm
    "18149-5": "ao_root",  # Aortic root — mm
}

PATIENTS = [
    {
        "patient_id":   "PT-2CD588",
        "patient_name": "Ravi Kumar",
        "dob":          "19680315",
        "sex":          "M",
        "accession":    "ACC-ECHO-001",
        "measurements": {
            "59063-1": 38.0,   # EF 38%
            "18156-0": 56.0,   # LVIDd 56mm
            "18033-1": 44.0,   # LVIDs 44mm
            "18090-1": 11.0,   # IVSd 11mm
            "29436-9": 42.0,   # RVSP 42mmHg
            "80009-3": 44.0,   # LA diam 44mm
            "18149-5": 36.0,   # Ao root 36mm
        },
    },
    {
        "patient_id":   "PT-A3F1C2",
        "patient_name": "Anitha Devi",
        "dob":          "19730914",
        "sex":          "F",
        "accession":    "ACC-ECHO-002",
        "measurements": {
            "59063-1": 55.0,   # EF 55%
            "18156-0": 48.0,
            "18033-1": 30.0,
            "18090-1": 10.0,
            "29436-9": 55.0,   # Elevated RVSP (MS)
            "80009-3": 52.0,   # Dilated LA (MS)
            "18149-5": 34.0,
        },
    },
    {
        "patient_id":   "PT-B7E4D1",
        "patient_name": "Lakshmi Narayanan",
        "dob":          "19680219",
        "sex":          "F",
        "accession":    "ACC-ECHO-003",
        "measurements": {
            "59063-1": 35.0,   # EF 35% (HFrEF)
            "18156-0": 62.0,   # Dilated LV
            "18033-1": 52.0,
            "18090-1": 9.0,
            "29436-9": 48.0,
            "80009-3": 46.0,
            "18149-5": 35.0,
        },
    },
]

# ── SOP Class UIDs ─────────────────────────────────────────────────────────────
SR_SOP_CLASS  = "1.2.840.10008.5.1.4.1.1.88.33"   # Comprehensive SR
US_SOP_CLASS  = "1.2.840.10008.5.1.4.1.1.6.1"     # Ultrasound Image


def make_num_item(loinc_code: str, value: float, unit: str, unit_code: str) -> Dataset:
    """Build a DICOM SR NUM content item with a LOINC concept."""
    item = Dataset()
    item.RelationshipType = "CONTAINS"
    item.ValueType = "NUM"

    concept = Dataset()
    concept.CodeValue = loinc_code
    concept.CodingSchemeDesignator = "LN"
    concept.CodeMeaning = loinc_code
    item.ConceptNameCodeSequence = Sequence([concept])

    measured = Dataset()
    measured.NumericValue = pydicom.valuerep.DSfloat(value)

    unit_ds = Dataset()
    unit_ds.CodeValue = unit_code
    unit_ds.CodingSchemeDesignator = "UCUM"
    unit_ds.CodeMeaning = unit
    measured.MeasurementUnitsCodeSequence = Sequence([unit_ds])
    item.MeasuredValueSequence = Sequence([measured])

    return item


UNIT_MAP = {
    "59063-1": ("%",    "%"),
    "18156-0": ("mm",   "mm"),
    "18033-1": ("mm",   "mm"),
    "18090-1": ("mm",   "mm"),
    "29436-9": ("mmHg", "mm[Hg]"),
    "80009-3": ("mm",   "mm"),
    "18149-5": ("mm",   "mm"),
}


def build_echo_sr(p: dict) -> bytes:
    """Build a DICOM Comprehensive SR for echo measurements."""
    study_uid  = generate_uid()
    series_uid = generate_uid()
    sop_uid    = generate_uid()
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")

    # File meta
    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID    = SR_SOP_CLASS
    meta.MediaStorageSOPInstanceUID = sop_uid
    meta.TransferSyntaxUID          = ExplicitVRLittleEndian
    pydicom.dataset.validate_file_meta(meta, enforce_standard=True)

    ds = FileDataset(None, {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.is_implicit_VR = False
    ds.is_little_endian = True

    # Patient
    ds.PatientName    = p["patient_name"].replace(" ", "^")
    ds.PatientID      = p["patient_id"]
    ds.PatientBirthDate = p["dob"]
    ds.PatientSex     = p["sex"]

    # Study
    ds.StudyInstanceUID   = study_uid
    ds.StudyDate          = date_str
    ds.StudyTime          = time_str
    ds.StudyDescription   = "Echocardiogram"
    ds.AccessionNumber    = p["accession"]
    ds.ReferringPhysicianName = "Dr^Priya^Sharma"

    # Series
    ds.SeriesInstanceUID  = series_uid
    ds.SeriesNumber       = "1"
    ds.SeriesDescription  = "Echo SR"
    ds.Modality           = "SR"

    # Instance
    ds.SOPClassUID        = SR_SOP_CLASS
    ds.SOPInstanceUID     = sop_uid
    ds.InstanceNumber     = "1"
    ds.ContentDate        = date_str
    ds.ContentTime        = time_str

    # SR document
    ds.ValueType          = "CONTAINER"
    ds.ContinuityOfContent = "SEPARATE"

    concept = Dataset()
    concept.CodeValue              = "59776-5"
    concept.CodingSchemeDesignator = "LN"
    concept.CodeMeaning            = "Echocardiography Report"
    ds.ConceptNameCodeSequence = Sequence([concept])

    # Build content items
    items = []
    for loinc_code, value in p["measurements"].items():
        unit_label, unit_code = UNIT_MAP[loinc_code]
        items.append(make_num_item(loinc_code, value, unit_label, unit_code))
    ds.ContentSequence = Sequence(items)

    buf = io.BytesIO()
    pydicom.dcmwrite(buf, ds)
    return buf.getvalue(), study_uid


def build_us_image(p: dict, study_uid: str) -> bytes:
    """Build a minimal 64×64 grayscale US DICOM image in the same study."""
    series_uid = generate_uid()
    sop_uid    = generate_uid()
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")

    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID    = US_SOP_CLASS
    meta.MediaStorageSOPInstanceUID = sop_uid
    meta.TransferSyntaxUID          = ExplicitVRLittleEndian
    pydicom.dataset.validate_file_meta(meta, enforce_standard=True)

    ds = FileDataset(None, {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.is_implicit_VR = False
    ds.is_little_endian = True

    ds.PatientName    = p["patient_name"].replace(" ", "^")
    ds.PatientID      = p["patient_id"]
    ds.PatientBirthDate = p["dob"]
    ds.PatientSex     = p["sex"]

    ds.StudyInstanceUID   = study_uid   # same study as SR
    ds.StudyDate          = date_str
    ds.StudyTime          = time_str
    ds.StudyDescription   = "Echocardiogram"
    ds.AccessionNumber    = p["accession"]

    ds.SeriesInstanceUID  = series_uid
    ds.SeriesNumber       = "2"
    ds.SeriesDescription  = "Echo 2D"
    ds.Modality           = "US"

    ds.SOPClassUID        = US_SOP_CLASS
    ds.SOPInstanceUID     = sop_uid
    ds.InstanceNumber     = "1"
    ds.ContentDate        = date_str
    ds.ContentTime        = time_str

    # Minimal image attributes
    rows, cols = 64, 64
    ds.Rows               = rows
    ds.Columns            = cols
    ds.SamplesPerPixel    = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated      = 8
    ds.BitsStored         = 8
    ds.HighBit            = 7
    ds.PixelRepresentation = 0

    # Simple gradient as pixel data (simulates an echo frame)
    pixels = bytes([
        int(128 + 80 * (i / rows) * (j / cols))
        for i in range(rows)
        for j in range(cols)
    ])
    ds.PixelData = pixels

    buf = io.BytesIO()
    pydicom.dcmwrite(buf, ds)
    return buf.getvalue()


def upload_to_orthanc(dicom_bytes: bytes, label: str) -> str:
    """POST DICOM bytes to Orthanc /instances endpoint."""
    resp = requests.post(
        f"{ORTHANC_BASE}/instances",
        data=dicom_bytes,
        auth=ORTHANC_AUTH,
        headers={"Content-Type": "application/dicom"},
        timeout=15,
    )
    if resp.status_code not in (200, 409):
        raise RuntimeError(f"Upload failed ({resp.status_code}): {resp.text[:200]}")
    orthanc_id = resp.json().get("ID", "already-exists")
    print(f"  Uploaded {label}: {orthanc_id}")
    return orthanc_id


def main():
    print(f"Uploading test DICOM data to Orthanc at {ORTHANC_BASE}\n")
    for p in PATIENTS:
        print(f"Patient: {p['patient_name']} ({p['patient_id']})")
        sr_bytes, study_uid = build_echo_sr(p)
        upload_to_orthanc(sr_bytes, "Echo SR")
        us_bytes = build_us_image(p, study_uid)
        upload_to_orthanc(us_bytes, "US image")
        print(f"  Study UID: {study_uid}\n")
    print("Done. All patients uploaded.")


if __name__ == "__main__":
    main()
