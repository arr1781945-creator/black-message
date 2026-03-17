"""apps/workspace/permissions.py"""
from rest_framework.permissions import BasePermission
from .models import WorkspaceMember


class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        workspace_slug = view.kwargs.get("workspace_slug") or view.kwargs.get("slug")
        if not workspace_slug:
            return True
        return WorkspaceMember.objects.filter(
            workspace__slug=workspace_slug,
            user=request.user,
            status="active",
        ).exists()


class IsWorkspaceAdmin(BasePermission):
    def has_permission(self, request, view):
        workspace_slug = view.kwargs.get("slug")
        return WorkspaceMember.objects.filter(
            workspace__slug=workspace_slug,
            user=request.user,
            role__name__in=["super_admin", "branch_manager"],
            status="active",
        ).exists()
