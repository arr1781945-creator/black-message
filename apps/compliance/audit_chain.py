import hashlib
import json
from django.utils import timezone
from django.db import models

def compute_chain_hash(prev_hash: str, entry_data: dict) -> str:
    """Blockchain-style hash - setiap log hash dari log sebelumnya"""
    payload = f"{prev_hash}{json.dumps(entry_data, sort_keys=True, default=str)}"
    return hashlib.sha256(payload.encode()).hexdigest()

def get_last_hash(workspace_id: str) -> str:
    """Ambil hash terakhir dari chain"""
    from apps.compliance.models import ImmutableAuditLog
    last = ImmutableAuditLog.objects.filter(
        workspace_id=workspace_id
    ).order_by('-created_at').first()
    return last.chain_hash if last else "GENESIS_BLOCK_BLACKMESS"

def create_audit_entry(
    workspace_id: str,
    sender_id: str,
    receiver_id: str,
    message_hash: str,
    channel: str,
    action: str,
    device_info: dict = None,
    ip_address: str = None
):
    """Buat entry audit log yang tidak bisa dimanipulasi"""
    from apps.compliance.models import ImmutableAuditLog
    
    prev_hash = get_last_hash(workspace_id)
    
    entry_data = {
        'workspace_id': workspace_id,
        'sender_id': sender_id,
        'receiver_id': receiver_id,
        'message_hash': message_hash,
        'channel': channel,
        'action': action,
        'timestamp': timezone.now().isoformat(),
        'device_info': device_info or {},
        'ip_address': ip_address or '',
    }
    
    chain_hash = compute_chain_hash(prev_hash, entry_data)
    
    return ImmutableAuditLog.objects.create(
        workspace_id=workspace_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        message_hash=message_hash,
        channel=channel,
        action=action,
        device_info=json.dumps(device_info or {}),
        ip_address=ip_address or '',
        prev_hash=prev_hash,
        chain_hash=chain_hash,
    )

def verify_audit_chain(workspace_id: str) -> dict:
    """Verifikasi integritas chain - kalau ada yang dimanipulasi ketahuan"""
    from apps.compliance.models import ImmutableAuditLog
    
    logs = ImmutableAuditLog.objects.filter(
        workspace_id=workspace_id
    ).order_by('created_at')
    
    if not logs.exists():
        return {'valid': True, 'message': 'No logs found', 'count': 0}
    
    prev_hash = "GENESIS_BLOCK_BLACKMESS"
    broken_at = None
    
    for log in logs:
        entry_data = {
            'workspace_id': log.workspace_id,
            'sender_id': log.sender_id,
            'receiver_id': log.receiver_id,
            'message_hash': log.message_hash,
            'channel': log.channel,
            'action': log.action,
            'timestamp': log.created_at.isoformat(),
            'device_info': json.loads(log.device_info) if log.device_info else {},
            'ip_address': log.ip_address,
        }
        expected_hash = compute_chain_hash(prev_hash, entry_data)
        
        if expected_hash != log.chain_hash or log.prev_hash != prev_hash:
            broken_at = log.id
            break
        
        prev_hash = log.chain_hash
    
    if broken_at:
        return {
            'valid': False,
            'message': f'Chain broken at entry {broken_at} - possible tampering!',
            'broken_at': str(broken_at)
        }
    
    return {
        'valid': True,
        'message': 'Audit chain integrity verified',
        'count': logs.count()
    }
