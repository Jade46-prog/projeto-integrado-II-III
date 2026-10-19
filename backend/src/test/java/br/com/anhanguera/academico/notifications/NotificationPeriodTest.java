package br.com.anhanguera.academico.notifications;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class NotificationPeriodTest {
  private final LocalDate from = LocalDate.of(2026, 10, 12);
  private final LocalDate to = LocalDate.of(2026, 10, 18);

  @Test
  void filtersByLessonDateIncludingWeekBoundaries() {
    var notice = new Notification();
    notice.lessonDate = from;
    assertTrue(NotificationController.inPeriod(notice, from, to));
    notice.lessonDate = to;
    assertTrue(NotificationController.inPeriod(notice, from, to));
    notice.lessonDate = from.minusDays(1);
    assertFalse(NotificationController.inPeriod(notice, from, to));
    notice.lessonDate = to.plusDays(1);
    assertFalse(NotificationController.inPeriod(notice, from, to));
  }

  @Test
  void recognizesLegacyMessagesWithoutGuessingDates() {
    var notice = new Notification();
    notice.message = "Nova aula publicada: Sistemas Operacionais (2026-10-13)";
    assertTrue(NotificationController.inPeriod(notice, from, to));
    notice.message = "Nova aula publicada: Sistemas Operacionais (2026-10-20)";
    assertFalse(NotificationController.inPeriod(notice, from, to));
    notice.message = "Aviso sem data";
    assertFalse(NotificationController.inPeriod(notice, from, to));
    notice.message = "Data inválida (2026-02-30)";
    assertFalse(NotificationController.inPeriod(notice, from, to));
  }
}
