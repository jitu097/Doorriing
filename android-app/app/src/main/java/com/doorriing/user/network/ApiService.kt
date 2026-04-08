package com.doorriing.user.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/v1/auth/signup")
    suspend fun signup(@Body request: SignupRequest): Response<LoginResponse>

    @POST("api/notification/save-token")
    suspend fun saveFcmToken(
        @Header("Authorization") authorization: String,
        @Body request: FcmTokenRequest
    ): Response<ApiResponse<Unit>>
}
