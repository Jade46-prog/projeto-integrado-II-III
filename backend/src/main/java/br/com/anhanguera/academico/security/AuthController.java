package br.com.anhanguera.academico.security;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService auth;
  private final Access access;

  public AuthController(AuthService auth, Access access) {
    this.auth = auth;
    this.access = access;
  }

  @PostMapping("/login")
  public ApiView.LoginView login(@Valid @RequestBody ApiModels.Login input) {
    return auth.login(input);
  }

  @GetMapping("/me")
  public ApiView.UserView me() {
    return auth.profile(access.actor().id());
  }

  @PostMapping("/logout")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void logout(@RequestHeader("Authorization") String header) {
    auth.logout(header.substring(7));
  }
}
