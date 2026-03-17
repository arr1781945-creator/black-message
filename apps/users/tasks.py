"""apps/users/tasks.py"""
from celery import shared_task
import logging
logger = logging.getLogger(__name__)

@shared_task(name="apps.users.tasks.generate_initial_pqc_keys")
def generate_initial_pqc_keys(user_id: str):
    """Generate Kyber + Dilithium keypair for a new user."""
    from apps.users.models import BankUser, UserPublicKey
    from apps.users.utils_pqc import generate_kyber_keypair, generate_dilithium_keypair, compute_key_fingerprint
    try:
        user = BankUser.objects.get(id=user_id)
        kyber_pk, kyber_sk = generate_kyber_keypair()
        dilithium_pk, dilithium_sk = generate_dilithium_keypair()
        UserPublicKey.objects.create(user=user, key_type="kyber_1024", public_key_b64=kyber_pk, fingerprint=compute_key_fingerprint(kyber_pk))
        UserPublicKey.objects.create(user=user, key_type="ml_dsa_65", public_key_b64=dilithium_pk, fingerprint=compute_key_fingerprint(dilithium_pk))
        user.pqc_public_key_kyber = kyber_pk
        user.pqc_public_key_dilithium = dilithium_pk
        user.save(update_fields=["pqc_public_key_kyber", "pqc_public_key_dilithium"])
        logger.info("PQC keys generated for user %s", user_id)
    except Exception as e:
        logger.error("PQC key gen failed for %s: %s", user_id, e)
