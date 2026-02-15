/**
 * @file        auth.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Sunday
 * @license     © 2026 . All rights reserved.
 */


// 存放：
//   - LoginRequest, LoginResponse
//   - RegisterRequest, RegisterResponse
//   - User, AuthToken, RefreshTokenRequest
//   - AuthState 等认证相关类型

export interface LoginRequest {
	username: string;
	password: string;
	remember: boolean;
	device_info: string | null;
}

export interface LoginResponse {
	refresh_token: string;
}

export interface RegisterRequest {
	email: string;
	username: string;
	password: string;
	confirm_password: string;
	firstname: string|null;
	lastname: string|null;
}

export interface RegisterResponse {
	refresh_token: string;
}

export interface LogoutRequest {
	token: string;
}

export interface LogoutResponse {}

export interface RefreshRequest {}

export interface RefreshResponse {}