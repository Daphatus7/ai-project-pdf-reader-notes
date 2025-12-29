# @file        user_model.py
# @description 
# @author      [Peiyu Wang]
# @date        28/12/2025
# @license     © 2025 . All rights reserved.


from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

    #continue to add more info
