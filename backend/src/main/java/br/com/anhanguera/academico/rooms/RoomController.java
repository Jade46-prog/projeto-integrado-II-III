package br.com.anhanguera.academico.rooms;

import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RoomController {

  private final RoomService service;

  public RoomController(RoomService service) {
    this.service = service;
  }

  @GetMapping("/rooms")
  public List<ApiView.RoomView> list() {
    return service.list();
  }

  @PostMapping("/rooms")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiView.RoomView create(@Valid @RequestBody ApiModels.RoomInput in) {
    return service.save(null, in);
  }

  @GetMapping("/rooms/availability")
  public List<RoomService.Availability> availability(
      @RequestParam UUID courseId, @RequestParam java.time.LocalDate date,
      @RequestParam java.time.LocalTime start, @RequestParam java.time.LocalTime end,
      @RequestParam(required = false) UUID lessonId) {
    return service.availability(courseId, date, start, end, lessonId);
  }

  @PutMapping("/rooms/{id}")
  public ApiView.RoomView edit(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.RoomInput in
  ) {
    return service.save(id, in);
  }

  @DeleteMapping("/rooms/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }
}
