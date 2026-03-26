"""
Unit tests for app.services.slot_service — slot generation and pricing.
"""
from datetime import date, time
from decimal import Decimal

import pytest

from app.services.slot_service import _find_price, _get_day_type, _combine


# ── Helper function tests ────────────────────────────────────────────────────

def test_combine_date_and_time():
    d = date(2026, 3, 1)
    t = time(10, 0)
    result = _combine(d, t)
    assert result.date() == d
    assert result.time() == t


def test_get_day_type_weekday():
    # 2026-03-02 is a Monday
    assert _get_day_type(date(2026, 3, 2)) == "weekday"


def test_get_day_type_weekend():
    # 2026-03-01 is a Sunday
    assert _get_day_type(date(2026, 3, 1)) == "weekend"


# ── Pricing tests ────────────────────────────────────────────────────────────

class MockPricingRule:
    """Lightweight stand-in for PricingRule ORM model."""
    def __init__(self, start: time, end: time, price: Decimal, day_type_val: str):
        self.start_time = start
        self.end_time = end
        self.price = price
        self.day_type = type("DT", (), {"value": day_type_val})()  # mock enum


def test_find_price_uses_base_when_no_rules():
    base = Decimal("500.00")
    result = _find_price(time(10, 0), time(11, 0), [], "weekday", base)
    assert result == base


def test_find_price_matches_exact_day_type():
    rules = [
        MockPricingRule(time(6, 0), time(12, 0), Decimal("800.00"), "weekday"),
        MockPricingRule(time(6, 0), time(12, 0), Decimal("1200.00"), "weekend"),
    ]
    result = _find_price(time(10, 0), time(11, 0), rules, "weekend", Decimal("500.00"))
    assert result == Decimal("1200.00")


def test_find_price_falls_back_to_all():
    rules = [
        MockPricingRule(time(6, 0), time(22, 0), Decimal("700.00"), "all"),
    ]
    result = _find_price(time(10, 0), time(11, 0), rules, "weekday", Decimal("500.00"))
    assert result == Decimal("700.00")


def test_find_price_exact_day_type_beats_all():
    rules = [
        MockPricingRule(time(6, 0), time(22, 0), Decimal("700.00"), "all"),
        MockPricingRule(time(6, 0), time(22, 0), Decimal("900.00"), "weekday"),
    ]
    result = _find_price(time(10, 0), time(11, 0), rules, "weekday", Decimal("500.00"))
    assert result == Decimal("900.00")


def test_find_price_no_matching_time_range_uses_base():
    rules = [
        MockPricingRule(time(18, 0), time(22, 0), Decimal("1500.00"), "weekday"),
    ]
    # Morning slot doesn't overlap evening rule
    result = _find_price(time(10, 0), time(11, 0), rules, "weekday", Decimal("500.00"))
    assert result == Decimal("500.00")
