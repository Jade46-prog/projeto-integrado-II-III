package br.com.anhanguera.academico.groups;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface StudentGroupRepository
  extends JpaRepository<StudentGroup, UUID>
{
  List<StudentGroup> findByCourseIdOrderBySemesterAscCodeAsc(UUID courseId);
  Optional<StudentGroup> findByCode(String code);
}
