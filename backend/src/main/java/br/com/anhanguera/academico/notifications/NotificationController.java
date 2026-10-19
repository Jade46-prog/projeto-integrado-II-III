package br.com.anhanguera.academico.notifications;

import br.com.anhanguera.academico.security.Access;
import br.com.anhanguera.academico.shared.ApiView;
import java.util.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/notifications")
public class NotificationController {

  private final NotificationRepository notifications;

  public NotificationController(NotificationRepository notifications) {
    this.notifications = notifications;
  }

  @GetMapping
  @Transactional(readOnly = true)
  public List<ApiView.NotificationView> list(
    @RequestParam UUID courseId,
    @RequestParam int semester,
    @RequestParam(required = false) LocalDate from,
    @RequestParam(required = false) LocalDate to
  ) {
    Access.valid(semester >= 1 && semester <= 20, "Semestre inválido.");
    Access.valid((from == null) == (to == null), "Informe início e fim do período.");
    Access.valid(from == null || !from.isAfter(to), "Período inválido.");
    return notifications
      .forSemester(courseId, semester, from == null ? PageRequest.of(0, 100) : Pageable.unpaged())
      .stream()
      .filter(n -> from == null || inPeriod(n, from, to))
      .limit(100)
      .map(n -> new ApiView.NotificationView(n.id, n.message, n.createdAt))
      .toList();
  }

  static boolean inPeriod(Notification notification, LocalDate from, LocalDate to) {
    LocalDate date = notification.lessonDate;
    // Compatibilidade com avisos anteriores à coluna lesson_date.
    if (date == null) {
      var match = Pattern.compile("\\((\\d{4}-\\d{2}-\\d{2})\\)$").matcher(notification.message);
      if (!match.find()) return false;
      try {
        date = LocalDate.parse(match.group(1));
      } catch (DateTimeParseException exception) {
        return false;
      }
    }
    return !date.isBefore(from) && !date.isAfter(to);
  }
}
