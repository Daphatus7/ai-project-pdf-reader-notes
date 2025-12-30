# @file        supabase.py
# @description 
# @author      [Peiyu Wang]
# @date        30/12/2025
# @license     © 2025 . All rights reserved.


import os
from supabase import create_client, Client


class Supabase:
    def __init__(self):
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
        
    def get_client(self):
        return self.__database
