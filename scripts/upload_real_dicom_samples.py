"""
Download real DICOM sample files from pydicom's GitHub test data and upload to Orthanc.
These are actual DICOM files (CT, CXR) used for DICOM standard compliance testing.
"""
import io
import requests
import pydicom
from pydicom.dataset import Dataset, FileDataset, FileMetaDataset
from pydicom.sequence import Sequence
from pydicom.uid import generate_uid, ExplicitVRLittleEndian

ORTHANC_BASE = "http://31.97.63.234:8042"
ORTHANC_AUTH = ("orthanc", "orthanc")

# Real DICOM test files from pydicom GitHub (public domain / test data)
PYDICOM_RAW = "https://github.com/pydicom/pydicom/raw/main/pydicom/data/test_files"

SAMPLES = [
    {
        "url": f"{PYDICOM_RAW}/CT_small.dcm",
        "label": "CT Small (real CT scan)",
        "patient_id": "PT-C9E3F2",
        "patient_name": "Karthik^Subramaniam",
    },
    {
        "url": f"{PYDICOM_RAW}/chest_dxm.dcm",
        "label": "Chest DXM (real CXR)",
        "patient_id": "PT-D1A5B3",
        "patient_name": "Suresh^Babu",
    },
    {
        "url": f"{PYDICOM_RAW}/MR_small.dcm",
        "label": "MR Small (real MRI)",
        "patient_id": "PT-2CD588",
        "patient_name": "Ravi^Kumar",
    },
]


def patch_patient_info(dcm_bytes: bytes, patient_id: str, patient_name: str) -> bytes:
    """Load DICOM, patch patient identifiers, return modified bytes."""
    ds = pydicom.dcmread(io.BytesIO(dcm_bytes), force=True)
    ds.PatientID = patient_id
    ds.PatientName = patient_name
    # Generate new study/series UIDs so it's a distinct study in Orthanc
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.SOPInstanceUID = generate_uid()
    if hasattr(ds, 'file_meta') and ds.file_meta:
        ds.file_meta.MediaStorageSOPInstanceUID = ds.SOPInstanceUID
    buf = io.BytesIO()
    pydicom.dcmwrite(buf, ds)
    return buf.getvalue()


def upload(dicom_bytes: bytes, label: str):
    resp = requests.post(
        f"{ORTHANC_BASE}/instances",
        data=dicom_bytes,
        auth=ORTHANC_AUTH,
        headers={"Content-Type": "application/dicom"},
        timeout=30,
    )
    if resp.status_code not in (200, 409):
        raise RuntimeError(f"Upload failed ({resp.status_code}): {resp.text[:300]}")
    result = resp.json()
    print(f"  Uploaded {label}: ID={result.get('ID', '?')} Status={result.get('Status', '?')}")
    return result


def main():
    print(f"Downloading and uploading real DICOM samples to Orthanc at {ORTHANC_BASE}\n")
    for s in SAMPLES:
        print(f"Downloading: {s['label']}")
        try:
            r = requests.get(s["url"], timeout=30)
            if r.status_code != 200:
                print(f"  FAILED to download: HTTP {r.status_code}")
                continue
            print(f"  Downloaded {len(r.content):,} bytes")
            patched = patch_patient_info(r.content, s["patient_id"], s["patient_name"])
            upload(patched, s["label"])
        except Exception as e:
            print(f"  ERROR: {e}")
        print()
    print("Done.")


if __name__ == "__main__":
    main()
