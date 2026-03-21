package com.doorriing.user.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.doorriing.user.network.LoginRequest
import com.doorriing.user.network.LoginResponse
import com.doorriing.user.network.SignupRequest
import com.doorriing.user.repository.AuthRepository
import kotlinx.coroutines.launch
import retrofit2.Response

class AuthViewModel(private val repository: AuthRepository) : ViewModel() {

    private val _loginResult = MutableLiveData<Response<LoginResponse>>()
    val loginResult: LiveData<Response<LoginResponse>> = _loginResult

    private val _signupResult = MutableLiveData<Response<LoginResponse>>()
    val signupResult: LiveData<Response<LoginResponse>> = _signupResult

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun login(request: LoginRequest) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = repository.login(request)
                _loginResult.value = response
            } catch (e: Exception) {
                // Handle exception
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun signup(request: SignupRequest) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = repository.signup(request)
                _signupResult.value = response
            } catch (e: Exception) {
                // Handle exception
            } finally {
                _isLoading.value = false
            }
        }
    }
}
