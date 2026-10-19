package br.com.anhanguera.academico.notifications;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface NotificationRepository
  extends JpaRepository<Notification, UUID>
{
  @Query(
    "select n from Notification n, StudentGroup g where n.groupId=g.id and n.courseId=:courseId and g.semester=:semester order by n.createdAt desc"
  )
  List<Notification> forSemester(
    UUID courseId,
    int semester,
    org.springframework.data.domain.Pageable page
  );

  void deleteByGroupId(UUID groupId);
}
