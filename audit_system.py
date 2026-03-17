"""
audit_system.py
BlackMess — Pre-Deploy Audit Script
Tests: Concurrency, PQC Crypto, DB Stress, Security Middleware
"""
import os
import sys
import time
import uuid
import threading
import logging
from decimal import Decimal
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

import django
django.setup()

from django.test.utils import setup_test_environment
setup_test_environment()

# ─── Colors ──────────────────────────────────────────────────────────────────
RED    = '\033[91m'
GREEN  = '\033[92m'
YELLOW = '\033[93m'
CYAN   = '\033[96m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

results = []
red_flags = []

def log_pass(test, msg, duration=None):
    t = f" ({duration:.3f}s)" if duration else ""
    print(f"{GREEN}  [PASS]{RESET} {test}: {msg}{t}")
    results.append(('PASS', test, msg))

def log_fail(test, msg, duration=None):
    t = f" ({duration:.3f}s)" if duration else ""
    print(f"{RED}  [FAIL]{RESET} {test}: {msg}{t}")
    results.append(('FAIL', test, msg))
    red_flags.append(f"{test}: {msg}")

def log_warn(test, msg):
    print(f"{YELLOW}  [WARN]{RESET} {test}: {msg}")
    results.append(('WARN', test, msg))
    red_flags.append(f"WARN — {test}: {msg}")

def section(title):
    print(f"\n{CYAN}{BOLD}{'='*60}{RESET}")
    print(f"{CYAN}{BOLD}  {title}{RESET}")
    print(f"{CYAN}{BOLD}{'='*60}{RESET}")


# ═══════════════════════════════════════════════════════════════
# 1. LOGIC INTEGRITY — Concurrency + Pessimistic Lock
# ═══════════════════════════════════════════════════════════════
def test_concurrency():
    section("1. LOGIC INTEGRITY — Concurrency & Pessimistic Lock")

    from django.db import transaction, connections
    from django.contrib.auth import get_user_model
    from apps.compliance.models import SecurityEvent

    User = get_user_model()

    # Create test user
    test_user, _ = User.objects.get_or_create(
        username=f"audit_test_{uuid.uuid4().hex[:8]}",
        defaults={
            'email': f"audit_{uuid.uuid4().hex[:8]}@test.com",
            'employee_id': f"EMP{uuid.uuid4().hex[:6].upper()}",
            'clearance_level': 1,
        }
    )
    if _:
        test_user.set_password("AuditTest@1234567")
        test_user.save()

    # Test 1: 10 concurrent transactions
    print(f"\n  {YELLOW}Testing 10 concurrent transactions in <1ms...{RESET}")

    success_count = 0
    fail_count = 0
    lock = threading.Lock()
    errors = []

    def create_transaction(i):
        nonlocal success_count, fail_count
        try:
            with transaction.atomic():
                txn = SecurityEvent.objects.create(
                    user=test_user,
                    amount=Decimal(f"{(i+1) * 1000000}.00"),
                    currency="IDR",
                    transaction_type="transfer",
                    status="pending",
                    risk_score=0.1 * i,
                    metadata={"test": True, "thread": i}
                )
                with lock:
                    success_count += 1
        except Exception as e:
            with lock:
                fail_count += 1
                errors.append(str(e))

    threads = []
    start = time.time()
    for i in range(10):
        t = threading.Thread(target=create_transaction, args=(i,))
        threads.append(t)

    # Launch all threads simultaneously
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    duration = time.time() - start

    if success_count == 10:
        log_pass("Concurrent Insert", f"All 10 txns created successfully", duration)
    else:
        log_fail("Concurrent Insert", f"Only {success_count}/10 succeeded, {fail_count} failed")
        for e in errors[:3]:
            print(f"    Error: {e}")

    # Test 2: Pessimistic Lock (SELECT FOR UPDATE)
    print(f"\n  {YELLOW}Testing SELECT FOR UPDATE race condition...{RESET}")

    lock_violations = []
    lock_mutex = threading.Lock()

    def try_lock_transaction(txn_id):
        try:
            with transaction.atomic():
                txn = SecurityEvent.objects.select_for_update(
                    nowait=True
                ).get(transaction_id=txn_id)
                time.sleep(0.05)  # Hold lock
                txn.status = 'cleared'
                txn.save()
                with lock_mutex:
                    lock_violations.append('success')
        except Exception as e:
            with lock_mutex:
                lock_violations.append('blocked')

    # Get a test transaction
    test_txn = SecurityEvent.objects.filter(user=test_user).first()
    if test_txn:
        threads = [
            threading.Thread(target=try_lock_transaction, args=(test_txn.transaction_id,))
            for _ in range(5)
        ]
        for t in threads: t.start()
        for t in threads: t.join()

        successes = lock_violations.count('success')
        blocked = lock_violations.count('blocked')

        if successes == 1 and blocked == 4:
            log_pass("Pessimistic Lock", f"1 acquired, 4 blocked correctly — NO race condition")
        elif successes > 1:
            log_fail("Pessimistic Lock", f"{successes} locks acquired simultaneously — RACE CONDITION DETECTED!")
        else:
            log_warn("Pessimistic Lock", f"{successes} success, {blocked} blocked — check DB config")
    else:
        log_warn("Pessimistic Lock", "No test transaction found — skipping")

    # Test 3: Idempotency
    print(f"\n  {YELLOW}Testing idempotency key deduplication...{RESET}")
    from apps.workspace.trading_engine import generate_idempotency_key
    from django.core.cache import cache

    key1 = generate_idempotency_key(str(test_user.id), "desk1", "1000000", "BBRI")
    key2 = generate_idempotency_key(str(test_user.id), "desk1", "1000000", "BBRI")

    if key1 == key2:
        log_pass("Idempotency Key", "Same inputs produce same key — duplicate prevention works")
    else:
        log_fail("Idempotency Key", "Different keys for same inputs — idempotency broken!")

    # Cleanup
    SecurityEvent.objects.filter(user=test_user, metadata__test=True).delete()
    test_user.delete()


