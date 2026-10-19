package br.com.anhanguera.academico.groups;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "student_group")
public class StudentGroup {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(name = "course_id", nullable = false)
  public UUID courseId;

  @Column(length = 40, nullable = false)
  public String code;

  public int semester;
}
