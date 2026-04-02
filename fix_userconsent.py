with open('apps/compliance/models.py', 'r') as f:
    content = f.read()

# Hapus duplikat UserConsent yang kita tambahkan di bawah
marker = '\n\nclass UserConsent(models.Model):\n    """GDPR/OJK consent tracking per user."""'
idx = content.rfind(marker)
if idx != -1:
    content = content[:idx]
    print("Duplikat dihapus!")
else:
    print("Marker tidak ditemukan, cek manual.")

with open('apps/compliance/models.py', 'w') as f:
    f.write(content)
