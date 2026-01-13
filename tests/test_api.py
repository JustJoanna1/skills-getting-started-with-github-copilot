import pytest
import copy
from fastapi import status
from httpx import AsyncClient

import src.app as appmodule


@pytest.fixture(autouse=True)
def restore_activities():
    # Backup the in-memory activities and restore after each test to keep tests isolated
    backup = copy.deepcopy(appmodule.activities)
    yield
    appmodule.activities.clear()
    appmodule.activities.update(backup)


@pytest.mark.asyncio
async def test_get_activities_returns_activities():
    async with AsyncClient(app=appmodule.app, base_url="http://test") as client:
        r = await client.get("/activities")
        assert r.status_code == status.HTTP_200_OK
        data = r.json()
        assert isinstance(data, dict)
        # Expect some known activity keys to exist
        assert "Chess Club" in data
        assert "participants" in data["Chess Club"]


@pytest.mark.asyncio
async def test_signup_adds_participant():
    email = "unittest1@example.com"
    async with AsyncClient(app=appmodule.app, base_url="http://test") as client:
        r = await client.post(f"/activities/{"Chess Club"}/signup?email={email}")
        assert r.status_code == status.HTTP_200_OK
        # verify participant now present
        r2 = await client.get("/activities")
        participants = r2.json()["Chess Club"]["participants"]
        assert email in participants


@pytest.mark.asyncio
async def test_signup_duplicate_returns_400():
    email = "unittest2@example.com"
    async with AsyncClient(app=appmodule.app, base_url="http://test") as client:
        r1 = await client.post(f"/activities/{"Chess Club"}/signup?email={email}")
        assert r1.status_code == status.HTTP_200_OK
        r2 = await client.post(f"/activities/{"Chess Club"}/signup?email={email}")
        assert r2.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_remove_participant():
    email = "unittest3@example.com"
    async with AsyncClient(app=appmodule.app, base_url="http://test") as client:
        # add
        r1 = await client.post(f"/activities/{"Chess Club"}/signup?email={email}")
        assert r1.status_code == status.HTTP_200_OK
        # remove
        r2 = await client.delete(f"/activities/{"Chess Club"}/participants/{email}")
        assert r2.status_code == status.HTTP_200_OK
        # verify removed
        r3 = await client.get("/activities")
        participants = r3.json()["Chess Club"]["participants"]
        assert email not in participants


@pytest.mark.asyncio
async def test_remove_nonexistent_returns_404():
    email = "doesnotexist@example.com"
    async with AsyncClient(app=appmodule.app, base_url="http://test") as client:
        r = await client.delete(f"/activities/{"Chess Club"}/participants/{email}")
        assert r.status_code == status.HTTP_404_NOT_FOUND
