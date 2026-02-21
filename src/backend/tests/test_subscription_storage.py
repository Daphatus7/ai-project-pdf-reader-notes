"""
Unit tests for subscription-related SupabaseStorage methods.

Focuses on:
- downgrade_to_free  (including the bug fix: user_usages must use user_id)
- update_profile_stripe
- get_subscription_status
- get_stripe_customer_id

Run:  pytest src/backend/tests/test_subscription_storage.py -v
"""
from unittest.mock import MagicMock, patch

import pytest

from src.backend.services.storage.supabase_storage import SupabaseStorage


# ── Fixture ───────────────────────────────────────────────────────────────────

@pytest.fixture
def storage():
    """Return a SupabaseStorage instance with a mocked internal DB client."""
    s = SupabaseStorage()
    db = MagicMock()
    s._SupabaseStorage__database = db  # inject via name-mangled attribute
    return s, db


def _make_table_router(profiles_data, usages_data=None):
    """
    Return a side_effect function for db.table() that routes calls to
    separate mock chains depending on the table name.
    Also tracks which field was passed to .eq() for each table.
    """
    eq_calls = []

    class _Chain:
        def __init__(self, data):
            self._data = data

        def eq(self, field, value):
            eq_calls.append((field, value))
            m = MagicMock()
            m.execute.return_value = MagicMock(data=self._data)
            return m

    def _side_effect(name):
        m = MagicMock()
        if name == "profiles":
            m.update.return_value = _Chain(profiles_data)
            m.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=profiles_data
            )
        else:  # user_usages
            m.update.return_value = _Chain(usages_data or [])
        return m

    return _side_effect, eq_calls


# ── downgrade_to_free ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_downgrade_to_free_uses_user_id_not_stripe_customer_id(storage):
    """
    Core bug-fix regression:
    user_usages.update().eq() must receive ('user_id', ...) not ('stripe_customer_id', ...).
    """
    s, db = storage
    user_id = "user-abc-123"
    stripe_customer_id = "cus_xyz"

    side_effect, eq_calls = _make_table_router(
        profiles_data=[{"id": user_id}],
        usages_data=[],
    )
    db.table.side_effect = side_effect

    with patch(
        "src.backend.services.storage.supabase_storage.get_plan_quotas",
        return_value={"max_projects": 2, "max_documents": 5, "max_notes": 10, "max_tokens": 50000},
    ):
        await s.downgrade_to_free(stripe_customer_id)

    # profiles eq: keyed by stripe_customer_id
    assert eq_calls[0] == ("stripe_customer_id", stripe_customer_id)
    # user_usages eq: keyed by user_id  ← this is what the bug-fix ensures
    assert eq_calls[1] == ("user_id", user_id)


@pytest.mark.asyncio
async def test_downgrade_to_free_no_profile_skips_usage_update(storage):
    """When profiles returns no rows, user_usages must not be touched at all."""
    s, db = storage

    side_effect, _ = _make_table_router(profiles_data=[])  # no profile
    db.table.side_effect = side_effect

    with patch(
        "src.backend.services.storage.supabase_storage.get_plan_quotas",
        return_value={"max_projects": 2, "max_documents": 5, "max_notes": 10, "max_tokens": 50000},
    ):
        await s.downgrade_to_free("cus_ghost")

    # Only one table call (profiles), user_usages was never touched
    table_names = [call.args[0] for call in db.table.call_args_list]
    assert table_names == ["profiles"]


@pytest.mark.asyncio
async def test_downgrade_to_free_resets_correct_plan_fields(storage):
    """profiles update payload must reset subscription to free state."""
    s, db = storage

    captured_update_payload = {}

    class _CapturingChain:
        def update(self, fields):
            captured_update_payload.update(fields)

            class _Eq:
                def eq(self_, field, value):
                    m = MagicMock()
                    m.execute.return_value = MagicMock(data=[{"id": "user-1"}])
                    return m

            return _Eq()

    def _side_effect(name):
        m = MagicMock()
        if name == "profiles":
            return _CapturingChain()
        # user_usages: simple chain
        m.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        return m

    db.table.side_effect = _side_effect

    with patch(
        "src.backend.services.storage.supabase_storage.get_plan_quotas",
        return_value={"max_projects": 2, "max_documents": 5, "max_notes": 10, "max_tokens": 50000},
    ):
        await s.downgrade_to_free("cus_abc")

    assert captured_update_payload["plan"] == "free"
    assert captured_update_payload["subscription_status"] == "canceled"
    assert captured_update_payload["stripe_subscription_id"] is None
    assert captured_update_payload["cancel_at_period_end"] is False
    assert captured_update_payload["current_period_end"] is None
    # stripe_customer_id is NOT in the update — it must be preserved
    assert "stripe_customer_id" not in captured_update_payload


# ── update_profile_stripe ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_profile_stripe_passes_kwargs(storage):
    s, db = storage
    db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    await s.update_profile_stripe("user-123", plan="pro", subscription_status="active")

    db.table.assert_called_with("profiles")
    db.table.return_value.update.assert_called_once_with(
        {"plan": "pro", "subscription_status": "active"}
    )
    db.table.return_value.update.return_value.eq.assert_called_once_with("id", "user-123")


# ── get_subscription_status ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_subscription_status_returns_data(storage):
    s, db = storage
    row = {
        "plan": "pro",
        "subscription_status": "active",
        "plan_interval": "month",
        "current_period_end": "2026-03-01T00:00:00",
        "cancel_at_period_end": False,
    }
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[row]
    )

    result = await s.get_subscription_status("user-123")
    assert result["plan"] == "pro"
    assert result["cancel_at_period_end"] is False


@pytest.mark.asyncio
async def test_get_subscription_status_no_row_returns_empty(storage):
    s, db = storage
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )
    result = await s.get_subscription_status("user-ghost")
    assert result == {}


# ── get_stripe_customer_id ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_stripe_customer_id_found(storage):
    s, db = storage
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"stripe_customer_id": "cus_abc"}]
    )
    result = await s.get_stripe_customer_id("user-123")
    assert result == "cus_abc"


@pytest.mark.asyncio
async def test_get_stripe_customer_id_not_found_returns_none(storage):
    s, db = storage
    db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )
    result = await s.get_stripe_customer_id("user-ghost")
    assert result is None
