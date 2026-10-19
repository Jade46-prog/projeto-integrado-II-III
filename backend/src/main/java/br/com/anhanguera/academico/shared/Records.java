package br.com.anhanguera.academico.shared;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Records {

  private Records() {}

  public static <T> T required(Optional<T> value) {
    return value.orElseThrow(() ->
      new ResponseStatusException(
        HttpStatus.NOT_FOUND,
        "Registro não encontrado."
      )
    );
  }
}
