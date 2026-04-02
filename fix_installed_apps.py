with open('core/settings.py', 'r') as f:
    c = f.read()

c = c.replace(
    "    'drf_spectacular',",
    "    'drf_spectacular',\n    'drf_spectacular.plumbing',\n    'drf_spectacular_sidecar',"
)

with open('core/settings.py', 'w') as f:
    f.write(c)

print("Done!")
