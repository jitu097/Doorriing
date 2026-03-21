package com.doorriing.user.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("api/v1/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/v1/auth/signup")
    suspend fun signup(@Body request: SignupRequest): Response<LoginResponse>

    @POST("api/save-fcm-token")
    suspend fun saveFcmToken(@Body request: FcmTokenRequest): Response<ApiResponse<Unit>>
}
