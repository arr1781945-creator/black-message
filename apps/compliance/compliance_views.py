from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .audit_chain import verify_audit_chain, create_audit_entry
from .models import ImmutableAuditLog, ChannelPolicy, EmergencyAccessLog
import datetime

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compliance_dashboard(request):
    """Dashboard compliance officer - standar OJK/BI"""
    workspace_id = request.query_params.get('workspace_id', 'default')
    
    # Verifikasi integritas audit chain
    chain_status = verify_audit_chain(workspace_id)
    
    # Statistik 30 hari terakhir
    thirty_days = timezone.now() - datetime.timedelta(days=30)
    recent_logs = ImmutableAuditLog.objects.filter(
        workspace_id=workspace_id,
        created_at__gte=thirty_days
    )
    
    # Brute force attempts dari django-axes
    try:
        from axes.models import AccessAttempt
        brute_force = AccessAttempt.objects.filter(
            attempt_time__gte=thirty_days
        ).count()
    except:
        brute_force = 0
    
    return Response({
        'audit_chain': chain_status,
        'stats': {
            'total_messages': recent_logs.filter(action='sent').count(),
            'deleted_messages': recent_logs.filter(action='deleted').count(),
            'edited_messages': recent_logs.filter(action='edited').count(),
            'unique_senders': recent_logs.values('sender_id').distinct().count(),
            'brute_force_attempts': brute_force,
        },
        'ipfs_status': {
            'network': 'private',
            'nodes': ['127.0.0.1:4001'],
            'encrypted': True,
        },
        'recent_logs': list(recent_logs.order_by('-created_at')[:20].values(
            'sender_id', 'action', 'channel', 'ip_address', 'created_at', 'chain_hash'
        ))
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_chain(request):
    """Verifikasi integritas audit chain"""
    workspace_id = request.query_params.get('workspace_id', 'default')
    result = verify_audit_chain(workspace_id)
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def channel_policies(request):
    """Ambil kebijakan channel"""
    workspace_id = request.query_params.get('workspace_id', 'default')
    policies = ChannelPolicy.objects.filter(workspace_id=workspace_id)
    return Response([{
        'channel': p.channel_name,
        'type': p.channel_type,
        'allow_self_destruct': p.allow_self_destruct,
        'retention_days': p.retention_days,
        'require_audit': p.require_audit,
    } for p in policies])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_emergency_access(request):
    """Request akses darurat - butuh 2 dari 3 approval"""
    log = EmergencyAccessLog.objects.create(
        workspace_id=request.data.get('workspace_id', 'default'),
        requested_by=str(request.user.id),
        reason=request.data.get('reason', ''),
        target_user_id=request.data.get('target_user_id', ''),
    )
    return Response({
        'id': str(log.id),
        'message': 'Emergency access request created. Waiting for 2 approvals.',
        'status': 'pending'
    })
