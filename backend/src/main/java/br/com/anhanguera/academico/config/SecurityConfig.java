package br.com.anhanguera.academico.config;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  SecurityFilterChain security(
    HttpSecurity http,
    AuthService auth,
    @Value("${app.cors-origins}") String origins
  ) throws Exception {
    var cors = new CorsConfiguration();
    cors.setAllowedOrigins(
      Arrays.stream(origins.split(",")).map(String::trim).toList()
    );
    cors.setAllowedMethods(
      List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
    );
    cors.setAllowedHeaders(List.of("Content-Type", "Authorization"));
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cors);
    // A API aceita somente Bearer explícito; não utiliza cookies de autenticação.
    http
      .csrf(c -> c.disable())
      .cors(c -> c.configurationSource(source))
      .sessionManagement(c ->
        c.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )
      .authorizeHttpRequests(c ->
        c
          .requestMatchers("/api/auth/login", "/api/public/**", "/error")
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .exceptionHandling(c ->
        c
          .authenticationEntryPoint((req, res, e) -> jsonError(res, 401))
          .accessDeniedHandler((req, res, e) -> jsonError(res, 403))
      )
      .addFilterBefore(
        new OncePerRequestFilter() {
          @Override
          protected void doFilterInternal(
            HttpServletRequest req,
            HttpServletResponse res,
            FilterChain chain
          ) throws ServletException, IOException {
            String header = req.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) auth
              .authenticate(header.substring(7))
              .ifPresent(actor ->
                SecurityContextHolder.getContext().setAuthentication(
                  new UsernamePasswordAuthenticationToken(
                    actor,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + actor.role()))
                  )
                )
              );
            chain.doFilter(req, res);
          }
        },
        UsernamePasswordAuthenticationFilter.class
      );
    return http.build();
  }

  private static void jsonError(HttpServletResponse res, int status)
    throws IOException {
    res.setStatus(status);
    res.setContentType("application/problem+json");
    res
      .getWriter()
      .write(
        "{\"status\":" + status + ",\"detail\":\"Acesso não autorizado.\"}"
      );
  }
}
