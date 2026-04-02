with open('apps/compliance/views.py', 'r') as f:
    c = f.read()

c = c.replace(
    'from .models import (',
    'from .serializers import (\n    OJKIncidentSerializer, InformationBarrierSerializer, RemoteWipeSerializer,\n    SecureFileLinkSerializer, DLPRuleSerializer, HelpdeskTicketSerializer,\n    InstitutionBadgeSerializer,\n)\nfrom .models import (',
    1
)

fixes = [
    ('class OJKIncidentViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class OJKIncidentViewSet(viewsets.ModelViewSet):\n    serializer_class = OJKIncidentSerializer\n    permission_classes = [IsAuthenticated]'),
    ('class InformationBarrierViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class InformationBarrierViewSet(viewsets.ModelViewSet):\n    serializer_class = InformationBarrierSerializer\n    permission_classes = [IsAuthenticated]'),
    ('class RemoteWipeViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class RemoteWipeViewSet(viewsets.ModelViewSet):\n    serializer_class = RemoteWipeSerializer\n    permission_classes = [IsAuthenticated]'),
    ('class SecureFileLinkViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class SecureFileLinkViewSet(viewsets.ModelViewSet):\n    serializer_class = SecureFileLinkSerializer\n    permission_classes = [IsAuthenticated]'),
    ('class DLPRuleViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class DLPRuleViewSet(viewsets.ModelViewSet):\n    serializer_class = DLPRuleSerializer\n    permission_classes = [IsAuthenticated]'),
    ('class HelpdeskTicketViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class HelpdeskTicketViewSet(viewsets.ModelViewSet):\n    serializer_class = HelpdeskTicketSerializer\n    permission_classes = [IsAuthenticated]'),
    ('class InstitutionBadgeViewSet(viewsets.ModelViewSet):\n    permission_classes = [IsAuthenticated]',
     'class InstitutionBadgeViewSet(viewsets.ModelViewSet):\n    serializer_class = InstitutionBadgeSerializer\n    permission_classes = [IsAuthenticated]'),
]

for old, new in fixes:
    c = c.replace(old, new)

with open('apps/compliance/views.py', 'w') as f:
    f.write(c)

print("Done!")
