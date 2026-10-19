package br.com.anhanguera.academico.lessons;

import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LessonController {

  @org.springframework.beans.factory.annotation.Value("${app.semester-start}")
  private String semesterStart;

  @org.springframework.beans.factory.annotation.Value("${app.semester-end}")
  private String semesterEnd;

  @GetMapping({ "/calendar", "/public/calendar" })
  public Map<String, String> calendar() {
    return Map.of("start", semesterStart, "end", semesterEnd);
  }

  private final LessonService service;

  public LessonController(LessonService service) {
    this.service = service;
  }

  @GetMapping("/lessons")
  public List<ApiView.LessonView> list(
    @RequestParam UUID courseId,
    @RequestParam(required = false) Integer semester,
    @RequestParam(required = false) String period,
    @RequestParam LocalDate from,
    @RequestParam LocalDate to
  ) {
    return service.list(courseId, semester, period, from, to, false);
  }

  @GetMapping("/public/lessons")
  public List<ApiView.LessonView> publicList(
    @RequestParam UUID courseId,
    @RequestParam(required = false) Integer semester,
    @RequestParam(required = false) String period,
    @RequestParam LocalDate from,
    @RequestParam LocalDate to
  ) {
    return service.list(courseId, semester, period, from, to, true);
  }

  @PostMapping("/lessons")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public List<ApiView.LessonView> create(
    @Valid @RequestBody ApiModels.LessonInput input
  ) {
    return service.save(null, input);
  }

  @PutMapping("/lessons/{id}/series")
  public List<ApiView.LessonView> editSeries(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.LessonInput input
  ) {
    return service.editSeries(id, input);
  }

  @PutMapping("/lessons/{id}")
  public List<ApiView.LessonView> edit(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.LessonInput input
  ) {
    return service.save(id, input);
  }

  @PatchMapping("/lessons/{id}/location")
  public ApiView.LessonView location(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.LocationInput input
  ) {
    return service.location(id, input);
  }

  @PostMapping("/courses/{id}/publish")
  public Map<String, Integer> publish(@PathVariable UUID id) {
    return service.publish(id);
  }

  @DeleteMapping("/lesson-series/{id}")
  public Map<String, Integer> delete(@PathVariable UUID id) {
    return service.deleteSeries(id);
  }
}
