def test_health_contract(client) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "1.0.0"
    assert payload["status"] == "ok"
    assert payload["service"] == "desktop-companion-agent-backend"


def test_legacy_health_alias(client) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
