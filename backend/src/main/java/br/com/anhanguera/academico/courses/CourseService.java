package br.com.anhanguera.academico.courses;

import static br.com.anhanguera.academico.security.Access.*;
import static br.com.anhanguera.academico.shared.Records.required;

import br.com.anhanguera.academico.courses.*;
import br.com.anhanguera.academico.groups.*;
import br.com.anhanguera.academico.lessons.*;
import br.com.anhanguera.academico.notifications.*;
import br.com.anhanguera.academico.rooms.*;
import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import br.com.anhanguera.academico.subjects.*;
import br.com.anhanguera.academico.users.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CourseService {

  private final CourseRepository courses;
  private final StudentGroupRepository groups;
  private final AcademicUserRepository users;
  private final LessonRepository lessons;
  private final NotificationRepository notifications;
  private final Access access;
  private final TransactionLock lock;

  public CourseService(
    CourseRepository courses,
    StudentGroupRepository groups,
    AcademicUserRepository users,
    LessonRepository lessons,
    NotificationRepository notifications,
    Access access,
    TransactionLock lock
  ) {
    this.courses = courses;
    this.groups = groups;
    this.users = users;
    this.lessons = lessons;
    this.notifications = notifications;
    this.access = access;
    this.lock = lock;
  }

  public List<ApiView.CourseView> list(boolean anonymous) {
    if (anonymous || access.actor().role().equals("ADMIN")) return courses
      .findAllByOrderByNameAsc()
      .stream()
      .map(ApiView.CourseView::of)
      .toList();
    return required(users.findById(access.actor().id()))
      .courses.stream()
      .sorted(Comparator.comparing(c -> c.name))
      .map(ApiView.CourseView::of)
      .toList();
  }

  public Map<String, List<ApiView.StaffView>> staff(UUID id) {
    access.readCourse(id);
    return Map.of(
      "users",
      users
        .staff(id)
        .stream()
        .map(u -> new ApiView.StaffView(u.id, u.name, u.role))
        .toList()
    );
  }

  @Transactional
  public ApiView.CourseView save(UUID id, ApiModels.CourseInput input) {
    access.admin();
    lock.acquire();
    var c = id == null ? new Course() : required(courses.findById(id));
    if (id != null) {
      valid(
        c.code.equals(input.code()),
        "A sigla do curso não pode ser alterada."
      );
      for (var g : groups.findByCourseIdOrderBySemesterAscCodeAsc(id))
        if (g.semester > input.semesters()) {
          conflict(
            !lessons.usesGroup(g.id),
            "Há aulas vinculadas aos semestres removidos."
          );
          notifications.deleteByGroupId(g.id);
          groups.delete(g);
        }
    }
    c.code = input.code();
    c.name = input.name().trim();
    c.semesters = input.semesters();
    c = courses.saveAndFlush(c);
    var existing = groups.findByCourseIdOrderBySemesterAscCodeAsc(c.id);
    for (int s = 1; s <= c.semesters; s++) {
      final int semester = s;
      if (existing.stream().noneMatch(g -> g.semester == semester)) {
        var g = new StudentGroup();
        g.courseId = c.id;
        g.code = c.code + "-" + s + "A";
        g.semester = s;
        groups.save(g);
      }
    }
    return ApiView.CourseView.of(c);
  }
}
