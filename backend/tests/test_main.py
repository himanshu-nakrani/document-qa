from httpx import AsyncClient


async def test_health_endpoint(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ready_endpoint(async_client: AsyncClient):
    response = await async_client.get("/ready")
    # since we initialized db in the db_setup fixture, it should be ready
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_non_existent_endpoint(async_client: AsyncClient):
    response = await async_client.get("/notfound")
    assert response.status_code == 404


async def test_cors_headers(async_client: AsyncClient):
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = await async_client.options("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
