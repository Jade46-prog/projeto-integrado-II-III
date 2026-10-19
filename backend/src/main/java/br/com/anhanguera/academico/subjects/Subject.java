package br.com.anhanguera.academico.subjects;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "subject")
public class Subject {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(name = "course_id", nullable = false)
  public UUID courseId;

  @Column(length = 100, nullable = false)
  public String name;
}
