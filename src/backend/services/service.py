from abc import ABC, abstractmethod


class Service(ABC):
    """Base service class"""
    
    
    def __init__(self):
        pass
    
    @abstractmethod
    def start(self):
        pass
    
    @abstractmethod
    def shut_down(self):
        pass
    
    @abstractmethod
    def restart(self):
        pass
    
    