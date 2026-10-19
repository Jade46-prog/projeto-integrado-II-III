package br.com.anhanguera.academico.users;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import br.com.anhanguera.academico.courses.CourseRepository;
import br.com.anhanguera.academico.lessons.*;
import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.TransactionLock;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class UserDeletionTest {
  final AcademicUserRepository users = mock(AcademicUserRepository.class);
  final LessonRepository lessons = mock(LessonRepository.class);
  final AccessTokenRepository tokens = mock(AccessTokenRepository.class);
  final Access access = mock(Access.class);
  final UserService service = new UserService(users, mock(CourseRepository.class), lessons,
    tokens, access, mock(TransactionLock.class), mock(PasswordEncoder.class));

  AcademicUser account(String role) {
    var user = new AcademicUser();
    user.role = role;
    when(users.findById(user.id)).thenReturn(Optional.of(user));
    return user;
  }

  @Test
  void deletesProfessorAndCoordinatorAndRevokesSessions() {
    for (var role : List.of("PROFESSOR", "COORDINATOR")) {
      var user = account(role);
      service.delete(user.id);
      verify(tokens).deleteByUserId(user.id);
      verify(users).delete(user);
      assertTrue(user.courses.isEmpty());
    }
    verify(access, times(2)).admin();
  }

  @Test
  void keepsProfessorWithLessons() {
    var user = account("PROFESSOR");
    when(lessons.findByProfessorId(user.id)).thenReturn(List.of(new Lesson()));
    var error = assertThrows(ResponseStatusException.class, () -> service.delete(user.id));
    assertEquals(409, error.getStatusCode().value());
    verify(users, never()).delete(any());
    verifyNoInteractions(tokens);
  }

  @Test
  void doesNotDeleteAdministrator() {
    var user = account("ADMIN");
    assertThrows(ResponseStatusException.class, () -> service.delete(user.id));
    verify(users, never()).delete(any());
    verifyNoInteractions(tokens);
  }

  @Test
  void checksPermissionBeforeChangingData() {
    doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN))
      .when(access).admin();
    assertThrows(ResponseStatusException.class, () -> service.delete(UUID.randomUUID()));
    verifyNoInteractions(users, lessons, tokens);
  }
}
