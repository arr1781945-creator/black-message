class BlackMessRouter:
    """
    Route models to correct database:
    - vault app → blackmess_vault
    - compliance app → blackmess_compliance  
    - analytics → blackmess_analytics
    - semua lain → default (blackmess_db)
    """

    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'vault':
            return 'vault'
        if model._meta.app_label == 'compliance':
            return 'compliance_db'
        return 'default'

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'vault':
            return 'vault'
        if model._meta.app_label == 'compliance':
            return 'compliance_db'
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if db == 'vault':
            return app_label == 'vault'
        if db == 'compliance_db':
            return app_label == 'compliance'
        if db == 'analytics':
            return app_label == 'analytics'
        return db == 'default'
