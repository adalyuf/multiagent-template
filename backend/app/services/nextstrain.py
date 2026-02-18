import httpx
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.database import async_session
from app.models import GenomicSequence

logger = logging.getLogger(__name__)

NEXTSTRAIN_URL = "https://nextstrain.org/charon/getDataset?prefix=/flu/seasonal/h3n2/ha/12y"

# Mapping of Nextstrain country names to ISO 2-letter country codes
# Nextstrain uses various formats: full names (United States), abbreviations (USA), or ISO codes
COUNTRY_CODE_MAP = {
    "UNITED STATES": "US",
    "USA": "US",
    "UNITEDSTATES": "US",
    "UNITED KINGDOM": "GB",
    "UK": "GB",
    "UNITEDKINGDOM": "GB",
    "GB": "GB",
    "AUSTRALIA": "AU",
    "CANADA": "CA",
    "CHINA": "CN",
    "JAPAN": "JP",
    "FRANCE": "FR",
    "GERMANY": "DE",
    "ITALY": "IT",
    "SPAIN": "ES",
    "NETHERLANDS": "NL",
    "BELGIUM": "BE",
    "SWITZERLAND": "CH",
    "SWEDEN": "SE",
    "NORWAY": "NO",
    "DENMARK": "DK",
    "FINLAND": "FI",
    "IRELAND": "IE",
    "SCOTLAND": "GB",
    "WALES": "GB",
    "ENGLAND": "GB",
    "NEW ZEALAND": "NZ",
    "NEWZEALAND": "NZ",
    "SOUTH KOREA": "KR",
    "KOREA": "KR",
    "SOUTHAFRICA": "ZA",
    "SOUTH AFRICA": "ZA",
    "RUSSIA": "RU",
    "RUSSIAN FEDERATION": "RU",
    "BRAZIL": "BR",
    "MEXICO": "MX",
    "ARGENTINA": "AR",
    "CHILE": "CL",
    "COLOMBIA": "CO",
    "PERU": "PE",
    "GUYANA": "GY",
    "SURINAME": "SR",
    "PARAGUAY": "PY",
    "URUGUAY": "UY",
    "VENEZUELA": "VE",
    "COSTA RICA": "CR",
    "EGYPT": "EG",
    "ISRAEL": "IL",
    "TURKEY": "TR",
    "GREECE": "GR",
    "PORTUGAL": "PT",
    "AUSTRIA": "AT",
    "POLAND": "PL",
    "CZECH REPUBLIC": "CZ",
    "CZECHIA": "CZ",
    "HUNGARY": "HU",
    "ROMANIA": "RO",
    "INDIA": "IN",
    "THAILAND": "TH",
    "VIETNAM": "VN",
    "SINGAPORE": "SG",
    "MALAYSIA": "MY",
    "INDONESIA": "ID",
    "PHILIPPINES": "PH",
    "TAIWAN": "TW",
    "HONG KONG": "HK",
    "KENYA": "KE",
    "NIGERIA": "NG",
    "NIGER": "NE",
    "GHANA": "GH",
    "SENEGAL": "SN",
    "MADAGASCAR": "MG",
    "MOROCCO": "MA",
    "TUNISIA": "TN",
    "TOGO": "TG",
    "BURKINA FASO": "BF",
    "CAMEROON": "CM",
    "ZAMBIA": "ZM",
    "SOUTH SUDAN": "SS",
    "MAURITIUS": "MU",
    "SAUDI ARABIA": "SA",
    "UNITED ARAB EMIRATES": "AE",
    "UAE": "AE",
    "QATAR": "QA",
    "KUWAIT": "KW",
    "BAHRAIN": "BH",
    "OMAN": "OM",
    "JORDAN": "JO",
    "LEBANON": "LB",
    "SYRIA": "SY",
    "IRAQ": "IQ",
    "IRAN": "IR",
    "PAKISTAN": "PK",
    "BANGLADESH": "BD",
    "SRI LANKA": "LK",
    "NEPAL": "NP",
    "BHUTAN": "BT",
    "MALDIVES": "MV",
    "MYANMAR": "MM",
    "CAMBODIA": "KH",
    "LAOS": "LA",
    "EAST TIMOR": "TL",
    "TIMOR-LESTE": "TL",
    "MONGOLIA": "MN",
    "KAZAKHSTAN": "KZ",
    "UZBEKISTAN": "UZ",
    "GEORGIA": "GE",
    "ARMENIA": "AM",
    "AZERBAIJAN": "AZ",
    "UKRAINE": "UA",
    "BELARUS": "BY",
    "MOLDOVA": "MD",
    "ESTONIA": "EE",
    "LATVIA": "LV",
    "LITHUANIA": "LT",
    "SERBIA": "RS",
    "CROATIA": "HR",
    "SLOVENIA": "SI",
    "SLOVAKIA": "SK",
    "BULGARIA": "BG",
    "ALBANIA": "AL",
    "MACEDONIA": "MK",
    "MONTENEGRO": "ME",
    "BOSNIA": "BA",
    "BOSNIA HERZEGOVINA": "BA",
    "BOSNIA AND HERZEGOVINA": "BA",
    "ICELAND": "IS",
    "LUXEMBOURG": "LU",
    "MALTA": "MT",
    "CYPRUS": "CY",
    "CANARY ISLANDS": "ES",
    "REUNION": "FR",
    "GUADELOUPE": "GP",
    "MARTINIQUE": "MQ",
    "FRENCH GUIANA": "GF",
    "NEW CALEDONIA": "NC",
    "FRENCH POLYNESIA": "PF",
    "BERMUDA": "BM",
    "PUERTO RICO": "PR",
    "COTE D IVOIRE": "CI",
    "COTE DIVOIRE": "CI",
    "IVORY COAST": "CI",
    "SAINT VINCENT AND THE GRENADINES": "VC",
    "HAWAII": "US",
    "ALASKA": "US",
}


