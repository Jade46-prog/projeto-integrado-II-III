package br.com.anhanguera.academico.users;

import br.com.anhanguera.academico.shared.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserService service;

  public UserController(UserService service) {
    this.service = service;
  }

  @GetMapping
  public List<ApiView.UserView> list() {
    return service.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ApiView.UserView create(
    @Valid @RequestBody ApiModels.UserInput input
  ) {
    return service.save(null, input);
  }

  @PutMapping("/{id}")
  public ApiView.UserView edit(
    @PathVariable UUID id,
    @Valid @RequestBody ApiModels.UserInput input
  ) {
    return service.save(id, input);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    service.delete(id);
  }
}
