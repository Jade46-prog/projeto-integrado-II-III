package br.com.anhanguera.academico.lessons;

import br.com.anhanguera.academico.groups.StudentGroup;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "lesson")
public class Lesson {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(name = "series_id", nullable = false)
  public UUID seriesId;

  @Column(name = "course_id", nullable = false)
  public UUID courseId;

  @Column(name = "subject_id", nullable = false)
  public UUID subjectId;

  @Column(name = "professor_id", nullable = false)
  public UUID professorId;

  @Column(name = "room_id", nullable = false)
  public UUID roomId;

  @Column(name = "lesson_date", nullable = false)
  public LocalDate date;

  @Column(name = "starts_at", nullable = false)
  public LocalTime start;

  @Column(name = "ends_at", nullable = false)
  public LocalTime end;

  public boolean published;

  @Column(length = 12, nullable = false)
  public String status = "CONFIRMED";

  @ManyToMany
  @JoinTable(
    name = "lesson_group",
    joinColumns = @JoinColumn(name = "lesson_id"),
    inverseJoinColumns = @JoinColumn(name = "group_id")
  )
  public Set<StudentGroup> groups = new LinkedHashSet<>();
}
