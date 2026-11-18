import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import get_settings
from app.services import workspace_store as ws
from app.services import build_queue as bq
from app.services.workspace_store import WorkspaceStore
from app.services.build_queue import DebouncedBuildQueue


@pytest.fixture
def context(tmp_path, monkeypatch):
    monkeypatch.setattr(get_settings(), 'MOODLE_MOCK_MODE', False)
    monkeypatch.setattr(get_settings(), 'GEMINI_API_KEY', '')
    store = WorkspaceStore(str(tmp_path / 'workspace.db'))
    queue = DebouncedBuildQueue()
    monkeypatch.setattr(ws, '_store_instance', store)
    monkeypatch.setattr(bq, '_build_queue', queue)
    monkeypatch.setattr('app.routers.workspace.get_workspace_store', lambda: store)
    yield TestClient(app), store
    queue.cancel_all()


def source_payload():
    return {'course_id': 612, 'course_name': 'Графи й дерева', 'authority': 'ucu',
            'moodle_url': 'https://learn.ucu.edu.ua', 'sections': [
                {'section_index': 1, 'title': 'Тема 1: Графи', 'modules': [
                    {'module_id': 101, 'name': 'Обхід графа', 'modname': 'resource', 'text_excerpt': 'Обхід графа в ширину використовує чергу.', 'url': 'https://learn.ucu.edu.ua/mod/resource/view.php?id=101'},
                    {'module_id': 111, 'name': 'Final Exam', 'modname': 'quiz'}]},
                {'section_index': 2, 'title': 'Тема 2: Дерева', 'modules': [
                    {'module_id': 102, 'name': 'Бінарні дерева', 'modname': 'resource', 'text_excerpt': 'Бінарне дерево має до двох дочірніх вузлів.'}]}]}


def test_live_preview_never_invents_mock_course(context):
    client, _ = context
    response = client.post('/api/workspace/courses/preview-structure', json={'course_id': 101})
    assert response.status_code == 400
    assert client.post('/api/workspace/courses/101/auto-cluster').status_code == 400
    assert client.get('/api/workspace/courses').json() == []


def test_append_preserves_course_notes_and_both_text_snapshots(context):
    client, store = context
    created = client.post('/api/workspace/courses/create-text', json={'title': 'Статистика', 'content_text': 'Середнє арифметичне — сума значень, поділена на кількість.', 'tools_config': {'flashcards': True}}).json()
    cid = created['course_id']
    before = client.get(f'/api/workspace/courses/{cid}').json()
    mix_id = before['topic_mixes'][0]['mix_id']
    client.patch(f'/api/workspace/mixes/{mix_id}/notes', json={'notes': 'Моя незамінна нотатка'})
    assert client.post('/api/workspace/courses/create-text', json={'course_id': cid, 'title': 'Статистика', 'topic_title': 'Медіана', 'content_text': 'Медіана — центральне значення впорядкованої вибірки.'}).status_code == 200
    after = client.get(f'/api/workspace/courses/{cid}').json()
    assert len(after['topic_mixes']) == 2
    assert after['tools_config']['flashcards'] is True
    assert after['topic_mixes'][0]['user_notes'] == 'Моя незамінна нотатка'
    owner = after['course']['owner_id']
    assert len(store.get_course_bundle(cid, owner)['snapshots']) == 2
    assert after['course']['title'] == 'Статистика'


def test_organization_keeps_notes_source_mixes_and_revisions(context):
    client, store = context
    client.post('/api/sync/extension', json=source_payload())
    before = client.get('/api/workspace/courses/612').json()
    ids = [m['mix_id'] for m in before['topic_mixes']]
    client.patch(f'/api/workspace/mixes/{ids[0]}/notes', json={'notes': 'BFS — черга'})
    payload = {'course_id': 612, 'title': 'Графи й дерева', 'topics': [
        {'topic_index': 1, 'title': 'Алгоритми обходу', 'summary': 'Графи', 'material_ids': [101]},
        {'topic_index': 2, 'title': 'Структури дерев', 'summary': 'Дерева', 'material_ids': [102]}]}
    for _ in range(2):
        assert client.post('/api/workspace/courses/confirm-structure', json=payload).status_code == 200
    after = client.get('/api/workspace/courses/612').json()
    assert [m['mix_id'] for m in after['topic_mixes']] == ids
    assert after['topic_mixes'][0]['user_notes'] == 'BFS — черга'
    assert [g['title'] for g in after['material_groups']] == ['Алгоритми обходу', 'Структури дерев']
    assert [[m['id'] for m in g['materials']] for g in after['material_groups']] == [[101], [102]]
    with store._connect() as conn:
        assert conn.execute('SELECT COUNT(*) FROM course_organization_versions').fetchone()[0] == 2
    stranger = TestClient(app)
    assert stranger.get('/api/workspace/courses/612').status_code == 404
    assert stranger.post('/api/workspace/courses/create-text', json={'course_id': 612, 'title': 'x', 'content_text': 'secret'}).status_code == 200
    assert client.get('/api/workspace/courses/612').json()['topic_mixes'][0]['user_notes'] == 'BFS — черга'


