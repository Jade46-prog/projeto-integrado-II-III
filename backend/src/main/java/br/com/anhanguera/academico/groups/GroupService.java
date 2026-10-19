package br.com.anhanguera.academico.groups;

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
public class GroupService {

  private final StudentGroupRepository groups;
  private final CourseRepository courses;
  private final Access access;
  private final TransactionLock lock;

  public GroupService(
    StudentGroupRepository groups,
    CourseRepository courses,
    Access access,
    TransactionLock lock
  ) {
    this.groups = groups;
    this.courses = courses;
    this.access = access;
    this.lock = lock;
  }

  public List<ApiView.GroupView> list(UUID courseId, boolean anonymous) {
    if (!anonymous) access.readCourse(courseId);
    return groups
      .findByCourseIdOrderBySemesterAscCodeAsc(courseId)
      .stream()
      .map(ApiView.GroupView::of)
      .toList();
  }

  @Transactional
  public ApiView.GroupView create(ApiModels.GroupInput in) {
    access.admin();
    lock.acquire();
    valid(
      in.semester() <= required(courses.findById(in.courseId())).semesters,
      "Semestre fora da duração do curso."
    );
    var g = new StudentGroup();
    g.courseId = in.courseId();
    g.code = in.code().trim();
    g.semester = in.semester();
    return ApiView.GroupView.of(groups.saveAndFlush(g));
  }
}
