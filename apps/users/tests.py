"""
apps/users/tests.py — Unit & integration tests for auth flows.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from .models import BankUser, UserRole


@pytest.mark.django_db
class TestRegistration:
    def setup_method(self):
        self.client = APIClient()
        self.role = UserRole.objects.create(name="analyst", display_name="Analyst", max_clearance=2)

    def test_registration_without_invite_fails(self):
        res = self.client.post("/api/v1/auth/register/", {"username": "testuser", "email": "t@bank.com", "password": "Str0ng!Pass#2024", "password_confirm": "Str0ng!Pass#2024", "employee_id": "GEN-001"})
        assert res.status_code == 400
        assert "invite_token" in str(res.data).lower() or "required" in str(res.data).lower()


@pytest.mark.django_db
class TestLogin:
    def setup_method(self):
        self.client = APIClient()
        self.user = BankUser.objects.create_user(
            username="bankuser1", email="b@bank.com",
            employee_id="EMP-001", password="Str0ng!Pass#2024"
        )

    def test_login_returns_tokens(self):
        res = self.client.post("/api/v1/auth/login/", {"username": "bankuser1", "password": "Str0ng!Pass#2024"})
        assert res.status_code == 200
        assert "access" in res.data or "mfa_required" in res.data

    def test_login_bad_password(self):
        res = self.client.post("/api/v1/auth/login/", {"username": "bankuser1", "password": "wrongpass"})
        assert res.status_code in [400, 401]


@pytest.mark.django_db
class TestMFA:
    def setup_method(self):
        self.client = APIClient()
        self.user = BankUser.objects.create_user(
            username="mfauser", email="mfa@bank.com",
            employee_id="EMP-MFA", password="Str0ng!Pass#2024"
        )
        self.client.force_authenticate(user=self.user)

    def test_mfa_setup_returns_secret(self):
        res = self.client.post("/api/v1/auth/mfa/setup/", {"name": "Test Device"})
        assert res.status_code == 201
        assert "qr_uri" in res.data
        assert "secret" in res.data

    def test_mfa_verify_wrong_code(self):
        setup = self.client.post("/api/v1/auth/mfa/setup/", {"name": "Dev"})
        device_id = setup.data["device_id"]
        res = self.client.post("/api/v1/auth/mfa/verify/", {"device_id": device_id, "otp_code": "000000"})
        assert res.status_code == 400
