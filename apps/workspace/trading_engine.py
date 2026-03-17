"""
apps/workspace/trading_engine.py
Race-condition-proof trading engine dengan Redis distributed lock.
Mencegah double-spending dan transaksi ganda.
"""
import uuid
import hashlib
import logging
import time
from contextlib import contextmanager
from django.db import transaction
from django.core.cache import cache
from django.utils import timezone
from decimal import Decimal

logger = logging.getLogger(__name__)

LOCK_TTL = 30  # seconds
LOCK_RETRY = 3
LOCK_RETRY_DELAY = 0.1  # seconds


@contextmanager
def trading_desk_lock(desk_id: str, user_id: str, timeout=LOCK_TTL):
    """
    Distributed Redis lock untuk trading desk.
    Mencegah race condition pada concurrent orders.
    """
    lock_key = f"trading_lock:{desk_id}:{user_id}"
    lock_value = str(uuid.uuid4())

    acquired = False
    for attempt in range(LOCK_RETRY):
        acquired = cache.add(lock_key, lock_value, timeout=timeout)
        if acquired:
            break
        logger.warning("Lock contention on desk %s attempt %d", desk_id, attempt + 1)
        time.sleep(LOCK_RETRY_DELAY * (attempt + 1))

    if not acquired:
        raise RuntimeError(f"Could not acquire trading lock for desk {desk_id} — try again")

    try:
        yield lock_value
    finally:
        # Only release if we still own the lock
        current = cache.get(lock_key)
        if current == lock_value:
            cache.delete(lock_key)


def generate_idempotency_key(user_id: str, desk_id: str, amount: str, instrument: str) -> str:
    """
    Generate idempotency key untuk prevent duplicate orders.
    Same inputs = same key = duplicate detected.
    """
    payload = f"{user_id}:{desk_id}:{amount}:{instrument}:{timezone.now().strftime('%Y%m%d%H%M')}"
    return hashlib.sha256(payload.encode()).hexdigest()


@transaction.atomic
def process_trading_order(
    desk_id: str,
    user_id: str,
    instrument: str,
    direction: str,
    amount: Decimal,
    price: Decimal,
    currency: str = "IDR",
    idempotency_key: str = None,
) -> dict:
    """
    Process trading order dengan:
    1. Distributed lock (Redis)
    2. Idempotency check
    3. Pessimistic DB lock (SELECT FOR UPDATE)
    4. Atomic transaction
    """
    from .models import TradingDesk
    from apps.compliance.models import TransactionMonitor

    # Check idempotency
    if idempotency_key:
        cache_key = f"order_idem:{idempotency_key}"
        existing = cache.get(cache_key)
        if existing:
            logger.info("Duplicate order detected: %s", idempotency_key)
            return {"status": "duplicate", "existing_order": existing}

    with trading_desk_lock(desk_id, user_id):
        # Pessimistic lock on trading desk
        try:
            desk = TradingDesk.objects.select_for_update(nowait=True).get(
                id=desk_id, is_active=True
            )
        except TradingDesk.DoesNotExist:
            raise ValueError(f"Trading desk {desk_id} not found or inactive")
        except Exception:
            raise RuntimeError("Trading desk is locked by another transaction")

        # Check risk limits
        if desk.risk_limit and amount > desk.risk_limit:
            raise ValueError(f"Order amount {amount} exceeds desk risk limit {desk.risk_limit}")

        if desk.daily_var_limit:
            today_volume = TransactionMonitor.objects.filter(
                created_at__date=timezone.now().date(),
                metadata__desk_id=str(desk_id),
            ).aggregate(total=transaction.Sum('amount'))['total'] or Decimal('0')

            if today_volume + amount > desk.daily_var_limit:
                raise ValueError(f"Daily VaR limit exceeded: {today_volume + amount} > {desk.daily_var_limit}")

        # Create transaction record
        order_id = str(uuid.uuid4())
        txn = TransactionMonitor.objects.create(
            user_id=user_id,
            transaction_id=order_id,
            amount=amount,
            currency=currency,
            transaction_type='payment',
            status='pending',
            risk_score=_calculate_risk_score(amount, instrument, direction),
            metadata={
                'desk_id': str(desk_id),
                'instrument': instrument,
                'direction': direction,
                'price': str(price),
                'idempotency_key': idempotency_key,
            }
        )

        # Cache idempotency key — 24 hours
        if idempotency_key:
            cache.set(f"order_idem:{idempotency_key}", {
                'order_id': order_id,
                'status': 'created',
                'amount': str(amount),
                'instrument': instrument,
            }, timeout=86400)

        logger.info("Trading order created: %s desk=%s instrument=%s amount=%s",
            order_id, desk_id, instrument, amount)

        return {
            "status": "created",
            "order_id": order_id,
            "transaction_id": str(txn.id),
            "instrument": instrument,
            "direction": direction,
            "amount": str(amount),
            "price": str(price),
            "risk_score": txn.risk_score,
        }


def _calculate_risk_score(amount: Decimal, instrument: str, direction: str) -> float:
    """Simple risk scoring — replace with ML model in production."""
    score = 0.0
    if amount > Decimal('1000000000'):  # > 1B IDR
        score += 0.5
    if instrument in ['options', 'futures', 'derivatives']:
        score += 0.3
    if direction == 'short':
        score += 0.2
    return min(score, 1.0)
