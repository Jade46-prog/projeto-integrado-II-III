package br.com.anhanguera.academico.security;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class Access {

  public record Actor(UUID id, String role) {}

  private final br.com.anhanguera.academico.users.AcademicUserRepository users;

  public Access(
    br.com.anhanguera.academico.users.AcademicUserRepository users
  ) {
    this.users = users;
  }

  public Actor actor() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (
      authentication == null ||
      !(authentication.getPrincipal() instanceof Actor a)
    ) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return a;
  }

  public void admin() {
    require(actor().role().equals("ADMIN"));
  }

  public void coordinate(UUID courseId) {
    var a = actor();
    require(a.role().equals("COORDINATOR") && linked(a.id(), courseId));
  }

  @org.springframework.transaction.annotation.Transactional(readOnly = true)
  public boolean linked(UUID userId, UUID courseId) {
    return users
      .findById(userId)
      .map(u -> u.courses.stream().anyMatch(c -> c.id.equals(courseId)))
      .orElse(false);
  }

  public void readCourse(UUID courseId) {
    var a = actor();
    require(a.role().equals("ADMIN") || linked(a.id(), courseId));
  }

  public void professor(UUID professorId) {
    var a = actor();
    require(a.role().equals("PROFESSOR") && a.id().equals(professorId));
  }

  public static void require(boolean ok) {
    if (!ok) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Sem permissão para esta operação."
    );
  }

  public static void valid(boolean ok, String message) {
    if (!ok) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  public static void conflict(boolean ok, String message) {
    if (!ok) throw new ResponseStatusException(HttpStatus.CONFLICT, message);
  }
}
