from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class Authority(BaseModel):
    slug: str
    name: str
    short_name: str
    base_url: str
    logo_letter: str
    badge_color: str
    sso_type: str  # google, ms, credentials, token
    sso_hint: Optional[str] = None
    is_mock: bool = False


# Supported University & Institution Authorities
AUTHORITIES_REGISTRY: Dict[str, Authority] = {
    "ucu": Authority(
        slug="ucu",
        name="Ukrainian Catholic University",
        short_name="UCU Moodle",
        base_url="https://learn.ucu.edu.ua",
        logo_letter="U",
        badge_color="blue",
        sso_type="google",
        sso_hint="UCU uses Google Single Sign-On. Use the Browser Cookie tab to connect in seconds.",
        is_mock=False,
    ),
    "kpi": Authority(
        slug="kpi",
        name="Kyiv Polytechnic Institute (KPI)",
        short_name="KPI Moodle",
        base_url="https://do.ipo.kpi.ua",
        logo_letter="K",
        badge_color="emerald",
        sso_type="credentials",
        sso_hint="Login with your KPI institute credentials or MoodleSession cookie.",
        is_mock=False,
    ),
    "lnu": Authority(
        slug="lnu",
        name="Ivan Franko National University of Lviv",
        short_name="LNU e-Learning",
        base_url="https://e-learning.lnu.edu.ua",
        logo_letter="L",
        badge_color="amber",
        sso_type="credentials",
        sso_hint="Login with your LNU student credentials or active browser cookie.",
        is_mock=False,
    ),
    "vntu": Authority(
        slug="vntu",
        name="Vinnytsia National Technical University",
        short_name="VNTU Moodle",
        base_url="https://moodle.vntu.edu.ua",
        logo_letter="V",
        badge_color="indigo",
        sso_type="credentials",
        sso_hint="Login with your JetIQ / VNTU account credentials.",
        is_mock=False,
    ),
    "demo": Authority(
        slug="demo",
        name="Sandbox Demo Academy",
        short_name="Demo Sandbox",
        base_url="https://school.moodledemo.net",
        logo_letter="D",
        badge_color="purple",
        sso_type="credentials",
        sso_hint="Instant demo environment. Pre-filled with mock student courses.",
        is_mock=True,
    ),
}


def get_authority(slug: str) -> Optional[Authority]:
    """Retrieve authority configuration by slug (case-insensitive)."""
    return AUTHORITIES_REGISTRY.get(slug.lower().strip())


def list_authorities() -> List[Authority]:
    """List all configured university authorities."""
    return list(AUTHORITIES_REGISTRY.values())
