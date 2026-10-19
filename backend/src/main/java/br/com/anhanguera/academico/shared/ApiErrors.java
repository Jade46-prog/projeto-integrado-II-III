package br.com.anhanguera.academico.shared;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<ProblemDetail> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      ProblemDetail.forStatusAndDetail(
        e.getStatusCode(),
        e.getReason() == null ? "Requisição inválida." : e.getReason()
      )
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException e) {
    var body = ProblemDetail.forStatusAndDetail(
      HttpStatus.BAD_REQUEST,
      "Verifique os campos informados."
    );
    body.setProperty(
      "fields",
      e
        .getBindingResult()
        .getFieldErrors()
        .stream()
        .map(f -> f.getField() + ": " + f.getDefaultMessage())
        .toList()
    );
    return ResponseEntity.badRequest().body(body);
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ProblemDetail> conflict(DataIntegrityViolationException e) {
    return ResponseEntity.status(409).body(
      ProblemDetail.forStatusAndDetail(
        HttpStatus.CONFLICT,
        "Registro duplicado ou vinculado a outros dados."
      )
    );
  }
}
