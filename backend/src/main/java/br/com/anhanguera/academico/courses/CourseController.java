package br.com.anhanguera.academico.courses;

import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CourseController {

  private final CourseService service;

  public CourseController(CourseService service) {
    this.service = service;
  }

  @GetMapping("/public/courses")
  public List<ApiView.CourseView> publicList() {
    return service.list(true);
  }

  @GetMapping("/courses")
  public List<ApiView.CourseView> list() {
    return service.list(false);
  }

  @GetMapping("/courses/{id}/staff")
  public Map<String, List<ApiView.StaffView>> staff(@PathVariable UUID id) {
    return service.staff(id);
  }

  @PostMapping("/courses")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiView.CourseView create(
    @Valid @RequestBody ApiModels.CourseInput in
  ) {
    return service.save(null, in);
  }

  @PutMapping("/courses/{id}")
  public ApiView.CourseView edit(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.CourseInput in
  ) {
    return service.save(id, in);
  }
}
