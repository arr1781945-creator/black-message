from django.urls import path
from .views import (
    MessageListView,
    MessageDeleteView,
    AttachmentUploadView,
    ThreadListView,
)

urlpatterns = [
    path("<str:channel_id>/messages/", MessageListView.as_view(), name="message-list"),
    path("messages/<str:pk>/delete/", MessageDeleteView.as_view(), name="message-delete"),
    path("<str:channel_id>/upload/", AttachmentUploadView.as_view(), name="attachment-upload"),
    path("<str:channel_id>/threads/", ThreadListView.as_view(), name="thread-list"),
]
