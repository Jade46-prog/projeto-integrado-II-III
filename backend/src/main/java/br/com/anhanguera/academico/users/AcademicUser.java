package br.com.anhanguera.academico.users;

import br.com.anhanguera.academico.courses.Course;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "app_user")
public class AcademicUser {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(length = 100, nullable = false)
  public String name;

  @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.CHAR)
  @Column(columnDefinition = "char(11)", nullable = false)
  public String cpf;

  @Column(name = "password_hash", length = 100, nullable = false)
  public String passwordHash;

  @Column(length = 20, nullable = false)
  public String role;

  public boolean active = true;

  @ManyToMany
  @JoinTable(
    name = "user_course",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "course_id")
  )
  public Set<Course> courses = new LinkedHashSet<>();
}
