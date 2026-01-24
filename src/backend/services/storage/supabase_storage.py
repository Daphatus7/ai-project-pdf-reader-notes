# @file        supabase.py
# @description 
# @author      [Peiyu Wang]
# @date        30/12/2025
# @license     © 2025 . All rights reserved.


import os
import dotenv
import jwt
from fastapi import Header, HTTPException
from supabase import create_client, Client
from src.backend.services.service import Service


class Database(Service):
    def get(self):
        return self.__database

    def start(self):
        try:
            url: str = os.environ.get("SUPABASE_URL")
            if url is None:
                raise ValueError("SUPABASE_URL environment variable is not set.")
        except Exception as e:
            raise ValueError("SUPABASE_URL environment variable is not set.") from e
        try:
            key: str = os.environ.get("SUPABASE_KEY")
            if key is None:
                raise ValueError("SUPABASE_KEY environment variable is not set.")
        except Exception as e:
            raise ValueError("SUPABASE_KEY environment variable is not set.") from e

        self.__database: Client = create_client(url, key)

    def __init__(self):
        dotenv.load_dotenv() #todo fix this in production
        self.__database = None
        
    
    

