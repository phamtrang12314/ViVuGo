package com.vivugo.backend.config;

import com.vivugo.backend.model.enums.RoleType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ApiRateLimitFilter apiRateLimitFilter;
    private final JwtAuthFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final String allowedOriginPatterns;

    public SecurityConfig(
            ApiRateLimitFilter apiRateLimitFilter,
            JwtAuthFilter jwtAuthFilter,
            AuthenticationProvider authenticationProvider,
            @Value("${app.cors.allowed-origin-patterns:http://localhost:*,http://127.0.0.1:*}") String allowedOriginPatterns
    ) {
        this.apiRateLimitFilter = apiRateLimitFilter;
        this.jwtAuthFilter = jwtAuthFilter;
        this.authenticationProvider = authenticationProvider;
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    // Bean định nghĩa các quy tắc CORS
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Cho phép các nguồn gốc của Front-end
        List<String> originPatterns = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(pattern -> !pattern.isEmpty())
                .toList();
        configuration.setAllowedOriginPatterns(originPatterns);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())

                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(apiRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/admin/login",
                                "/api/auth/register",
                                "/api/auth/register/request-otp",
                                "/api/auth/forgot-password/request-otp",
                                "/api/auth/reset-password"
                        ).permitAll()
                        .requestMatchers("/api/auth/**", "/api/ai/chat").permitAll()

                        .requestMatchers("/api/tours", "/api/tours/**", "/api/recommendations/**", "/api/destinations/**", "/api/tour-types/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/tour/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/tour/*/reviewed").hasRole(RoleType.CUSTOMER.name())
                        .requestMatchers(HttpMethod.POST, "/api/reviews").hasRole(RoleType.CUSTOMER.name())
                        .requestMatchers(HttpMethod.POST, "/api/reviews/media").hasRole(RoleType.CUSTOMER.name())
                        .requestMatchers("/api/webhooks/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bookings/*").permitAll()
                        .requestMatchers("/images/**").permitAll()
                        .requestMatchers("/api/contact-messages").permitAll()
                        .requestMatchers("/api/contact-messages/chat/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()

                        .requestMatchers("/api/admin/**").hasRole(RoleType.ADMIN.name())
                        .requestMatchers("/", "/api", "/api/health", "/actuator/health", "/error").permitAll()

                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
