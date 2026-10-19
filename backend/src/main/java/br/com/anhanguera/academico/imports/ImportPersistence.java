package br.com.anhanguera.academico.imports;

import static br.com.anhanguera.academico.shared.Records.required;

import br.com.anhanguera.academico.courses.Course;
import br.com.anhanguera.academico.courses.CourseRepository;
import br.com.anhanguera.academico.groups.StudentGroup;
import br.com.anhanguera.academico.groups.StudentGroupRepository;
import br.com.anhanguera.academico.imports.BackupReceipt;
import br.com.anhanguera.academico.imports.BackupReceiptRepository;
import br.com.anhanguera.academico.lessons.Lesson;
import br.com.anhanguera.academico.lessons.LessonRepository;
import br.com.anhanguera.academico.notifications.Notification;
import br.com.anhanguera.academico.notifications.NotificationRepository;
import br.com.anhanguera.academico.rooms.Room;
import br.com.anhanguera.academico.rooms.RoomRepository;
import br.com.anhanguera.academico.security.AccessToken;
import br.com.anhanguera.academico.security.AccessTokenRepository;
import br.com.anhanguera.academico.shared.TransactionLock;
import br.com.anhanguera.academico.subjects.Subject;
import br.com.anhanguera.academico.subjects.SubjectRepository;
import br.com.anhanguera.academico.users.AcademicUser;
import br.com.anhanguera.academico.users.AcademicUserRepository;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

/** Persistence operations specific to the legacy import; shares its surrounding JPA transaction. */
@Component
public class ImportPersistence {

  private final CourseRepository courses;
  private final StudentGroupRepository groups;
  private final SubjectRepository subjects;
  private final AcademicUserRepository users;
  private final RoomRepository rooms;
  private final LessonRepository lessons;
  private final NotificationRepository notifications;
  private final BackupReceiptRepository receipts;
  private final TransactionLock lock;

  public ImportPersistence(
    CourseRepository courses,
    StudentGroupRepository groups,
    SubjectRepository subjects,
    AcademicUserRepository users,
    RoomRepository rooms,
    LessonRepository lessons,
    NotificationRepository notifications,
    BackupReceiptRepository receipts,
    TransactionLock lock
  ) {
    this.courses = courses;
    this.groups = groups;
    this.subjects = subjects;
    this.users = users;
    this.rooms = rooms;
    this.lessons = lessons;
    this.notifications = notifications;
    this.receipts = receipts;
    this.lock = lock;
  }

  public void lock() {
    lock.acquire();
  }

  public static UUID id(Map<String, Object> row, String key) {
    return (UUID) row.get(key);
  }

  public void receipt(String hash, UUID user) {
    var r = new BackupReceipt();
    r.id = hash;
    r.importedBy = user;
    receipts.saveAndFlush(r);
  }

  public boolean imported(String hash) {
    return receipts.existsById(hash);
  }

  public List<Map<String, Object>> course(String code) {
    return courses
      .findByCode(code)
      .map(c ->
        Map.<String, Object>of(
          "id",
          c.id,
          "name",
          c.name,
          "semesters",
          c.semesters
        )
      )
      .stream()
      .toList();
  }

  public boolean courseNameExists(String name) {
    return courses.existsByNameIgnoreCase(name);
  }

  public void createCourse(UUID id, String code, String name, int semesters) {
    var c = new Course();
    c.id = id;
    c.code = code;
    c.name = name;
    c.semesters = semesters;
    courses.saveAndFlush(c);
  }

  public List<Map<String, Object>> group(String code) {
    return groups
      .findByCode(code)
      .map(g ->
        Map.<String, Object>of(
          "id",
          g.id,
          "course_id",
          g.courseId,
          "semester",
          g.semester
        )
      )
      .stream()
      .toList();
  }

  public void createGroup(UUID id, UUID course, String code, int semester) {
    var g = new StudentGroup();
    g.id = id;
    g.courseId = course;
    g.code = code;
    g.semester = semester;
    groups.saveAndFlush(g);
  }

  public List<Map<String, Object>> subject(UUID course, String name) {
    return subjects
      .findByCourseIdAndNameIgnoreCase(course, name)
      .map(g -> Map.<String, Object>of("id", g.id))
      .stream()
      .toList();
  }

  public void createSubject(UUID id, UUID course, String name) {
    var v = new Subject();
    v.id = id;
    v.courseId = course;
    v.name = name;
    subjects.saveAndFlush(v);
  }

  public List<Map<String, Object>> user(String cpf) {
    return users
      .findByCpf(cpf)
      .map(u ->
        Map.<String, Object>of(
          "id",
          u.id,
          "name",
          u.name,
          "role",
          u.role,
          "active",
          u.active
        )
      )
      .stream()
      .toList();
  }

  public void createUser(
    UUID id,
    String name,
    String cpf,
    String hash,
    String role
  ) {
    var u = new AcademicUser();
    u.id = id;
    u.name = name;
    u.cpf = cpf;
    u.passwordHash = hash;
    u.role = role;
    users.saveAndFlush(u);
  }

  public int link(UUID user, UUID course) {
    var u = required(users.findById(user));
    if (u.courses.stream().anyMatch(c -> c.id.equals(course))) return 0;
    u.courses.add(required(courses.findById(course)));
    users.flush();
    return 1;
  }

  public boolean linked(UUID user, UUID course) {
    return required(users.findById(user))
      .courses.stream()
      .anyMatch(c -> c.id.equals(course));
  }

  public List<Map<String, Object>> room(String name) {
    return rooms
      .findByName(name)
      .map(r -> Map.<String, Object>of("id", r.id))
      .stream()
      .toList();
  }

  public void createRoom(UUID id, String name, String floor, Integer capacity) {
    var r = new Room();
    r.id = id;
    r.name = name;
    r.floor = floor;
    r.capacity = capacity;
    rooms.saveAndFlush(r);
  }

  public boolean hasConflict(
    LocalDate date,
    LocalTime end,
    LocalTime start,
    UUID professor,
    UUID room
  ) {
    return lessons.conflicts(
      new UUID(0, 0),
      new UUID(0, 0),
      date,
      start,
      end,
      professor,
      room
    );
  }

  public boolean occurrenceExists(UUID series, LocalDate date) {
    return lessons.existsBySeriesIdAndDate(series, date);
  }

  public void createLesson(
    UUID id,
    UUID series,
    UUID course,
    UUID subject,
    UUID professor,
    UUID room,
    LocalDate date,
    LocalTime start,
    LocalTime end,
    boolean published,
    String status
  ) {
    var l = new Lesson();
    l.id = id;
    l.seriesId = series;
    l.courseId = course;
    l.subjectId = subject;
    l.professorId = professor;
    l.roomId = room;
    l.date = date;
    l.start = start;
    l.end = end;
    l.published = published;
    l.status = status;
    lessons.saveAndFlush(l);
  }

  public void lessonGroup(UUID lesson, UUID group) {
    required(lessons.findById(lesson)).groups.add(
      required(groups.findById(group))
    );
    lessons.flush();
  }

  public void notification(UUID id, UUID course, UUID group, String message) {
    var n = new Notification();
    n.id = id;
    n.courseId = course;
    n.groupId = group;
    n.message = message;
    notifications.saveAndFlush(n);
  }
}
