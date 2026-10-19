package br.com.anhanguera.academico.subjects;

import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class SubjectController {

  private final SubjectService service;

  public SubjectController(SubjectService service) {
    this.service = service;
  }

  @GetMapping("/subjects")
  public List<ApiView.SubjectView> list(@RequestParam UUID courseId) {
    return service.list(courseId);
  }

  @DeleteMapping("/subjects/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }

  @PostMapping("/subjects")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiView.SubjectView create(
    @Valid @RequestBody ApiModels.SubjectInput in
  ) {
    return service.save(null, in);
  }

  @PutMapping("/subjects/{id}")
  public ApiView.SubjectView edit(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.SubjectInput in
  ) {
    return service.save(id, in);
  }
}
