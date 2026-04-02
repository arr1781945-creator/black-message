with open('core/settings.py', 'r') as f:
    c = f.read()

# Ganti SPECTACULAR_SETTINGS
old = """SPECTACULAR_SETTINGS = {
    'TITLE': 'BlackMess API',
    'DESCRIPTION': 'Enterprise Secure Messaging Platform',
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_DIST': 'SIDECAR',
    'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    'REDOC_DIST': 'SIDECAR',
}"""

new = """SPECTACULAR_SETTINGS = {
    'TITLE': 'BlackMess API',
    'DESCRIPTION': 'Enterprise Secure Messaging Platform',
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}"""

c = c.replace(old, new)

# Hapus sidecar dari INSTALLED_APPS
c = c.replace("    'drf_spectacular_sidecar',\n", "")
c = c.replace("    'drf_spectacular.plumbing',\n", "")

with open('core/settings.py', 'w') as f:
    f.write(c)

print("Done!")