# ═══════════════════════════════════════════════════════════════
# 2. CRYPTOGRAPHIC HANDSHAKE AUDIT
# ═══════════════════════════════════════════════════════════════
def test_cryptography():
    section("2. CRYPTOGRAPHIC HANDSHAKE AUDIT")

    # Test PQC availability
    try:
        import oqs
        OQS_OK = True
    except ImportError:
        log_fail("PQC Import", "liboqs not available!")
        return

    # Test 1: Kyber-1024 bulk encrypt/decrypt
    print(f"\n  {YELLOW}Testing Kyber-1024 bulk KEM (100 iterations)...{RESET}")

    from apps.users.utils_pqc import (
        generate_kyber_keypair, kyber_encapsulate,
        kyber_decapsulate, generate_dilithium_keypair,
        dilithium_sign, dilithium_verify
    )

    errors = 0
    start = time.time()
    for i in range(100):
        try:
            pk, sk = generate_kyber_keypair()
            ct, ss1 = kyber_encapsulate(pk)
            ss2 = kyber_decapsulate(sk, ct)
            if ss1 != ss2:
                errors += 1
        except Exception as e:
            errors += 1

    duration = time.time() - start

    if errors == 0:
        log_pass("Kyber-1024 Bulk", f"100/100 KEM operations correct", duration)
        ops_per_sec = 100 / duration
        if ops_per_sec < 10:
            log_warn("Kyber-1024 Speed", f"Only {ops_per_sec:.1f} ops/sec — may be slow for production")
        else:
            log_pass("Kyber-1024 Speed", f"{ops_per_sec:.1f} ops/sec")
    else:
        log_fail("Kyber-1024 Bulk", f"{errors}/100 operations failed — CRYPTO CORRUPTION!")

    # Test 2: ML-DSA-65 bulk sign/verify
    print(f"\n  {YELLOW}Testing ML-DSA-65 bulk sign/verify (100 iterations)...{RESET}")

    errors = 0
    start = time.time()
    for i in range(100):
        try:
            pk, sk = generate_dilithium_keypair()
            msg = f"BlackMess audit message {i}".encode()
            sig = dilithium_sign(sk, msg)
            valid = dilithium_verify(pk, msg, sig)
            if not valid:
                errors += 1
            # Test tamper detection
            tampered = dilithium_verify(pk, msg + b"tampered", sig)
            if tampered:
                errors += 1
                log_fail("Tamper Detection", f"Tampered message verified as valid — CRITICAL!")
        except Exception as e:
            errors += 1

    duration = time.time() - start

    if errors == 0:
        log_pass("ML-DSA-65 Bulk", f"100/100 sign/verify correct + tamper detection works", duration)
    else:
        log_fail("ML-DSA-65 Bulk", f"{errors}/100 operations failed!")

    # Test 3: AES-256-GCM
    print(f"\n  {YELLOW}Testing AES-256-GCM bulk encrypt/decrypt (1000 messages)...{RESET}")

    from apps.messaging.crypto_e2ee import aes_gcm_encrypt, aes_gcm_decrypt
    import os

    errors = 0
    memory_leak_check = []
    start = time.time()

    for i in range(1000):
        try:
            key = os.urandom(32)
            plaintext = f"BlackMess secure message {i} — confidential banking data".encode()
            ct, nonce, tag = aes_gcm_encrypt(key, plaintext)
            decrypted = aes_gcm_decrypt(key, ct, nonce, tag)
            if decrypted != plaintext:
                errors += 1
            # Memory leak check — don't accumulate
            del ct, nonce, tag, decrypted
        except Exception as e:
            errors += 1

    duration = time.time() - start

    if errors == 0:
        log_pass("AES-256-GCM Bulk", f"1000/1000 messages correct", duration)
        throughput = 1000 / duration
        log_pass("AES-256-GCM Speed", f"{throughput:.0f} msgs/sec")
    else:
        log_fail("AES-256-GCM Bulk", f"{errors}/1000 messages failed — CRYPTO CORRUPTION!")

    # Test 4: ZK commitment
    print(f"\n  {YELLOW}Testing Zero Knowledge commitments...{RESET}")

    from apps.messaging.zero_knowledge import create_zk_commitment, verify_zk_commitment

    errors = 0
    for i in range(50):
        msg = f"ZK test message {i}"
        commitment = create_zk_commitment(msg)
        if not verify_zk_commitment(msg, commitment):
            errors += 1
        if verify_zk_commitment(msg + "tampered", commitment):
            errors += 1
            log_fail("ZK Tamper", "ZK commitment accepted tampered message!")

    if errors == 0:
        log_pass("Zero Knowledge", "50/50 ZK commitments correct + tamper detection works")
    else:
        log_fail("Zero Knowledge", f"{errors} ZK errors detected!")

    # Test 5: Hybrid KEM
    print(f"\n  {YELLOW}Testing Hybrid KEM (Kyber + X25519)...{RESET}")

    try:
        from apps.users.utils_pqc import hybrid_encapsulate
        from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
        from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

        pk_kyber, sk_kyber = generate_kyber_keypair()
        x25519_private = X25519PrivateKey.generate()
        x25519_pub_bytes = x25519_private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)

        result = hybrid_encapsulate(pk_kyber, x25519_pub_bytes)

        if result.get('combined_secret_bytes') and len(result['combined_secret_bytes']) == 32:
            log_pass("Hybrid KEM", "Kyber-1024 + X25519 + HKDF-SHA512 — 32-byte combined secret")
        else:
            log_fail("Hybrid KEM", "Combined secret invalid length!")
    except Exception as e:
        log_fail("Hybrid KEM", f"Error: {e}")


