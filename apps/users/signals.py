from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import BankUser

@receiver(post_save, sender=BankUser)
def generate_pqc_keys_on_register(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        from .utils_pqc import (
            generate_kyber_keypair,
            generate_dilithium_keypair,
            compute_key_fingerprint
        )
        kyber_pk, kyber_sk = generate_kyber_keypair()
        dilithium_pk, dilithium_sk = generate_dilithium_keypair()

        instance.pqc_public_key_kyber = kyber_pk
        instance.pqc_public_key_dilithium = dilithium_pk
        instance.save(update_fields=[
            "pqc_public_key_kyber",
            "pqc_public_key_dilithium"
        ])
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("PQC key gen failed: %s", e)
