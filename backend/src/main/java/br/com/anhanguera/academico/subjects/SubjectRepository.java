package br.com.anhanguera.academico.subjects;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {
  List<Subject> findByCourseIdOrderByNameAsc(UUID courseId);
  Optional<Subject> findByCourseIdAndNameIgnoreCase(UUID courseId, String name);
}