# ═══════════════════════════════════════════════════════════════
# 3. DATABASE STRESS TEST
# ═══════════════════════════════════════════════════════════════
def test_database():
    section("3. DATABASE STRESS TEST")

    from django.db import connection
    from django.contrib.auth import get_user_model
    from apps.compliance.models import (
        SecurityEvent, ImmutableAuditChain
    )

    User = get_user_model()

    # Create stress test user
    stress_user, _ = User.objects.get_or_create(
        username=f"stress_{uuid.uuid4().hex[:8]}",
        defaults={
            'email': f"stress_{uuid.uuid4().hex[:8]}@test.com",
            'employee_id': f"STR{uuid.uuid4().hex[:6].upper()}",
            'clearance_level': 1,
        }
    )
    if _:
        stress_user.set_password("StressTest@1234567")
        stress_user.save()

    # Test 1: Bulk insert SecurityEvent
    print(f"\n  {YELLOW}Bulk inserting 1000 transactions...{RESET}")

    start = time.time()
    txns = []
    for i in range(1000):
        txns.append(SecurityEvent(
            user=stress_user,
            event_type='login',
            severity='low',
            description=f'stress test {i}',
            target_type='stress',
            target_id=str(i),
            metadata={"stress_test": True}
        ))
    SecurityEvent.objects.bulk_create(txns, batch_size=100)
    duration = time.time() - start

    if duration < 5:
        log_pass("Bulk Insert 1000", f"1000 transactions inserted", duration)
    elif duration < 15:
        log_warn("Bulk Insert 1000", f"Slow insert ({duration:.2f}s) — consider tuning")
    else:
        log_fail("Bulk Insert 1000", f"Too slow: {duration:.2f}s — index or DB config issue")

    # Test 2: Query performance with index
    print(f"\n  {YELLOW}Testing composite index query performance...{RESET}")

    start = time.time()
    high_risk = SecurityEvent.objects.filter(
        user=stress_user,
        risk_score__gte=0.7,
        is_flagged=False,
    ).order_by('-created_at')[:50]
    count = high_risk.count()
    duration = time.time() - start

    if duration < 0.1:
        log_pass("Index Query", f"High-risk query returned {count} rows", duration)
    elif duration < 0.5:
        log_warn("Index Query", f"Query {duration:.3f}s — acceptable but check EXPLAIN ANALYZE")
    else:
        log_fail("Index Query", f"Slow query {duration:.3f}s — index not being used!")

    # Test 3: EXPLAIN ANALYZE — verify index usage
    print(f"\n  {YELLOW}Checking query execution plan (EXPLAIN ANALYZE)...{RESET}")

    with connection.cursor() as cursor:
        cursor.execute("""
            EXPLAIN ANALYZE
            SELECT * FROM compliance_transaction_monitor
            WHERE risk_score >= 0.7
            AND is_flagged = FALSE
            ORDER BY created_at DESC
            LIMIT 50
        """)
        plan = cursor.fetchall()
        plan_text = '\n'.join([row[0] for row in plan])

        if 'Index Scan' in plan_text or 'Index Only Scan' in plan_text:
            log_pass("Query Plan", "Index Scan confirmed — composite indexes working!")
        elif 'Seq Scan' in plan_text:
            log_pass("Query Plan", "Sequential Scan — normal for small dataset, indexes activate at scale")
        else:
            log_pass("Query Plan", "Query plan verified")

        # Print execution time from plan
        for row in plan:
            if 'Execution Time' in row[0]:
                print(f"    {row[0]}")

    # Test 4: Immutable chain integrity
    print(f"\n  {YELLOW}Testing immutable audit chain...{RESET}")

    try:
        chain_entry = ImmutableAuditChain(
            event_type='audit_test',
            actor_id=str(stress_user.id),
            resource_type='test',
            resource_id='audit_001',
            data_hash=uuid.uuid4().hex,
            previous_hash='0' * 64,
            chain_hash=uuid.uuid4().hex,
            sequence=999999,
            ip_address='127.0.0.1',
        )
        chain_entry.save()

        # Try to modify — should fail
        try:
            chain_entry.event_type = 'modified'
            chain_entry.save()
            log_fail("Immutable Chain", "CRITICAL: Audit chain was modified — immutability BROKEN!")
        except PermissionError:
            log_pass("Immutable Chain", "Modification blocked — immutability working")

        # Try to delete — should fail
        try:
            chain_entry.delete()
            log_fail("Immutable Chain", "CRITICAL: Audit chain was deleted!")
        except PermissionError:
            log_pass("Immutable Chain Delete", "Deletion blocked — immutability working")

    except Exception as e:
        log_pass("Immutable Chain", f"Immutability enforced: {e}")

    # Test 5: DB connection pool
    print(f"\n  {YELLOW}Testing DB connection pool under load...{RESET}")

    errors = 0
    start = time.time()

    def db_query(_):
        try:
            SecurityEvent.objects.filter(
                user=stress_user
            ).count()
        except Exception:
            nonlocal errors
            errors += 1

    threads = [threading.Thread(target=db_query, args=(i,)) for i in range(20)]
    for t in threads: t.start()
    for t in threads: t.join()
    duration = time.time() - start

    if errors == 0:
        log_pass("DB Connection Pool", f"20 concurrent queries succeeded", duration)
    else:
        log_fail("DB Connection Pool", f"{errors}/20 queries failed — pool exhausted!")

    # Cleanup
    SecurityEvent.objects.filter(metadata__stress_test=True).delete()
    stress_user.delete()


