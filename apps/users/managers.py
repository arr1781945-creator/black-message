"""
apps/users/managers.py
Custom manager for BankUser with secure creation helpers.
"""

import secrets
from django.contrib.auth.models import BaseUserManager
from django.utils import timezone


class BankUserManager(BaseUserManager):
    def create_user(self, username, email, employee_id, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required for banking users.")
        if not employee_id:
            raise ValueError("Employee ID is required.")

        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_mfa_enforced", True)

        user = self.model(username=username, email=email, employee_id=employee_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, employee_id, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("clearance_level", 5)
        extra_fields.setdefault("is_mfa_enforced", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username, email, employee_id, password, **extra_fields)

    def active_users(self):
        return self.filter(is_active=True, is_locked=False, deactivated_at__isnull=True)

    def by_clearance(self, min_level: int):
        return self.active_users().filter(clearance_level__gte=min_level)

    def generate_employee_id(self, department_code: str = "GEN") -> str:
        """Generate a unique employee ID: DEPT-YYYYMMDD-RANDOM6"""
        from datetime import datetime
        date_str = datetime.now().strftime("%Y%m%d")
        rand = secrets.token_hex(3).upper()
        return f"{department_code}-{date_str}-{rand}"
