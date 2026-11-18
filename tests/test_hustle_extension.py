import io
import json
from zipfile import ZipFile
from fastapi.testclient import TestClient
from app.main import app
from app.config import get_settings
from app.routers.hustle_extension import PUBLIC_FILES


def test_extension_archive_is_self_contained_and_public_only():
    client = TestClient(app)
    response = client.get('/api/hustle/extension.zip')
    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/zip'
    assert 'Hustle-extension.zip' in response.headers['content-disposition']
    with ZipFile(io.BytesIO(response.content)) as archive:
        files = set(archive.namelist())
        assert files == {f'Hustle/{name}' for name in PUBLIC_FILES} | {'Hustle/manifest.json', 'Hustle/hustle-config.js', 'Hustle/INSTALL.txt'}
        manifest = json.loads(archive.read('Hustle/manifest.json'))
        for script in manifest['content_scripts']:
            for name in script['js']:
                assert f'Hustle/{name}' in files
        assert f"Hustle/{manifest['background']['service_worker']}" in files
        assert f"Hustle/{manifest['action']['default_popup']}" in files
        assert b'SECRET_KEY' not in archive.read('Hustle/hustle-config.js')
        assert '<all_urls>' not in manifest['host_permissions']


def test_package_uses_configured_origin_not_request_host(monkeypatch):
    monkeypatch.setattr(get_settings(), 'HUSTLE_PUBLIC_ORIGIN', 'https://study.example.edu')
    client = TestClient(app)
    response = client.get('/api/hustle/extension.zip', headers={'host':'untrusted.example'})
    with ZipFile(io.BytesIO(response.content)) as archive:
        manifest = json.loads(archive.read('Hustle/manifest.json'))
        bridge = next(s for s in manifest['content_scripts'] if 'hustle-bridge.js' in s['js'])
        assert 'https://study.example.edu/hustle/*' in bridge['matches']
        assert b'untrusted.example' not in archive.read('Hustle/hustle-config.js')
        assert 'https://study.example.edu/*' in manifest['host_permissions']


def test_store_listing_and_invalid_configuration(monkeypatch):
    client = TestClient(app)
    settings = get_settings()
    monkeypatch.setattr(settings, 'HUSTLE_EXTENSION_STORE_URL', 'https://chromewebstore.google.com/detail/hustle/abcdef')
    assert client.get('/api/hustle/extension').json()['store_url'].endswith('/abcdef')
    monkeypatch.setattr(settings, 'HUSTLE_EXTENSION_STORE_URL', 'https://bad.example/detail/fake')
    assert client.get('/api/hustle/extension').status_code == 503
    monkeypatch.setattr(settings, 'HUSTLE_PUBLIC_ORIGIN', 'http://remote.example')
    assert client.get('/api/hustle/extension.zip').status_code == 503


def test_connect_page_keeps_token_as_secondary_option():
    page = TestClient(app).get('/hustle/connect.html')
    assert page.status_code == 200
    assert '/api/hustle/extension.zip' in page.text
    assert '<details class="manual-connection">' in page.text
