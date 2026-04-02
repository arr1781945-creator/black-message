with open('apps/workspace/urls.py', 'r') as f:
    c = f.read()

c = c.replace(
    "urlpatterns = [\n    path('create/', WorkspaceCreateView.as_view(), name='workspace-create'),\n    path('', include(router.urls)),\n]",
    "urlpatterns = [\n    path('create/', WorkspaceCreateView.as_view(), name='workspace-create'),\n] + router.urls"
)

with open('apps/workspace/urls.py', 'w') as f:
    f.write(c)

print("Done!")
