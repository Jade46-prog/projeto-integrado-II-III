package br.com.anhanguera.academico.rooms;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import br.com.anhanguera.academico.lessons.LessonRepository;
import br.com.anhanguera.academico.security.Access;
import br.com.anhanguera.academico.shared.TransactionLock;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class RoomDeletionTest {
  final RoomRepository rooms = mock(RoomRepository.class);
  final LessonRepository lessons = mock(LessonRepository.class);
  final Access access = mock(Access.class);
  final TransactionLock lock = mock(TransactionLock.class);
  final RoomService service = new RoomService(rooms, lessons, access, lock);

  @Test
  void reportsAvailabilityAndIgnoresEditedLesson() {
    var courseId = UUID.randomUUID();
    var lesson = new br.com.anhanguera.academico.lessons.Lesson();
    lesson.courseId = courseId;
    var busyRoom = new Room();
    var freeRoom = new Room();
    var date = java.time.LocalDate.of(2026, 10, 19);
    var start = java.time.LocalTime.of(19, 0);
    var end = java.time.LocalTime.of(22, 50);
    when(lessons.findById(lesson.id)).thenReturn(Optional.of(lesson));
    when(lessons.occupiedRooms(date, start, end, lesson.id)).thenReturn(List.of(busyRoom.id));
    when(rooms.findAllByOrderByFloorAscNameAsc()).thenReturn(List.of(busyRoom, freeRoom));
    var result = service.availability(courseId, date, start, end, lesson.id);
    assertFalse(result.get(0).available());
    assertTrue(result.get(1).available());
    verify(access).coordinate(courseId);
    verify(lessons).occupiedRooms(date, start, end, lesson.id);
  }

  @Test
  void cannotIgnoreLessonFromAnotherCourse() {
    var lesson = new br.com.anhanguera.academico.lessons.Lesson();
    lesson.courseId = UUID.randomUUID();
    when(lessons.findById(lesson.id)).thenReturn(Optional.of(lesson));
    var error = assertThrows(ResponseStatusException.class, () -> service.availability(
      UUID.randomUUID(), java.time.LocalDate.of(2026, 10, 19),
      java.time.LocalTime.of(19, 0), java.time.LocalTime.of(22, 50), lesson.id));
    assertEquals(403, error.getStatusCode().value());
    verifyNoInteractions(rooms);
  }

  @Test
  void deletesUnusedRoom() {
    var room = new Room();
    when(rooms.findById(room.id)).thenReturn(Optional.of(room));
    service.delete(room.id);
    var order = inOrder(access, lock, rooms, lessons);
    order.verify(access).admin();
    order.verify(lock).acquire();
    order.verify(rooms).findById(room.id);
    order.verify(lessons).existsByRoomId(room.id);
    order.verify(rooms).delete(room);
    order.verify(rooms).flush();
  }

  @Test
  void preservesRoomLinkedToLessons() {
    var room = new Room();
    when(rooms.findById(room.id)).thenReturn(Optional.of(room));
    when(lessons.existsByRoomId(room.id)).thenReturn(true);
    var error = assertThrows(ResponseStatusException.class, () -> service.delete(room.id));
    assertEquals(409, error.getStatusCode().value());
    verify(rooms, never()).delete(any());
  }

  @Test
  void requiresAdministrator() {
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(access).admin();
    assertThrows(ResponseStatusException.class, () -> service.delete(UUID.randomUUID()));
    verifyNoInteractions(rooms, lessons, lock);
  }

  @Test
  void missingRoomReturnsNotFound() {
    var error = assertThrows(ResponseStatusException.class, () -> service.delete(UUID.randomUUID()));
    assertEquals(404, error.getStatusCode().value());
    verify(rooms, never()).delete(any());
  }
}
