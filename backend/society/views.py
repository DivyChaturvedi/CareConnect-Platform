from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminOrReadOnly

from .models import Society, Block, Flat
from .serializers import (
    SocietySerializer,
    BlockSerializer,
    FlatSerializer,
)


class SocietyViewSet(viewsets.ModelViewSet):
    queryset = Society.objects.all()
    serializer_class = SocietySerializer

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    permission_classes = [IsAdminOrReadOnly]   # ← updated

    search_fields = ["name", "city", "state"]
    ordering_fields = ["name", "created_at"]


class BlockViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAdminOrReadOnly]   # ← updated
    queryset = Block.objects.all()
    serializer_class = BlockSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["society"]


class FlatViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAdminOrReadOnly]   # ← updated
    queryset = Flat.objects.all()
    serializer_class = FlatSerializer

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["block"]