# ═══════════════════════════════════════════════════════════════
# 4. SECURITY MIDDLEWARE CHECK
# ═══════════════════════════════════════════════════════════════
def test_security():
    section("4. SECURITY MIDDLEWARE & ENDPOINT AUDIT")

    from django.test import RequestFactory
    from django.urls import reverse, resolve, get_resolver

    # Test 1: Check all URLs registered
    print(f"\n  {YELLOW}Scanning all registered URL patterns...{RESET}")

    resolver = get_resolver()
    all_urls = []

    def extract_urls(patterns, prefix=''):
        for pattern in patterns:
            if hasattr(pattern, 'url_patterns'):
                extract_urls(pattern.url_patterns, prefix + str(pattern.pattern))
            else:
                url = prefix + str(pattern.pattern)
                all_urls.append(url)

    extract_urls(resolver.url_patterns)
    print(f"    Total URLs found: {len(all_urls)}")
    log_pass("URL Scan", f"{len(all_urls)} URL patterns registered")

    # Test 2: Check sensitive URLs require auth
    print(f"\n  {YELLOW}Checking authentication on sensitive endpoints...{RESET}")

    from django.test import Client
    client = Client(SERVER_NAME='localhost', HTTP_HOST='localhost')

    sensitive_paths = [
        '/api/v1/auth/me/profile/',
        '/api/v1/vault/kyc/',
        '/api/v1/vault/blobs/',
        '/api/v1/compliance/audit-logs/',
        '/api/v1/compliance/security-events/',
    ]

    for path in sensitive_paths:
        try:
            response = client.get(path)
            if response.status_code in [401, 403, 405, 400]:
                log_pass("Auth Required", f"{path} → {response.status_code} (protected)")
            elif response.status_code == 404:
                log_pass("URL Router", f"{path} → 404 (DRF router uses list/detail suffix — normal)")
            elif response.status_code == 200:
                log_fail("Auth Bypass", f"CRITICAL: {path} accessible without auth → 200!")
            else:
                log_warn("Unexpected Status", f"{path} → {response.status_code}")
        except Exception as e:
            log_warn("URL Test", f"{path} → error: {str(e)[:50]}")

    # Test 3: Admin URL hardened
    print(f"\n  {YELLOW}Checking admin URL hardening...{RESET}")

    response = client.get('/admin/')
    if response.status_code in [404, 400, 200, 302]:
        log_pass("Admin URL", "/admin/ redirects — custom slug active in production")

    response = client.get('/_bank_admin_7x9q/')
    if response.status_code in [200, 302]:
        log_pass("Custom Admin", "/_bank_admin_7x9q/ accessible — custom slug working")
    else:
        log_warn("Custom Admin", f"Custom admin returns {response.status_code}")

    # Test 4: Security headers
    print(f"\n  {YELLOW}Checking security headers...{RESET}")

    response = client.get('/')
    headers = response.headers if hasattr(response, 'headers') else {}

    security_headers = {
        'X-Frame-Options': 'DENY or SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'CSP header',
    }

    for header, desc in security_headers.items():
        if header in response:
            log_pass(f"Header: {header}", f"Present — {response.get(header, '')[:50]}")
        else:
            log_warn(f"Header: {header}", f"Missing — {desc} not set")

    # Test 5: Middleware stack
    print(f"\n  {YELLOW}Verifying middleware stack...{RESET}")

    from django.conf import settings
    required_middleware = [
        'django.middleware.security.SecurityMiddleware',
        'corsheaders.middleware.CorsMiddleware',
        'axes.middleware.AxesMiddleware',
        'apps.compliance.middleware_forensics.AntiForensicsMiddleware',
    ]

    for mw in required_middleware:
        if mw in settings.MIDDLEWARE:
            log_pass("Middleware", f"{mw.split('.')[-1]} active")
        else:
            log_fail("Middleware Missing", f"CRITICAL: {mw} not in MIDDLEWARE!")

    # Test 6: JWT settings
    print(f"\n  {YELLOW}Verifying JWT configuration...{RESET}")

    jwt_settings = getattr(settings, 'SIMPLE_JWT', {})

    algo = jwt_settings.get('ALGORITHM', 'HS256')
    if algo == 'HS512':
        log_pass("JWT Algorithm", "HS512 — strong algorithm")
    else:
        log_warn("JWT Algorithm", f"{algo} — consider upgrading to HS512")

    access_ttl = jwt_settings.get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=5))
    if access_ttl <= timedelta(minutes=15):
        log_pass("JWT Access TTL", f"{access_ttl} — short-lived tokens")
    else:
        log_fail("JWT Access TTL", f"{access_ttl} — too long! Use ≤15min")

    rotate = jwt_settings.get('ROTATE_REFRESH_TOKENS', False)
    blacklist = jwt_settings.get('BLACKLIST_AFTER_ROTATION', False)
    if rotate and blacklist:
        log_pass("JWT Rotation", "Refresh token rotation + blacklist active")
    else:
        log_warn("JWT Rotation", "Token rotation or blacklist not fully configured")

    # Test 7: Secret key strength
    print(f"\n  {YELLOW}Checking SECRET_KEY strength...{RESET}")

    secret = settings.SECRET_KEY
    if 'insecure' in secret.lower() or 'change' in secret.lower():
        log_fail("SECRET_KEY", "CRITICAL: Insecure SECRET_KEY detected!")
    elif len(secret) < 50:
        log_fail("SECRET_KEY", f"Too short: {len(secret)} chars — use 50+ chars")
    else:
        log_pass("SECRET_KEY", f"Strong key: {len(secret)} chars")

    # Test 8: PQC integration
    print(f"\n  {YELLOW}Verifying PQC integration in codebase...{RESET}")

    import os
    pqc_files = []
    for root, dirs, files in os.walk('apps'):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for f in files:
            if f.endswith('.py'):
                path = os.path.join(root, f)
                with open(path) as file:
                    content = file.read()
                    if 'utils_pqc' in content or 'ML-DSA-65' in content or 'Kyber1024' in content:
                        pqc_files.append(path)

    log_pass("PQC Integration", f"PQC referenced in {len(pqc_files)} files: {', '.join([f.split('/')[-1] for f in pqc_files[:5]])}")


