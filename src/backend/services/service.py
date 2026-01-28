# @file        service.py
# @description 
# @author      [Peiyu Wang]
# @date        30/12/2025
# @license     © 2025 . All rights reserved.
from abc import ABC, abstractmethod


class Service(ABC):
    
    #abstract base class for services
    @abstractmethod
    def start(self):
        pass
    
    @abstractmethod
    def get(self):
        pass
    
    
    