package br.com.anhanguera.academico.security;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BootstrapAdmin implements ApplicationRunner {

  private final br.com.anhanguera.academico.users.AcademicUserRepository users;
  private final TransactionLock lock;
  private final PasswordEncoder passwords;
  private final String cpf, password;

  public BootstrapAdmin(
    br.com.anhanguera.academico.users.AcademicUserRepository users,
    TransactionLock lock,
    PasswordEncoder passwords,
    @Value("${app.admin-cpf}") String cpf,
    @Value("${app.admin-password}") String password
  ) {
    this.users = users;
    this.lock = lock;
    this.passwords = passwords;
    this.cpf = cpf;
    this.password = password;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    lock.acquire();
    if (users.existsByRole("ADMIN")) return;
    if (
      password.length() < 12 ||
      password.getBytes(StandardCharsets.UTF_8).length > 72
    ) throw new IllegalStateException(
      "Defina ADMIN_PASSWORD com pelo menos 12 caracteres e no máximo 72 bytes para criar o primeiro administrador."
    );
    var user = new br.com.anhanguera.academico.users.AcademicUser();
    user.name = "Admin";
    user.cpf = AuthService.cpf(cpf);
    user.passwordHash = passwords.encode(password);
    user.role = "ADMIN";
    users.save(user);
  }
}
