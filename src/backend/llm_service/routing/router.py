"""
LLM router implementation
Translated from TypeScript LLMRouter.ts
"""
from typing import List, Dict, Optional
from ..types import UnifiedInput, LLMProviderName, RoutingConfig, LLMError
from ..providers.base import LLMProvider
from .strategies import (
    RoutingStrategy, CostOptimizedStrategy, SpeedOptimizedStrategy,
    QualityOptimizedStrategy, BalancedStrategy
)


class LLMRouter:
    """LLM router for provider selection"""
    
    def __init__(self, config: RoutingConfig):
        self.providers: Dict[LLMProviderName, LLMProvider] = {}
        self.strategies: Dict[str, RoutingStrategy] = {}
        self.config = config
        self._initialize_strategies()
    
    def _initialize_strategies(self):
        """Initialize routing strategies"""
        self.strategies['cost'] = CostOptimizedStrategy()
        self.strategies['speed'] = SpeedOptimizedStrategy()
        self.strategies['quality'] = QualityOptimizedStrategy()
        self.strategies['balanced'] = BalancedStrategy()
    
    def register_provider(self, provider: LLMProvider):
        """Register LLM provider"""
        self.providers[provider.name] = provider
    
    def unregister_provider(self, name: LLMProviderName):
        """Unregister LLM provider"""
        if name in self.providers:
            del self.providers[name]
    
    def get_providers(self) -> List[LLMProvider]:
        """Get all registered providers"""
        return list(self.providers.values())
    
    def get_enabled_providers(self) -> List[LLMProvider]:
        """Get enabled providers"""
        # For now, all registered providers are considered enabled
        # In the future, we could add an enabled flag to providers
        return self.get_providers()
    
    def select_provider(self, input_data: UnifiedInput) -> LLMProvider:
        """Select best provider for input"""
        enabled_providers = self.get_enabled_providers()
        
        if not enabled_providers:
            raise LLMError('No providers available', 'openai')
        
        strategy = self.strategies.get(self.config.routing_strategy)
        if not strategy:
            raise LLMError(f'Unknown routing strategy: {self.config.routing_strategy}', 'openai')
        
        try:
            return strategy.select_provider(enabled_providers, input_data)
        except Exception as e:
            # If main strategy fails, try fallback providers
            if self.config.fallback_providers:
                fallback_providers = [
                    p for p in enabled_providers
                    if p.name in self.config.fallback_providers
                ]
                
                if fallback_providers:
                    return strategy.select_provider(fallback_providers, input_data)
            
            raise e
    
    async def get_provider_health(self) -> Dict[LLMProviderName, bool]:
        """Get health status of all providers"""
        health_map = {}
        
        for name, provider in self.providers.items():
            try:
                is_healthy = await provider.health_check()
                health_map[name] = is_healthy
            except Exception:
                health_map[name] = False
        
        return health_map
    
    def update_config(self, config: Dict):
        """Update routing configuration"""
        self.config = RoutingConfig(**{**self.config.dict(), **config})
    
    def get_stats(self) -> Dict:
        """Get router statistics"""
        return {
            'total_providers': len(self.providers),
            'enabled_providers': len(self.get_enabled_providers()),
            'strategies': list(self.strategies.keys()),
            'config': self.config.dict()
        }
