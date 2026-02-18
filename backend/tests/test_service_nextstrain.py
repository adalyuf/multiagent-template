from datetime import date

import pytest

from app.services.nextstrain import normalize_country_code, _walk_tree


# --- normalize_country_code tests ---

@pytest.mark.parametrize("input_val,expected", [
    ("United States", "US"),
    ("USA", "US"),
    ("UNITEDSTATES", "US"),
    ("united kingdom", "GB"),
    ("UK", "GB"),
    ("England", "GB"),
    ("Australia", "AU"),
    ("Japan", "JP"),
    ("South Korea", "KR"),
    ("Czech Republic", "CZ"),
    ("Czechia", "CZ"),
    ("Niger", "NE"),
    ("Togo", "TG"),
    ("Cote D Ivoire", "CI"),
    ("Guyana", "GY"),
    ("South Sudan", "SS"),
    ("Suriname", "SR"),
    ("Maldives", "MV"),
    ("Bhutan", "BT"),
    ("Zambia", "ZM"),
    ("East Timor", "TL"),
    ("Mauritius", "MU"),
    ("Paraguay", "PY"),
    ("Cameroon", "CM"),
    ("Uruguay", "UY"),
    ("Burkina Faso", "BF"),
    ("Saint Vincent And The Grenadines", "VC"),
    ("Costa Rica", "CR"),
    ("Venezuela", "VE"),
    ("Bosnia Herzegovina", "BA"),
])
def test_normalize_known_countries(input_val, expected):
    assert normalize_country_code(input_val) == expected


def test_normalize_two_letter_iso_passthrough():
    assert normalize_country_code("FR") == "FR"
    assert normalize_country_code("de") == "DE"


def test_normalize_unknown_country_returns_none():
    assert normalize_country_code("Atlantis") is None
    assert normalize_country_code("XYZLAND") is None


def test_normalize_empty_or_none():
    assert normalize_country_code("") is None
    assert normalize_country_code(None) is None


def test_normalize_strips_whitespace():
    assert normalize_country_code("  Canada  ") == "CA"


# --- _walk_tree tests ---

def test_walk_tree_collects_valid_nodes_recursively():
    tree = {
        "node_attrs": {
            "country": {"value": "United States"},
            "clade_membership": {"value": "2a.3a.1"},
            "num_date": {"value": 2024.0},
        },
        "children": [
            {
                "node_attrs": {
                    "country": {"value": "GB"},
                    "subclade": {"value": "2a.3"},
                    "num_date": {"value": 2023.0},
                },
                "children": [],
            },
            {
                # Missing clade -> ignored
                "node_attrs": {
                    "country": {"value": "CA"},
                    "num_date": {"value": 2022.0},
                },
                "children": [],
            },
        ],
    }

    records = []
    _walk_tree(tree, records)

    assert len(records) == 2

    first, second = records
    assert first["country_code"] == "US"
    assert first["clade"] == "2a.3a.1"
    assert first["collection_date"] == date(2024, 1, 1)

    assert second["country_code"] == "GB"
    assert second["clade"] == "2a.3"  # falls back to subclade
    assert second["collection_date"] == date(2023, 1, 1)


def test_walk_tree_skips_unknown_country():
    tree = {
        "node_attrs": {
            "country": {"value": "Atlantis"},
            "clade_membership": {"value": "2a"},
            "num_date": {"value": 2024.0},
        },
        "children": [],
    }

    records = []
    _walk_tree(tree, records)

    assert records == []


def test_walk_tree_skips_invalid_num_date():
    tree = {
        "node_attrs": {
            "country": {"value": "US"},
            "clade_membership": {"value": "2a"},
            "num_date": {"value": "not-a-number"},
        }
    }

    records = []
    _walk_tree(tree, records)

    assert records == []
