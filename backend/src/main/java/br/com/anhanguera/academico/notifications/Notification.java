package br.com.anhanguera.academico.notifications;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "notification")
public class Notification {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(name = "course_id", nullable = false)
  public UUID courseId;

  @Column(name = "group_id", nullable = false)
  public UUID groupId;

  @Column(length = 500, nullable = false)
  public String message;

  @Column(name = "lesson_date")
  public LocalDate lessonDate;

  @Column(name = "created_at", nullable = false)
  public Instant createdAt = Instant.now();
}
