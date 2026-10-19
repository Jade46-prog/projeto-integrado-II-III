package br.com.anhanguera.academico.subjects;

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
public class SubjectService {

  private final SubjectRepository subjects;
  private final CourseRepository courses;
  private final Access access;
  private final TransactionLock lock;

  public SubjectService(
    SubjectRepository subjects,
    CourseRepository courses,
    Access access,
    TransactionLock lock
  ) {
    this.subjects = subjects;
    this.courses = courses;
    this.access = access;
    this.lock = lock;
  }

  public List<ApiView.SubjectView> list(UUID courseId) {
    access.readCourse(courseId);
    return subjects
      .findByCourseIdOrderByNameAsc(courseId)
      .stream()
      .map(ApiView.SubjectView::of)
      .toList();
  }

  @Transactional
  public ApiView.SubjectView save(UUID id, ApiModels.SubjectInput in) {
    access.admin();
    lock.acquire();
    required(courses.findById(in.courseId()));
    var s = id == null ? new Subject() : required(subjects.findById(id));
    valid(
      id == null || s.courseId.equals(in.courseId()),
      "A matéria deve permanecer no curso original."
    );
    s.courseId = in.courseId();
    s.name = in.name().trim();
    return ApiView.SubjectView.of(subjects.saveAndFlush(s));
  }

  @Transactional
  public void delete(UUID id) {
    access.admin();
    lock.acquire();
    subjects.delete(required(subjects.findById(id)));
    subjects.flush();
  }
}
