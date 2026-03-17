"""apps/messaging/tests.py"""
import pytest
from .models import Message


@pytest.mark.django_db
class TestMessageTTL:
    def test_set_ttl_sets_destroy_at(self):
        from django.utils import timezone
        from datetime import timedelta
        msg = Message()
        before = timezone.now()
        msg.set_ttl(3600)
        assert msg.destroy_at is not None
        assert msg.destroy_at >= before + timedelta(seconds=3590)

    def test_soft_delete_clears_ciphertext(self, db):
        from apps.users.models import BankUser
        from apps.workspace.models import Workspace, Channel
        user = BankUser.objects.create_user("testmsg", "m@b.com", "EMP-T01", "Pass!1234")
        ws = Workspace.objects.create(name="TestWS", slug="testws", owner=user)
        ch = Channel.objects.create(workspace=ws, name="general", slug="general", created_by=user)
        msg = Message.objects.create(
            channel=ch, sender=user,
            ciphertext_b64="encrypted", nonce_b64="nonce", auth_tag_b64="tag"
        )
        msg.soft_delete()
        msg.refresh_from_db()
        assert msg.is_deleted is True
        assert msg.ciphertext_b64 == ""
