package br.com.anhanguera.academico.shared;

import br.com.anhanguera.academico.courses.Course;
import br.com.anhanguera.academico.groups.StudentGroup;
import br.com.anhanguera.academico.imports.BackupReceipt;
import br.com.anhanguera.academico.lessons.Lesson;
import br.com.anhanguera.academico.notifications.Notification;
import br.com.anhanguera.academico.rooms.Room;
import br.com.anhanguera.academico.security.AccessToken;
import br.com.anhanguera.academico.subjects.Subject;
import br.com.anhanguera.academico.users.AcademicUser;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.*;
import java.util.*;

public final class ApiView {

  private ApiView() {}

  public record CourseView(UUID id, String code, String name, int semesters) {
    public static CourseView of(Course c) {
      return new CourseView(c.id, c.code, c.name, c.semesters);
    }
  }

  public record SubjectView(
    UUID id,
    @JsonProperty("course_id") UUID courseId,
    String name
  ) {
    public static SubjectView of(Subject s) {
      return new SubjectView(s.id, s.courseId, s.name);
    }
  }

  public record GroupView(
    UUID id,
    @JsonProperty("course_id") UUID courseId,
    String code,
    int semester
  ) {
    public static GroupView of(StudentGroup g) {
      return new GroupView(g.id, g.courseId, g.code, g.semester);
    }
  }

  public record RoomView(UUID id, String name, String floor, Integer capacity) {
    public static RoomView of(Room r) {
      return new RoomView(r.id, r.name, r.floor, r.capacity);
    }
  }

  public record UserView(
    UUID id,
    String name,
    String cpf,
    String role,
    boolean active,
    List<CourseView> courses
  ) {
    public static UserView of(AcademicUser u) {
      return new UserView(
        u.id,
        u.name,
        u.cpf,
        u.role,
        u.active,
        u.courses
          .stream()
          .sorted(Comparator.comparing(c -> c.name))
          .map(CourseView::of)
          .toList()
      );
    }
  }

  public record StaffView(UUID id, String name, String role) {}

  public record LoginView(
    String accessToken,
    String tokenType,
    int expiresIn,
    UserView user
  ) {}

  public record NotificationView(
    UUID id,
    String message,
    @JsonProperty("created_at") Instant createdAt
  ) {}

  public record LessonView(
    UUID id,
    @JsonProperty("series_id") UUID seriesId,
    @JsonProperty("course_id") UUID courseId,
    @JsonProperty("subject_id") UUID subjectId,
    @JsonProperty("professor_id") UUID professorId,
    @JsonProperty("room_id") UUID roomId,
    @JsonProperty("lesson_date") LocalDate date,
    @JsonProperty("starts_at")
    @JsonFormat(pattern = "HH:mm:ss")
    LocalTime start,
    @JsonProperty("ends_at") @JsonFormat(pattern = "HH:mm:ss") LocalTime end,
    boolean published,
    String status,
    @JsonProperty("subject_name") String subjectName,
    @JsonProperty("professor_name") String professorName,
    @JsonProperty("room_name") String roomName,
    @JsonProperty("course_name") String courseName,
    List<GroupView> groups
  ) {}
}
