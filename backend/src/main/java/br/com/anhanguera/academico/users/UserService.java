package br.com.anhanguera.academico.users;

import static br.com.anhanguera.academico.security.Access.*;
import static br.com.anhanguera.academico.shared.Records.required;

import br.com.anhanguera.academico.courses.*;
import br.com.anhanguera.academico.lessons.*;
import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {

  private final AcademicUserRepository users;
  private final CourseRepository courses;
  private final LessonRepository lessons;
  private final AccessTokenRepository tokens;
  private final Access access;
  private final TransactionLock lock;
  private final PasswordEncoder passwords;

  public UserService(
    AcademicUserRepository users,
    CourseRepository courses,
    LessonRepository lessons,
    AccessTokenRepository tokens,
    Access access,
    TransactionLock lock,
    PasswordEncoder passwords
  ) {
    this.users = users;
    this.courses = courses;
    this.lessons = lessons;
    this.tokens = tokens;
    this.access = access;
    this.lock = lock;
    this.passwords = passwords;
  }

  public List<ApiView.UserView> list() {
    access.admin();
    return users
      .findAllByOrderByNameAsc()
      .stream()
      .map(ApiView.UserView::of)
      .toList();
  }

  @Transactional
  public void delete(UUID id) {
    access.admin();
    lock.acquire();
    var user = required(users.findById(id));
    valid(
      user.role.equals("PROFESSOR") || user.role.equals("COORDINATOR"),
      "Somente professores e coordenadores podem ser excluídos."
    );
    conflict(
      lessons.findByProfessorId(id).isEmpty(),
      "Reatribua ou exclua as aulas antes de excluir o professor."
    );
    tokens.deleteByUserId(id);
    user.courses.clear();
    users.flush();
    users.delete(user);
    users.flush();
  }

  @Transactional
  public ApiView.UserView save(UUID id, ApiModels.UserInput input) {
    access.admin();
    lock.acquire();
    String cpf = AuthService.cpf(input.cpf());
    valid(
      id != null || input.password() != null,
      "Informe uma senha para a nova conta."
    );
    valid(
      input.password() == null ||
        input.password().getBytes(StandardCharsets.UTF_8).length <= 72,
      "A senha deve ter no máximo 72 bytes UTF-8."
    );
    valid(
      input.role() == ApiModels.Role.ADMIN || !input.courseIds().isEmpty(),
      "Vincule ao menos um curso."
    );
    valid(
      input.role() != ApiModels.Role.ADMIN || input.courseIds().isEmpty(),
      "Admin não necessita de vínculos de curso."
    );
    var user = id == null ? new AcademicUser() : required(users.findById(id));
    if (id != null) {
      valid(user.cpf.equals(cpf), "O CPF não pode ser alterado.");
      valid(
        user.role.equals(input.role().name()),
        "O perfil não pode ser alterado."
      );
      if (
        input.role() == ApiModels.Role.PROFESSOR
      ) for (var lesson : lessons.findByProfessorId(id))
        conflict(
          input.courseIds().contains(lesson.courseId),
          "Reatribua ou exclua as aulas antes de remover o curso do professor."
        );
    }
    user.name = input.name().trim();
    user.cpf = cpf;
    user.role = input.role().name();
    if (input.password() != null) {
      user.passwordHash = passwords.encode(input.password());
      if (id != null) tokens.deleteByUserId(id);
    }
    user.courses.clear();
    for (UUID courseId : input.courseIds())
      user.courses.add(required(courses.findById(courseId)));
    return ApiView.UserView.of(users.saveAndFlush(user));
  }
}
