import requests


def reverse_geocode(latitude, longitude):
    """Free reverse geocoding using OpenStreetMap Nominatim (no API key needed)."""
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": latitude, "lon": longitude, "format": "json"},
            headers={"User-Agent": "CareConnect-App"},
            timeout=5,
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("display_name", "")
    except Exception:
        pass
    return ""