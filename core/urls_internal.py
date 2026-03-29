from django.urls import path, include

urlpatterns = [
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/workspace/', include('apps.workspace.urls')),
    path('api/v1/messaging/', include('apps.messaging.urls')),
    path('api/v1/compliance/', include('apps.compliance.urls')),
    path('api/v1/vault/', include('apps.vault.urls')),
]
