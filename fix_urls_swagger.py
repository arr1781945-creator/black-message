with open('core/urls.py', 'r') as f:
    c = f.read()

c = c.replace(
    'from drf_spectacular.views import SpectacularAPIView\nfrom drf_spectacular_sidecar.renderers import OpenApiRendererMixin\nfrom drf_spectacular.views import SpectacularSwaggerView, SpectacularRedocView',
    'from drf_spectacular.views import (\n    SpectacularAPIView,\n    SpectacularSwaggerView,\n    SpectacularRedocView,\n)'
)

with open('core/urls.py', 'w') as f:
    f.write(c)

print("Done!")
