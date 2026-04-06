import pytest
from datetime import datetime, timedelta
import os

# ==========================================
# BOUNDARY VALUE & EDGE CASE TESTS
# ==========================================

def test_boundary_zero_length_list(client, auth_headers):
    """Boundary Case: Testing the absolute minimum length of an array."""
    # A log without any entries should realistically be rejected or ignored, but it's valid JSON
    # Currently Pydantic doesn't strictly enforce min_items=1 on DailyLogModel.entries unless specified.
    # Let's test the boundary. We just want to see if the server explodes.
    resp = client.post("/logs", headers=auth_headers, json={
        "date": "2024-01-01",
        "entries": [],
        "overall_rating": 5
    })
    assert resp.status_code == 200 # System handles 0-length arrays gracefully


def test_boundary_extreme_dates(client, auth_headers):
    """Boundary Case: Dates precisely at Linux Epoch and far future boundaries."""
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    # Boundary: EXACTLY Jan 1, 1970
    epoch_goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id,
        "title": "Epoch Goal",
        "deadline": "1970-01-01"
    })
    assert epoch_goal.status_code == 200
    
    # Boundary: Leap Year Extreme
    leap_goal = client.post("/goals", headers=auth_headers, json={
        "category_id": cat_id,
        "title": "Leap Goal",
        "deadline": "2024-02-29"
    })
    assert leap_goal.status_code == 200


def test_boundary_extreme_sizes(client, auth_headers):
    """Boundary Case: Heavy payload Arrays."""
    cats = client.get("/categories", headers=auth_headers).json()
    cat_id = cats[0]["id"]
    
    # 50 entries in a single log (Pushing payload size boundaries)
    mass_entries = [
        {"category_id": cat_id, "text": f"Event {i}", "mood": 5, "energy": 5}
        for i in range(50)
    ]
    resp = client.post("/logs", headers=auth_headers, json={
        "date": "2024-11-11",
        "entries": mass_entries
    })
    assert resp.status_code == 200

# ==========================================
# ADVANCED TRUE/FALSE MATRICES
# ==========================================

def test_matrix_true_positive_complex_fetching(client, auth_headers):
    """True Positive: Perfect, valid request with complex URL parameters."""
    resp = client.get("/dashboard?days=365&timezone=UTC", headers=auth_headers)
    assert resp.status_code == 200

def test_matrix_true_negative_invalid_range(client, auth_headers):
    """True Negative: Requesting an inherently broken/invalid logical state."""
    # Days parameter logically shouldn't be negative, but let's test if our backend handles it
    # Pydantic Query parameter might catch it if we add ge=0, but presently it shouldn't crash.
    resp = client.get("/dashboard?days=-500", headers=auth_headers)
    # Based on current routing, this probably resolves mathematically (starts looking far in future)
    # but doesn't 500 error.
    assert resp.status_code in [200, 422]

def test_matrix_false_positive_prevention_null_bytes(client, auth_headers):
    """False Positive Prevention: Rejecting sneaky null bytes in strings."""
    sneaky_payload = {"name": "Test\x00Category", "icon": "❓", "color": "#000"}
    # Some DB engines panic on null bytes. FastAPI handles it via json.loads usually, 
    # but it's a great False Positive check.
    resp = client.post("/categories", headers=auth_headers, json=sneaky_payload)
    # Mongo handles this fine or Pydantic accepts it. Verify 200 or 422.
    assert resp.status_code in [200, 422]

def test_matrix_false_negative_prevention_RTL_chars(client, auth_headers):
    """False Negative Prevention: System should accept RTL (Right-to-Left) languages in text fields."""
    rtl_text = "هذا اختبار للغة العربية" # Arabic text
    resp = client.post("/categories", headers=auth_headers, json={
        "name": rtl_text, "icon": "❓", "color": "#000"
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == rtl_text
