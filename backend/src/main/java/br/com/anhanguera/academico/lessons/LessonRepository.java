package br.com.anhanguera.academico.lessons;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
  @EntityGraph(attributePaths = "groups")
  List<Lesson> findByCourseIdAndDateBetweenOrderByDateAscStartAsc(
    UUID courseId,
    LocalDate from,
    LocalDate to
  );

  @EntityGraph(attributePaths = "groups")
  List<Lesson> findBySeriesIdOrderByDateAscIdAsc(UUID seriesId);

  List<Lesson> findByProfessorId(UUID professorId);
  boolean existsByRoomId(UUID roomId);

  @Query("select distinct l.roomId from Lesson l where l.date=:date and l.start<:end and l.end>:start and l.status<>'CANCELLED' and l.id<>:ignore")
  List<UUID> occupiedRooms(LocalDate date, LocalTime start, LocalTime end, UUID ignore);
  List<Lesson> findByCourseIdAndPublishedFalse(UUID courseId);
  boolean existsBySeriesIdAndDateAndIdNot(
    UUID seriesId,
    LocalDate date,
    UUID id
  );
  boolean existsBySeriesIdAndDate(UUID seriesId, LocalDate date);

  @Query(
    "select count(l)>0 from Lesson l where l.id<>:ignore and l.seriesId<>:series and l.status<>'CANCELLED' and l.date=:date and l.start<:end and l.end>:start and (l.professorId=:professor or l.roomId=:room)"
  )
  boolean conflicts(
    UUID ignore,
    UUID series,
    LocalDate date,
    LocalTime start,
    LocalTime end,
    UUID professor,
    UUID room
  );

  @Query("select count(l)>0 from Lesson l join l.groups g where g.id=:groupId")
  boolean usesGroup(UUID groupId);
}
