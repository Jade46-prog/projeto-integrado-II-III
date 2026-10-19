package br.com.anhanguera.academico.security;

import static br.com.anhanguera.academico.shared.Records.required;

import br.com.anhanguera.academico.shared.*;
import br.com.anhanguera.academico.users.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class AuthService {

  private final AcademicUserRepository users;
  private final AccessTokenRepository tokens;
  private final PasswordEncoder passwords;

  public AuthService(
    AcademicUserRepository users,
    AccessTokenRepository tokens,
    PasswordEncoder passwords
  ) {
    this.users = users;
    this.tokens = tokens;
    this.passwords = passwords;
  }

  public static String cpf(String input) {
    Access.valid(
      input != null &&
        input.matches("(?:[0-9]{11}|[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2})"),
      "CPF deve conter 11 dígitos."
    );
    return input.replaceAll("[^0-9]", "");
  }

  public static String hash(String value) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(
          value.getBytes(StandardCharsets.UTF_8)
        )
      );
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  @Transactional
  public ApiView.LoginView login(ApiModels.Login input) {
    Access.valid(
      input.password().getBytes(StandardCharsets.UTF_8).length <= 72,
      "A senha deve ter no máximo 72 bytes UTF-8."
    );
    var user = users
      .findByCpf(cpf(input.cpf()))
      .filter(
        u -> u.active && passwords.matches(input.password(), u.passwordHash)
      )
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.UNAUTHORIZED,
          "CPF ou senha inválidos."
        )
      );
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    String token = Base64.getUrlEncoder()
      .withoutPadding()
      .encodeToString(bytes);
    tokens.deleteByExpiresAtBefore(Instant.now());
    var accessToken = new AccessToken();
    accessToken.id = hash(token);
    accessToken.userId = user.id;
    accessToken.expiresAt = Instant.now().plusSeconds(28800);
    tokens.save(accessToken);
    return new ApiView.LoginView(
      token,
      "Bearer",
      28800,
      ApiView.UserView.of(user)
    );
  }

  public Optional<Access.Actor> authenticate(String token) {
    if (token == null || token.length() > 128) return Optional.empty();
    return tokens
      .findById(hash(token))
      .filter(t -> t.expiresAt.isAfter(Instant.now()))
      .flatMap(t -> users.findById(t.userId))
      .filter(u -> u.active)
      .map(u -> new Access.Actor(u.id, u.role));
  }

  public ApiView.UserView profile(UUID id) {
    return ApiView.UserView.of(required(users.findById(id)));
  }

  @Transactional
  public void logout(String token) {
    tokens.deleteById(hash(token));
  }
}
