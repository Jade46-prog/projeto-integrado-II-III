package br.com.anhanguera.academico.groups;

import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class GroupController {

  private final GroupService service;

  public GroupController(GroupService service) {
    this.service = service;
  }

  @GetMapping("/groups")
  public List<ApiView.GroupView> list(@RequestParam UUID courseId) {
    return service.list(courseId, false);
  }

  @GetMapping("/public/groups")
  public List<ApiView.GroupView> publicList(@RequestParam UUID courseId) {
    return service.list(courseId, true);
  }

  @PostMapping("/groups")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiView.GroupView create(@Valid @RequestBody ApiModels.GroupInput in) {
    return service.create(in);
  }
}