def normalize_country_code(country: str) -> str | None:
    """
    Normalize Nextstrain country value to ISO 2-letter country code.

    Returns None for unrecognized countries so callers can skip them.
    """
    if not country:
        return None

    normalized = country.upper().strip()

    if normalized in COUNTRY_CODE_MAP:
        return COUNTRY_CODE_MAP[normalized]

    # Already a 2-letter ISO code
    if len(normalized) == 2 and normalized.isalpha():
        return normalized

    logger.warning("Unknown Nextstrain country: %s", country)
    return None


async def fetch_nextstrain():
    """Fetch genomic data from Nextstrain."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.get(NEXTSTRAIN_URL, headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()

    tree = data.get("tree", {})
    meta = data.get("meta", {})

    records = []
    _walk_tree(tree, records)
    logger.info(f"Parsed {len(records)} genomic sequences from Nextstrain")
    return records


def _walk_tree(node: dict, records: list):
    """Recursively walk Nextstrain tree to extract sequences."""
    attrs = node.get("node_attrs", {})
    country_val = attrs.get("country", {}).get("value", "")
    clade = attrs.get("clade_membership", {}).get("value", "") or attrs.get("subclade", {}).get("value", "")
    num_date = attrs.get("num_date", {}).get("value")

    if country_val and clade and num_date:
        try:
            code = normalize_country_code(country_val)
            if code is None:
                pass  # skip unrecognized countries
            else:
                year = int(num_date)
                frac = num_date - year
                date_val = datetime(year, 1, 1) + __import__("datetime").timedelta(days=frac * 365.25)
                records.append({
                    "country_code": code,
                    "clade": clade,
                    "lineage": "",
                    "collection_date": date_val.date(),
                    "count": 1,
                })
        except (ValueError, TypeError):
            pass

    for child in node.get("children", []):
        _walk_tree(child, records)


async def ingest_nextstrain():
    """Fetch and upsert Nextstrain data."""
    try:
        records = await fetch_nextstrain()
        if not records:
            return

        async with async_session() as session:
            for i in range(0, len(records), 1000):
                batch = records[i:i + 1000]
                stmt = pg_insert(GenomicSequence).values(batch)
                stmt = stmt.on_conflict_do_nothing(constraint="uq_genomic_seq")
                await session.execute(stmt)
            await session.commit()
            logger.info(f"Ingested {len(records)} genomic sequences")
    except Exception:
        logger.exception("Nextstrain ingestion failed")
