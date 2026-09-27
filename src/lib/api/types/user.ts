// Mirrors openapi/api.yaml → UserRead, LoginRequest, RegisterRequest, TokenResponse.

export interface UserRead {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  roles: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string | null;
}

export interface TokenResponse {
  message: string;
  token_type?: string;
}
