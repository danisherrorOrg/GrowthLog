import pytest
from core.database import db

def test_thought_lifecycle(client, auth_headers):
    """Verify CRUD operations for thoughts and sentiment analysis."""
    # 1. Create (Positive Thought)
    thought_data = {
        "content": "I am feeling great today!"
    }
    resp = client.post("/thoughts", headers=auth_headers, json=thought_data)
    assert resp.status_code == 200
    thought_id = resp.json()["id"]
    assert resp.json()["content"] == thought_data["content"]
    assert "sentiment" in resp.json()
    assert resp.json()["sentiment"] == "Positive"

    # 2. Create (Negative Thought)
    thought_data_neg = {
        "content": "I am so tired and frustrated."
    }
    resp = client.post("/thoughts", headers=auth_headers, json=thought_data_neg)
    assert resp.status_code == 200
    assert resp.json()["sentiment"] == "Negative"

    # 3. List
    resp = client.get("/thoughts", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2
    assert any(t["id"] == thought_id for t in resp.json())

    # 4. Update (Edit Thought)
    update_data = {
        "content": "I am feeling amazing and happy!"
    }
    resp = client.put(f"/thoughts/{thought_id}", headers=auth_headers, json=update_data)
    assert resp.status_code == 200
    assert resp.json()["content"] == update_data["content"]
    assert resp.json()["sentiment"] == "Positive"

    # 4b. Update with Negative Sentiment
    update_data_neg = {
        "content": "This is terrible and I feel overwhelmed."
    }
    resp = client.put(f"/thoughts/{thought_id}", headers=auth_headers, json=update_data_neg)
    assert resp.status_code == 200
    assert resp.json()["sentiment"] == "Negative"

    # 5. Delete
    resp = client.delete(f"/thoughts/{thought_id}", headers=auth_headers)
    assert resp.status_code == 200
    
    # Verify gone
    resp = client.get("/thoughts", headers=auth_headers)
    assert not any(t["id"] == thought_id for t in resp.json())
