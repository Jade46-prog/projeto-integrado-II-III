package br.com.anhanguera.academico.imports;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/import")
public class BackupImportController {

  private final BackupImportService service;

  public BackupImportController(BackupImportService service) {
    this.service = service;
  }

  @PostMapping("/preview")
  public Map<String, Object> preview(
    @RequestBody BackupImportService.Input input
  ) {
    return service.preview(input);
  }

  @PostMapping("/confirm")
  public Map<String, Object> confirm(
    @RequestBody BackupImportService.Input input
  ) {
    return service.confirm(input);
  }
}
