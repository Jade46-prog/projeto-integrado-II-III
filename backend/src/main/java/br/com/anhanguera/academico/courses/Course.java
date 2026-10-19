package br.com.anhanguera.academico.courses;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "course")
public class Course {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(length = 12, nullable = false)
  public String code;

  @Column(length = 100, nullable = false)
  public String name;

  public int semesters;
}
