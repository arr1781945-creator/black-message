from django.apps import AppConfig

class WorkspaceConfig(AppConfig):
    name = 'apps.workspace'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import apps.workspace.signals  # noqa
