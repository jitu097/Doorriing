package com.doorriing.user.repository

import com.doorriing.user.network.ApiService
import com.doorriing.user.network.LoginRequest
import com.doorriing.user.network.SignupRequest
import com.doorriing.user.network.LoginResponse
import retrofit2.Response

class AuthRepository(private val apiService: ApiService) {
    suspend fun login(request: LoginRequest): Response<LoginResponse> {
        return apiService.login(request)
    }

    suspend fun signup(request: SignupRequest): Response<LoginResponse> {
        return apiService.signup(request)
    }

    suspend fun saveFcmToken(request: com.doorriing.user.network.FcmTokenRequest): Response<com.doorriing.user.network.ApiResponse<Unit>> {
        return apiService.saveFcmToken(request)
    }
}
