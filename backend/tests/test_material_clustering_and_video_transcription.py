import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.content_clusterer import MaterialContentClusterer
from app.services.video_transcriber import VideoTranscriberService


def test_youtube_video_id_extraction():
    urls = [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ]
    for url, expected_id in urls:
        extracted = VideoTranscriberService.extract_youtube_video_id(url)
        assert extracted == expected_id, f"Failed for {url}"


def test_vtt_and_srt_parsing_zero_tokens():
    raw_vtt = """WEBVTT

00:00:01.000 --> 00:00:04.500
Сьогодні ми розглянемо дискретні випадкові величини.

00:00:05.000 --> 00:00:09.000
Зокрема, функцію розподілу ймовірностей (PMF) та кумулятивну функцію (CDF).
"""
    result = VideoTranscriberService.parse_vtt_or_srt(raw_vtt)
    assert result["token_cost"] == 0
    assert "дискретні випадкові величини" in result["full_text"]
    assert len(result["segments"]) == 2
    assert result["segments"][0]["timestamp"] == "00:00:01"
    assert "Сьогодні ми розглянемо" in result["segments"][0]["text"]


def test_clustering_strictly_matches_syllabus_topic_count():
    # Simulating a chaotic Moodle course with 14 administrative sections
    sections = [
        {
            "id": 1,
            "name": "Topic 4: Discrete random variables",
            "modules": [
                {"id": 101, "name": "26L4-RV.pdf", "modname": "resource", "url": "https://moodle.ucu.edu.ua/mod/resource/view.php?id=101"},
                {"id": 102, "name": "Quiz 4", "modname": "quiz"},
                {"id": 103, "name": "Self-test on Topic 4", "modname": "quiz"},
            ],
        },
        {
            "id": 2,
            "name": "Seminar 4",
            "modules": [
                {"id": 104, "name": "PS-seminar4-2026.pdf", "modname": "resource"},
                {"id": 105, "name": "Seminar 4 Recording", "modname": "url", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
            ],
        },
        {
            "id": 3,
            "name": "Reading for topic 4",
            "modules": [
                {"id": 106, "name": "Ross 117-185.pdf", "modname": "resource"},
            ],
        },
        {
            "id": 4,
            "name": "Topic 5: Expectation and Variance",
            "modules": [
                {"id": 201, "name": "L5-expectation.pdf", "modname": "resource"},
                {"id": 202, "name": "Quiz 5", "modname": "quiz"},
            ],
        },
        {
            "id": 5,
            "name": "Seminar 5",
            "modules": [
                {"id": 203, "name": "PS-seminar5-2025.pdf", "modname": "resource"},
                {"id": 204, "name": "Definitions for seminar 5.pdf", "modname": "resource"},
            ],
        },
        {
            "id": 6,
            "name": "Topic 6: Continuous random variables",
            "modules": [
                {"id": 301, "name": "25L6-continuousRV.pdf", "modname": "resource"},
                {"id": 302, "name": "Quiz 6", "modname": "quiz"},
            ],
        },
        {
            "id": 7,
            "name": "Seminar 6",
            "modules": [
                {"id": 303, "name": "PS-seminar6-2026.pdf", "modname": "resource"},
            ],
        },
        {
            "id": 8,
            "name": "Colloquium",
            "modules": [
                {"id": 401, "name": "PS_Col2_2022.pdf", "modname": "resource"},
            ],
        },
        {
            "id": 9,
            "name": "Midterm exam",
            "modules": [
                {"id": 402, "name": "Getting ready for the midterm.pdf", "modname": "resource"},
            ],
        },
        {
            "id": 10,
            "name": "Lab assignment 2",
            "modules": [
                {"id": 403, "name": "Lab 2: Simulation of RVs in Python", "modname": "assign"},
            ],
        },
        {
            "id": 11,
            "name": "Test for module 2",
            "modules": [
                {"id": 404, "name": "Module 2 Final Assessment", "modname": "quiz"},
            ],
        },
    ]

    # 1. Extraction: Strictly 3 canonical syllabus topics must be extracted!
    canonical_topics = MaterialContentClusterer.extract_canonical_syllabus_topics(sections=sections)
    assert len(canonical_topics) == 3, f"Expected strictly 3 syllabus topics, got {len(canonical_topics)}"
    
    topic_indices = [t["topic_index"] for t in canonical_topics]
    assert 4 in topic_indices
    assert 5 in topic_indices
    assert 6 in topic_indices

    # 2. Clustering: All materials across all 11 sections must be clustered into the 3 topics!
    clustered = MaterialContentClusterer.cluster_all_materials(sections=sections, canonical_topics=canonical_topics)

    assert len(clustered) == 3

    # Check Topic 4 has Seminar 4 and Reading 4
    t4_mats = clustered[4]
    t4_names = [m.name for m in t4_mats]
    assert "26L4-RV.pdf" in t4_names
    assert "PS-seminar4-2026.pdf" in t4_names
    assert "Ross 117-185.pdf" in t4_names
    assert "Seminar 4 Recording" in t4_names
    # Check video material is classified as video
    vid_mat = next(m for m in t4_mats if m.name == "Seminar 4 Recording")
    assert vid_mat.material_type == "video"

    # Check Topic 5 has Seminar 5
    t5_mats = clustered[5]
    t5_names = [m.name for m in t5_mats]
    assert "L5-expectation.pdf" in t5_names
    assert "PS-seminar5-2025.pdf" in t5_names

    # Check Topic 6 has Seminar 6
    t6_mats = clustered[6]
    t6_names = [m.name for m in t6_mats]
    assert "25L6-continuousRV.pdf" in t6_names
    assert "PS-seminar6-2026.pdf" in t6_names


def test_auto_cluster_endpoint_builds_canonical_workspace():
    client = TestClient(app)

    # Calling auto-cluster on mock course 101
    res = client.post("/api/workspace/courses/101/auto-cluster")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    bundle = data["bundle"]
    assert bundle["course"]["course_id"] == 101
    topic_mixes = bundle["topic_mixes"]
    assert len(topic_mixes) > 0

    # Ensure materials are clustered and contain key_items
    first_mix = topic_mixes[0]
    assert len(first_mix["materials"]) > 0
    mat = first_mix["materials"][0]
    assert "key_items" in mat
    assert len(mat["key_items"]) > 0


def test_transcribe_video_api_zero_tokens():
    client = TestClient(app)

    # Testing API endpoint structure
    res = client.post(
        "/api/courses/transcribe-video",
        json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "course_id": 101},
    )
    assert res.status_code == 200
    data = res.json()
    assert "token_cost" in data
    assert data["token_cost"] == 0
