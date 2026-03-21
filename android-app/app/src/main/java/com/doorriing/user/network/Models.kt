package com.doorriing.user.network

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("status") val status: String,
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: User
)

data class SignupRequest(
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String,
    @SerializedName("phone") val phone: String
)

data class User(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String
)

data class FcmTokenRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("fcmToken") val fcmToken: String
)

data class ApiResponse<T>(
    @SerializedName("status") val status: String,
    @SerializedName("data") val data: T?,
    @SerializedName("message") val message: String?
)
