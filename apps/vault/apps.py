from django.apps import AppConfig

class VaultConfig(AppConfig):
    name = 'apps.vault'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import apps.vault.signals  # noqa
