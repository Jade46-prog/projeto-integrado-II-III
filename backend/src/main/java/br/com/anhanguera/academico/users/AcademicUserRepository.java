package br.com.anhanguera.academico.users;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface AcademicUserRepository
  extends JpaRepository<AcademicUser, UUID>
{
  @EntityGraph(attributePaths = "courses")
  List<AcademicUser> findAllByOrderByNameAsc();

  @EntityGraph(attributePaths = "courses")
  Optional<AcademicUser> findByCpf(String cpf);

  boolean existsByRole(String role);

  @EntityGraph(attributePaths = "courses")
  @Query(
    "select u from AcademicUser u join u.courses c where c.id=:courseId and u.active=true order by u.name"
  )
  List<AcademicUser> staff(UUID courseId);
}
