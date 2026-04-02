with open('apps/users/email_service.py', 'r') as f:
    c = f.read()

# Fix FROM_EMAIL ke domain sendiri
c = c.replace(
    "FROM_EMAIL = 'blackmessage312415@gmail.com'",
    "FROM_EMAIL = 'noreply@blackmess.app'"
)

# Fix subject OTP - jangan expose kode di subject
c = c.replace(
    "return _send(to_email, f'Kode masuk BlackMess Anda: {otp[:2]}****', html, plain)",
    "return _send(to_email, 'BlackMess — Verifikasi Login Anda', html, plain)"
)

# Fix footer - ganti Ternate ke Jakarta
c = c.replace(
    '© 2026 BlackMess Enterprise · Ternate, Maluku Utara, Indonesia',
    '© 2026 BlackMess Enterprise · Jakarta, Indonesia'
)

with open('apps/users/email_service.py', 'w') as f:
    f.write(c)

print("Done!")
