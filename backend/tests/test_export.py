import io
import json
import zipfile
from core.database import db
from utils.user_data import USER_DATA_COLLECTIONS
from api.routers.export import COLLECTIONS


def _uid(test_user_data):
    return str(db.users.find_one({"email": test_user_data["email"]})["_id"])


def test_export_covers_every_user_data_collection():
    # Anything account deletion wipes must also be exportable
    assert set(USER_DATA_COLLECTIONS) <= set(COLLECTIONS)


def test_export_requires_login(client):
    assert client.get("/export/all").status_code == 401


def test_export_includes_lotus_reviews_and_checkins(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.lotus.insert_one({"user_id": uid, "title": "Career blossom"})
    db.reviews.insert_one({"user_id": uid, "period_label": "Week of Oct 12", "wins": "Shipped search"})
    db.task_checkins.insert_one({"user_id": uid, "title": "Morning run"})

    res = client.get("/export/all", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert [d["title"] for d in data["lotus"]] == ["Career blossom"]
    assert [d["wins"] for d in data["reviews"]] == ["Shipped search"]
    assert [d["title"] for d in data["task_checkins"]] == ["Morning run"]


def test_export_profile_hides_account_secrets(client, auth_headers, test_user_data):
    uid = _uid(test_user_data)
    db.users.update_one({"email": test_user_data["email"]}, {"$set": {
        "verification_token": "secret-verify",
        "password_reset_token_hash": "secret-hash",
        "password_reset_expires": "2030-01-01",
    }})

    profile = client.get("/export/all", headers=auth_headers).json()["profile"]
    assert profile["email"] == test_user_data["email"]
    for field in ("password", "token_version", "verification_token", "verification_token_expires",
                  "password_reset_token_hash", "password_reset_expires", "password_reset_sent_at"):
        assert field not in profile
    assert profile["_id"] == uid


def test_export_does_not_include_other_users_data(client, auth_headers, other_user_headers, test_user_data):
    db.lotus.insert_one({"user_id": _uid(test_user_data), "title": "Mine only"})

    data = client.get("/export/all", headers=other_user_headers).json()
    assert all(d["title"] != "Mine only" for d in data.get("lotus", []))


def test_export_zip_has_csv_per_collection(client, auth_headers, test_user_data):
    db.reviews.insert_one({"user_id": _uid(test_user_data), "period_label": "Week 1"})

    res = client.get("/export/all/zip", headers=auth_headers)
    assert res.status_code == 200
    names = zipfile.ZipFile(io.BytesIO(res.content)).namelist()
    assert "growthlog_export.json" in names
    assert "csv/reviews.csv" in names


def test_export_single_collection(client, auth_headers, test_user_data):
    db.lotus.insert_one({"user_id": _uid(test_user_data), "title": "Solo"})

    res = client.get("/export/collection/lotus", headers=auth_headers)
    assert res.status_code == 200
    assert [d["title"] for d in json.loads(res.content)] == ["Solo"]
    assert client.get("/export/collection/users", headers=auth_headers).status_code == 404
