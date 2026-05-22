"""
Generate synthetic Chest X-Ray DICOM images and push to Orthanc.
Creates one CXR study per patient with a realistic 512x512 grayscale image.

Run:
  python scripts/generate_cxr_test_data.py
"""
import io
import math
import datetime
import requests
import pydicom
from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
from pydicom.sequence import Sequence
from pydicom.uid import generate_uid, ExplicitVRLittleEndian

ORTHANC_BASE = "http://31.97.63.234:8042"
ORTHANC_AUTH = ("orthanc", "orthanc")

CR_SOP_CLASS = "1.2.840.10008.5.1.4.1.1.1"   # Computed Radiography Image

PATIENTS = [
    {"patient_id": "PT-2CD588",  "patient_name": "Ravi Kumar",         "dob": "19680315", "sex": "M", "accession": "CXR-RK-001"},
    {"patient_id": "PT-A3F1C2",  "patient_name": "Anitha Devi",        "dob": "19730914", "sex": "F", "accession": "CXR-AD-001"},
    {"patient_id": "PT-B7E4D1",  "patient_name": "Lakshmi Narayanan",  "dob": "19680219", "sex": "F", "accession": "CXR-LN-001"},
    {"patient_id": "PT-C9E3F2",  "patient_name": "Karthik Subramaniam","dob": "19880125", "sex": "M", "accession": "CXR-KS-001"},
    {"patient_id": "PT-D1A5B3",  "patient_name": "Suresh Babu",        "dob": "19580722", "sex": "M", "accession": "CXR-SB-001"},
]


def make_cxr_pixels(rows: int = 512, cols: int = 512) -> bytes:
    """Generate a synthetic PA chest X-ray pixel array (16-bit grayscale)."""
    pixels = []
    cx, cy = cols // 2, rows // 2

    for r in range(rows):
        for c in range(cols):
            # Background — dark
            val = 200

            # Lung fields — lighter oval regions
            left_lung  = ((c - cx + cols//5)**2) / (cols//5)**2 + ((r - cy)**2) / (rows//3)**2
            right_lung = ((c - cx - cols//5)**2) / (cols//5)**2 + ((r - cy)**2) / (rows//3)**2
            if left_lung < 1.0 or right_lung < 1.0:
                val = 3000

            # Cardiac silhouette — central oval
            heart = ((c - cx + 20)**2) / (80**2) + ((r - cy + 20)**2) / (100**2)
            if heart < 1.0:
                val = 800

            # Mediastinum strip
            if abs(c - cx) < 40:
                val = min(val, 900)

            # Ribs — subtle horizontal bands
            rib = math.sin((r / rows) * math.pi * 16)
            if rib > 0.85 and (left_lung < 1.2 or right_lung < 1.2):
                val = int(val * 0.85)

            # Diaphragm dome
            dome_y = cy + int(rows * 0.28 * (1 - ((c - cx)**2) / (cx**2)))
            if abs(r - dome_y) < 6:
                val = 600

            pixels.append(max(0, min(4095, val)))

    import struct
    return struct.pack(f"<{len(pixels)}H", *pixels)


def build_cxr(p: dict) -> bytes:
    rows, cols = 512, 512
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")
    sop_uid    = generate_uid()
    study_uid  = generate_uid()
    series_uid = generate_uid()

    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID    = CR_SOP_CLASS
    meta.MediaStorageSOPInstanceUID = sop_uid
    meta.TransferSyntaxUID          = ExplicitVRLittleEndian
    pydicom.dataset.validate_file_meta(meta, enforce_standard=True)

    ds = FileDataset(None, {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.is_implicit_VR   = False
    ds.is_little_endian = True

    # Patient
    ds.PatientName      = p["patient_name"].replace(" ", "^")
    ds.PatientID        = p["patient_id"]
    ds.PatientBirthDate = p["dob"]
    ds.PatientSex       = p["sex"]

    # Study
    ds.StudyInstanceUID  = study_uid
    ds.StudyDate         = date_str
    ds.StudyTime         = time_str
    ds.StudyDescription  = "Chest X-Ray PA"
    ds.AccessionNumber   = p["accession"]
    ds.ReferringPhysicianName = "Dr^Priya^Sharma"

    # Series
    ds.SeriesInstanceUID = series_uid
    ds.SeriesNumber      = "1"
    ds.SeriesDescription = "PA Chest"
    ds.Modality          = "CR"
    ds.BodyPartExamined  = "CHEST"

    # Instance
    ds.SOPClassUID       = CR_SOP_CLASS
    ds.SOPInstanceUID    = sop_uid
    ds.InstanceNumber    = "1"
    ds.ContentDate       = date_str
    ds.ContentTime       = time_str

    # Image
    ds.Rows                          = rows
    ds.Columns                       = cols
    ds.SamplesPerPixel               = 1
    ds.PhotometricInterpretation     = "MONOCHROME2"
    ds.BitsAllocated                 = 16
    ds.BitsStored                    = 12
    ds.HighBit                       = 11
    ds.PixelRepresentation           = 0
    ds.RescaleIntercept              = "0"
    ds.RescaleSlope                  = "1"
    ds.WindowCenter                  = "2000"
    ds.WindowWidth                   = "3500"
    ds.PixelData                     = make_cxr_pixels(rows, cols)

    buf = io.BytesIO()
    pydicom.dcmwrite(buf, ds)
    return buf.getvalue(), study_uid


def upload(dicom_bytes: bytes, label: str) -> str:
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
    print(f"Uploading CXR test data to Orthanc at {ORTHANC_BASE}\n")
    for p in PATIENTS:
        print(f"Patient: {p['patient_name']} ({p['patient_id']})")
        cxr_bytes, study_uid = build_cxr(p)
        upload(cxr_bytes, "CXR")
        print(f"  Study UID: {study_uid}\n")
    print("Done.")


if __name__ == "__main__":
    main()