def test_append_to_moodle_keeps_source_and_survives_resync(context):
    client, _ = context
    payload = source_payload()
    assert client.post('/api/sync/extension', json=payload).status_code == 200
    assert client.post('/api/workspace/courses/create-text', json={'course_id': 612, 'title': 'Додаткова лекція', 'content_text': 'Збалансовані дерева мають логарифмічну висоту.'}).status_code == 200
    after = client.get('/api/workspace/courses/612').json()
    assert after['course']['source_type'] == 'moodle_extension'
    assert after['course']['authority'] == 'ucu'
    assert after['course']['moodle_url'] == payload['moodle_url']
    assert len(after['topic_mixes']) == 3
    assert client.post('/api/sync/extension', json=payload).status_code == 200
    after = client.get('/api/workspace/courses/612').json()
    assert len(after['topic_mixes']) == 3
    assert any(s.get('source_type') == 'manual_upload' for s in after['sections'])
    assert sum(len(g['materials']) for g in after['material_groups']) == 3


def test_preview_uses_imported_sources_without_session(context):
    client, _ = context
    client.post('/api/sync/extension', json=source_payload())
    response = client.post('/api/workspace/courses/preview-structure', json={'course_id': 612})
    assert response.status_code == 200
    assert response.json()['title'] == 'Графи й дерева'
    assert response.json()['topics']
    assert 'Exam' not in str(response.json()['topics'])


def test_structure_rejects_duplicate_topic_indices(context):
    client, _ = context
    res = client.post('/api/workspace/courses/confirm-structure', json={'course_id': 15, 'title': 'x', 'topics': [{'topic_index': 1, 'title': 'A', 'summary': ''}, {'topic_index': 1, 'title': 'B', 'summary': ''}]})
    assert res.status_code == 400


def test_video_transcription_supports_current_provider_objects(monkeypatch):
    from types import SimpleNamespace
    from app.services import video_transcriber as vt
    class Transcript:
        language_code = 'uk'
        is_generated = False
        def fetch(self):
            return [SimpleNamespace(text='Черга для пошуку в ширину.', start=62.0)]
    class Transcripts:
        def find_transcript(self, languages):
            assert languages[0] == 'uk'
            return Transcript()
    class Provider:
        def list(self, video_id):
            assert video_id == '12345678901'
            return Transcripts()
    monkeypatch.setattr(vt, 'YouTubeTranscriptApi', Provider)
    monkeypatch.setattr(vt, 'YOUTUBE_TRANSCRIPT_AVAILABLE', True)
    result = vt.VideoTranscriberService.get_youtube_transcript('https://youtu.be/12345678901')
    assert result['segments'][0]['timestamp'] == '01:02'
    assert result['full_text'] == 'Черга для пошуку в ширину.'


def test_file_archive_is_private_and_contains_only_current_result(context, tmp_path, monkeypatch):
    from pathlib import Path
    import io
    import zipfile
    from app.routers.courses import _private_file_dir
    from app.services.moodle_client import MoodleClient
    client, _ = context
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(get_settings(), 'MOODLE_MOCK_MODE', True)
    assert client.post('/api/auth/login', json={'token': 'mock_token', 'moodle_url': 'https://learn.ucu.edu.ua'}).status_code == 200
    async def pull(self, **kwargs):
        root = Path(kwargs['target_dir'])
        assert 'course_files' in str(root)
        root.mkdir(parents=True)
        requested = root/'101_lecture.txt'
        requested.write_text('Графи і дерева')
        (root/'unrelated.txt').write_text('Should not appear')
        return {'downloaded_files': [{'saved_path': str(requested)}]}
    monkeypatch.setattr(MoodleClient, 'pull_all_course_files', pull)
    result = client.get('/api/courses/612/files/archive')
    assert result.status_code == 200
    with zipfile.ZipFile(io.BytesIO(result.content)) as archive:
        assert archive.namelist() == ['101_lecture.txt']
    assert _private_file_dir({'site_url': 'https://learn.ucu.edu.ua', 'user_id': 1}, 612) != _private_file_dir({'site_url': 'https://learn.ucu.edu.ua', 'user_id': 2}, 612)


