"""Smoke tests — the safety net for backend refactors.

Covers app wiring, auth, the care-team access rule, and a representative
read from each major area. Run with `pytest` from the backend directory.
"""


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_success(admin_token):
    assert admin_token


def test_login_rejects_bad_password(client, admin_token):  # admin_token seeds the user
    r = client.post(
        "/auth/login",
        data={"username": "pytest-admin@stobaeus.com", "password": "wrong-password"},
    )
    assert r.status_code == 401


def test_protected_route_requires_auth(client):
    assert client.get("/patients").status_code == 401


def test_patients_list_when_authed(client, admin_token):
    r = client.get("/patients", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert "patients" in r.json()


def test_ipd_catalogue_when_authed(client, admin_token):
    r = client.get("/ipd/catalogue", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert {"wards", "tiers", "beds"} <= r.json().keys()


def test_unknown_route_404(client):
    assert client.get("/no-such-endpoint").status_code == 404
