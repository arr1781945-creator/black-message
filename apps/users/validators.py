"""apps/users/validators.py"""
import re
from django.core.exceptions import ValidationError

class BankPasswordComplexityValidator:
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password): raise ValidationError("Password must contain an uppercase letter.")
        if not re.search(r'[a-z]', password): raise ValidationError("Password must contain a lowercase letter.")
        if not re.search(r'\d', password): raise ValidationError("Password must contain a digit.")
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'"\\|,.<>/?]', password): raise ValidationError("Password must contain a special character.")

    def get_help_text(self):
        return "Password must be 16+ chars with uppercase, lowercase, digit, and special character."