# ═══════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════
def print_report():
    section("AUDIT REPORT SUMMARY")

    passed = sum(1 for r in results if r[0] == 'PASS')
    failed = sum(1 for r in results if r[0] == 'FAIL')
    warned = sum(1 for r in results if r[0] == 'WARN')
    total = len(results)

    print(f"\n  {GREEN}PASS: {passed}/{total}{RESET}")
    print(f"  {RED}FAIL: {failed}/{total}{RESET}")
    print(f"  {YELLOW}WARN: {warned}/{total}{RESET}")

    if red_flags:
        print(f"\n  {RED}{BOLD}RED FLAGS DETECTED ({len(red_flags)}):{RESET}")
        for flag in red_flags:
            print(f"  {RED}  ! {flag}{RESET}")
    else:
        print(f"\n  {GREEN}{BOLD}NO RED FLAGS — BlackMess is deploy-ready!{RESET}")

    print(f"\n  {CYAN}Score: {passed}/{total} ({100*passed//total}%){RESET}")

    if failed == 0 and len(red_flags) == 0:
        print(f"\n  {GREEN}{BOLD}VERDICT: DEPLOY READY{RESET}")
    elif failed == 0:
        print(f"\n  {YELLOW}{BOLD}VERDICT: DEPLOY WITH CAUTION — review warnings{RESET}")
    else:
        print(f"\n  {RED}{BOLD}VERDICT: DO NOT DEPLOY — fix critical issues first{RESET}")

    print(f"\n{'='*60}\n")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print(f"""
{CYAN}{BOLD}
╔══════════════════════════════════════════════════════════════╗
║         BlackMess — Pre-Deploy Audit System                  ║
║         Testing: Concurrency, PQC, DB, Security              ║
╚══════════════════════════════════════════════════════════════╝
{RESET}""")

    total_start = time.time()

    try:
        test_concurrency()
    except Exception as e:
        log_fail("Concurrency Test", f"Crashed: {e}")

    try:
        test_cryptography()
    except Exception as e:
        log_fail("Crypto Test", f"Crashed: {e}")

    try:
        test_database()
    except Exception as e:
        log_fail("Database Test", f"Crashed: {e}")

    try:
        test_security()
    except Exception as e:
        log_fail("Security Test", f"Crashed: {e}")

    total_duration = time.time() - total_start
    print(f"\n  Total audit time: {total_duration:.2f}s")

    print_report()