def test_file_download_checks_membership_before_any_cached_file(context, tmp_path, monkeypatch):
    from app.services.moodle_client import MoodleClient
    client, _ = context
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(get_settings(), 'MOODLE_MOCK_MODE', True)
    client.post('/api/auth/login', json={'token': 'mock_token'})
    old_cache = tmp_path/'data/courses/612/files'
    old_cache.mkdir(parents=True)
    (old_cache/'101_private.txt').write_text('Other person')
    async def sections(self, **kwargs):
        return []
    monkeypatch.setattr(MoodleClient, 'get_course_contents', sections)
    result = client.get('/api/courses/612/files/download/101')
    assert result.status_code == 404
    assert 'Other person' not in result.text


def test_rest_contents_files_are_listed_with_individual_filenames(context, monkeypatch):
    from app.services.moodle_client import MoodleClient
    client, _ = context
    monkeypatch.setattr(get_settings(), 'MOODLE_MOCK_MODE', True)
    client.post('/api/auth/login', json={'token': 'mock_token'})
    async def sections(self, **kwargs):
        return [{'name': 'Графи', 'modules': [{'id': 15, 'name': 'Лекція', 'modname': 'resource',
                'url': 'https://learn.ucu.edu.ua/mod/resource/view.php?id=15', 'contents': [
                {'type': 'file', 'filename': 'lecture.pdf', 'fileurl': 'https://learn.ucu.edu.ua/pluginfile.php/15/lecture.pdf'},
                {'type': 'file', 'filename': 'notes.txt', 'fileurl': 'https://learn.ucu.edu.ua/pluginfile.php/15/notes.txt'}]}]}]
    monkeypatch.setattr(MoodleClient, 'get_course_contents', sections)
    result = client.get('/api/courses/612/files')
    assert result.status_code == 200
    assert result.json()['total_files'] == 2
    links = [f['download_api'] for f in result.json()['files']]
    assert links[0].endswith('?filename=lecture.pdf')
    assert links[1].endswith('?filename=notes.txt')


def test_html_only_moodle_resources_can_be_listed_and_archived(context, tmp_path, monkeypatch):
    import asyncio
    from app.services.moodle_client import MoodleClient
    client, _ = context
    monkeypatch.setattr(get_settings(), 'MOODLE_MOCK_MODE', True)
    client.post('/api/auth/login', json={'token': 'mock_token'})
    async def sections(self, **kwargs):
        return [{'name': 'Graphs', 'modules': [{'id': 15, 'name': 'Lecture', 'modname': 'resource', 'url': 'https://learn.ucu.edu.ua/mod/resource/view.php?id=15', 'contents': []}]}]
    async def fetch(self, **kwargs):
        assert kwargs['modname'] == 'resource'
        return {'filename': 'lecture.txt', 'raw_bytes': b'BFS uses a queue', 'resolved_url': 'https://learn.ucu.edu.ua/pluginfile.php/15/lecture.txt'}
    monkeypatch.setattr(MoodleClient, 'get_course_contents', sections)
    monkeypatch.setattr(MoodleClient, 'fetch_module_resource', fetch)
    result = client.get('/api/courses/612/files').json()
    assert result['safe_files'] == 1
    assert result['files'][0]['download_api'].endswith('/download/15')
    moodle = MoodleClient(base_url='https://learn.ucu.edu.ua')
    result = asyncio.run(moodle.pull_all_course_files(token='fake_cookie', course_id=612, auth_type='cookie', target_dir=str(tmp_path/'downloads')))
    assert result['total_downloaded'] == 1
    assert (tmp_path/'downloads/15_lecture.txt').read_text() == 'BFS uses a queue'
