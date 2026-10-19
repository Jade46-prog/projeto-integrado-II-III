package br.com.anhanguera.academico.courses;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface CourseRepository extends JpaRepository<Course, UUID> {
  List<Course> findAllByOrderByNameAsc();
  Optional<Course> findByCode(String code);
  boolean existsByNameIgnoreCase(String name);
}
