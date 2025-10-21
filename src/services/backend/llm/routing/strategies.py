"""
Routing strategies for LLM providers
Translated from TypeScript LLMRouter.ts strategies
"""
from abc import ABC, abstractmethod
from typing import List
from ..types import UnifiedInput
from ..providers.base import LLMProvider


class RoutingStrategy(ABC):
    """Abstract routing strategy"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Strategy name"""
        pass
    
    @abstractmethod
    def select_provider(self, providers: List[LLMProvider], input_data: UnifiedInput) -> LLMProvider:
        """Select best provider for input"""
        pass


class CostOptimizedStrategy(RoutingStrategy):
    """Cost-optimized routing strategy"""
    
    @property
    def name(self) -> str:
        return 'cost'
    
    def select_provider(self, providers: List[LLMProvider], input_data: UnifiedInput) -> LLMProvider:
        """Select cheapest provider"""
        valid_providers = [p for p in providers if p.can_handle(input_data)]
        
        if not valid_providers:
            raise ValueError('No providers can handle the input')
        
        # Sort by cost per token, select cheapest
        return min(valid_providers, key=lambda p: p.capabilities.cost_per_token or float('inf'))


class SpeedOptimizedStrategy(RoutingStrategy):
    """Speed-optimized routing strategy"""
    
    @property
    def name(self) -> str:
        return 'speed'
    
    def select_provider(self, providers: List[LLMProvider], input_data: UnifiedInput) -> LLMProvider:
        """Select fastest provider"""
        valid_providers = [p for p in providers if p.can_handle(input_data)]
        
        if not valid_providers:
            raise ValueError('No providers can handle the input')
        
        # Sort by average response time, select fastest
        return min(valid_providers, key=lambda p: p.capabilities.average_response_time or float('inf'))


class QualityOptimizedStrategy(RoutingStrategy):
    """Quality-optimized routing strategy"""
    
    @property
    def name(self) -> str:
        return 'quality'
    
    def select_provider(self, providers: List[LLMProvider], input_data: UnifiedInput) -> LLMProvider:
        """Select highest quality provider"""
        valid_providers = [p for p in providers if p.can_handle(input_data)]
        
        if not valid_providers:
            raise ValueError('No providers can handle the input')
        
        # Score providers based on quality metrics
        scored_providers = [
            (provider, self._calculate_quality_score(provider, input_data))
            for provider in valid_providers
        ]
        
        # Return provider with highest score
        return max(scored_providers, key=lambda x: x[1])[0]
    
    def _calculate_quality_score(self, provider: LLMProvider, input_data: UnifiedInput) -> float:
        """Calculate quality score for provider"""
        score = 100.0  # Base score
        
        # Modality support score
        modalities = input_data.metadata.get('modalities', [])
        modality_score = sum(
            50 for modality in modalities
            if modality in provider.capabilities.supported_modalities
        )
        score += modality_score
        
        # Input size adaptability
        total_size = input_data.metadata.get('total_size', 0)
        if total_size > 0:
            size_ratio = provider.capabilities.max_input_size / total_size
            score += min(size_ratio * 20, 50)
        
        # Max tokens ratio
        max_tokens = input_data.metadata.get('max_tokens', 1000)
        token_ratio = provider.capabilities.max_tokens / max_tokens
        score += min(token_ratio * 10, 30)
        
        # Cost penalty (quality first, cost secondary)
        if provider.capabilities.cost_per_token:
            score -= provider.capabilities.cost_per_token * 1000000  # Light penalty
        
        return score


class BalancedStrategy(RoutingStrategy):
    """Balanced routing strategy"""
    
    @property
    def name(self) -> str:
        return 'balanced'
    
    def select_provider(self, providers: List[LLMProvider], input_data: UnifiedInput) -> LLMProvider:
        """Select provider with balanced score"""
        valid_providers = [p for p in providers if p.can_handle(input_data)]
        
        if not valid_providers:
            raise ValueError('No providers can handle the input')
        
        # Score providers based on balanced metrics
        scored_providers = [
            (provider, self._calculate_balanced_score(provider, input_data))
            for provider in valid_providers
        ]
        
        # Return provider with highest score
        return max(scored_providers, key=lambda x: x[1])[0]
    
    def _calculate_balanced_score(self, provider: LLMProvider, input_data: UnifiedInput) -> float:
        """Calculate balanced score for provider"""
        # Quality score (40%)
        quality_score = self._calculate_quality_score(provider, input_data)
        
        # Speed score (30%)
        speed_score = self._calculate_speed_score(provider)
        
        # Cost score (30%)
        cost_score = self._calculate_cost_score(provider)
        
        return quality_score * 0.4 + speed_score * 0.3 + cost_score * 0.3
    
    def _calculate_quality_score(self, provider: LLMProvider, input_data: UnifiedInput) -> float:
        """Calculate quality score"""
        score = 100.0
        
        # Modality support
        modalities = input_data.metadata.get('modalities', [])
        modality_score = sum(
            50 for modality in modalities
            if modality in provider.capabilities.supported_modalities
        )
        score += modality_score
        
        # Input size adaptability
        total_size = input_data.metadata.get('total_size', 0)
        if total_size > 0:
            size_ratio = provider.capabilities.max_input_size / total_size
            score += min(size_ratio * 20, 50)
        
        return score
    
    def _calculate_speed_score(self, provider: LLMProvider) -> float:
        """Calculate speed score"""
        response_time = provider.capabilities.average_response_time or 5000
        # Faster response time = higher score, max 100
        return max(0, 100 - (response_time / 50))
    
    def _calculate_cost_score(self, provider: LLMProvider) -> float:
        """Calculate cost score"""
        cost_per_token = provider.capabilities.cost_per_token or 0.0001
        # Lower cost = higher score, max 100
        return max(0, 100 - (cost_per_token * 1000000))
