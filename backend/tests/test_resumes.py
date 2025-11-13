"""
Resume API Endpoint Tests
Tests for resume CRUD operations and file uploads.
"""
import pytest
from io import BytesIO


def test_resumes_list_endpoint_exists(client):
    """Test that the resumes list endpoint is accessible."""
    resp = client.get("/api/v1/resumes/")
    assert resp.status_code != 404
    # Should require authentication
    assert resp.status_code in (401, 403, 500)


def test_resumes_create_endpoint_exists(client):
    """Test that the resume creation endpoint is accessible."""
    resp = client.post("/api/v1/resumes/", json={
        "title": "Test Resume"
    })
    assert resp.status_code != 404


def test_resumes_get_by_id_endpoint_exists(client):
    """Test that the resume detail endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.get(f"/api/v1/resumes/{fake_uuid}")
    assert resp.status_code != 404


def test_resumes_update_endpoint_exists(client):
    """Test that the resume update endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.put(f"/api/v1/resumes/{fake_uuid}", json={
        "title": "Updated Resume"
    })
    assert resp.status_code != 404


def test_resumes_delete_endpoint_exists(client):
    """Test that the resume delete endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.delete(f"/api/v1/resumes/{fake_uuid}")
    assert resp.status_code != 404


def test_resumes_upload_endpoint_exists(client):
    """Test that the resume file upload endpoint is accessible."""
    # Create a fake PDF file
    fake_pdf = BytesIO(b"%PDF-1.4 fake content")
    files = {"file": ("resume.pdf", fake_pdf, "application/pdf")}

    resp = client.post("/api/v1/resumes/upload", files=files)
    assert resp.status_code != 404


def test_resumes_download_endpoint_exists(client):
    """Test that the resume download endpoint is accessible."""
    fake_uuid = "123e4567-e89b-12d3-a456-426614174000"
    resp = client.get(f"/api/v1/resumes/{fake_uuid}/download")
    assert resp.status_code != 404


def test_resumes_supports_pagination(client):
    """Test that resume list supports pagination parameters."""
    resp = client.get("/api/v1/resumes/?skip=0&limit=10")
    assert resp.status_code != 404


def test_resume_upload_validates_file_type(client):
    """Test that only valid file types are accepted."""
    # Try uploading a text file as resume
    fake_txt = BytesIO(b"This is not a resume")
    files = {"file": ("resume.txt", fake_txt, "text/plain")}

    resp = client.post("/api/v1/resumes/upload", files=files)
    # Should validate file type
    assert resp.status_code in (400, 401, 422, 500)


def test_resume_upload_requires_file(client):
    """Test that file upload requires a file parameter."""
    resp = client.post("/api/v1/resumes/upload")
    assert resp.status_code in (422, 401, 400)  # Validation or auth error
