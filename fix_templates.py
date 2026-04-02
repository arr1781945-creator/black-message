with open('core/settings.py', 'r') as f:
    c = f.read()

c = c.replace(
    "'APP_DIRS': True,",
    "'APP_DIRS': False,\n        'loaders': [('django.template.loaders.filesystem.Loader', [str(BASE_DIR / 'templates')]), 'django.template.loaders.app_directories.Loader'],"
)

with open('core/settings.py', 'w') as f:
    f.write(c)

print("Done!")
