package br.com.anhanguera.academico.rooms;

import static br.com.anhanguera.academico.security.Access.*;
import static br.com.anhanguera.academico.shared.Records.required;

import br.com.anhanguera.academico.courses.*;
import br.com.anhanguera.academico.groups.*;
import br.com.anhanguera.academico.lessons.*;
import br.com.anhanguera.academico.notifications.*;
import br.com.anhanguera.academico.rooms.*;
import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import br.com.anhanguera.academico.subjects.*;
import br.com.anhanguera.academico.users.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomService {

  private final RoomRepository rooms;
  private final LessonRepository lessons;
  private final Access access;
  private final TransactionLock lock;

  public RoomService(
    RoomRepository rooms,
    LessonRepository lessons,
    Access access,
    TransactionLock lock
  ) {
    this.rooms = rooms;
    this.lessons = lessons;
    this.access = access;
    this.lock = lock;
  }

  public List<ApiView.RoomView> list() {
    access.actor();
    return rooms
      .findAllByOrderByFloorAscNameAsc()
      .stream()
      .map(ApiView.RoomView::of)
      .toList();
  }

  @Transactional
  public void delete(UUID id) {
    access.admin();
    lock.acquire();
    var room = required(rooms.findById(id));
    conflict(!lessons.existsByRoomId(id),
      "Altere a sala das aulas vinculadas ou exclua essas aulas antes de excluir a sala.");
    rooms.delete(room);
    rooms.flush();
  }

  public record Availability(UUID id, boolean available) {}

  public List<Availability> availability(UUID courseId, java.time.LocalDate date,
      java.time.LocalTime start, java.time.LocalTime end, UUID lessonId) {
    access.coordinate(courseId);
    valid(start.isBefore(end), "O término deve ser posterior ao início.");
    UUID ignore = new UUID(0, 0);
    if (lessonId != null) {
      var lesson = required(lessons.findById(lessonId));
      require(lesson.courseId.equals(courseId));
      ignore = lesson.id;
    }
    var occupied = new HashSet<>(lessons.occupiedRooms(date, start, end, ignore));
    return rooms.findAllByOrderByFloorAscNameAsc().stream()
      .map(room -> new Availability(room.id, !occupied.contains(room.id))).toList();
  }

  @Transactional
  public ApiView.RoomView save(UUID id, ApiModels.RoomInput in) {
    access.admin();
    lock.acquire();
    var r = id == null ? new Room() : required(rooms.findById(id));
    r.name = in.name().trim();
    r.floor = in.floor().trim();
    if (in.capacity() != null) r.capacity = in.capacity();
    return ApiView.RoomView.of(rooms.saveAndFlush(r));
  }
}
