package br.com.anhanguera.academico.shared;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;

public final class ApiModels {

  private ApiModels() {}

  public enum Role {
    ADMIN,
    COORDINATOR,
    PROFESSOR,
  }

  public enum Status {
    CONFIRMED,
    CANCELLED,
  }

  public record Login(
    @NotBlank String cpf,
    @NotBlank @Size(max = 72) String password
  ) {}

  public record UserInput(
    @NotBlank @Size(max = 100) String name,
    @NotBlank String cpf,
    @Size(min = 12, max = 72) String password,
    @NotNull Role role,
    @NotNull Set<@NotNull UUID> courseIds
  ) {}

  public record CourseInput(
    @NotBlank @Pattern(regexp = "[A-Z][A-Z0-9]{1,11}") String code,
    @NotBlank @Size(max = 100) String name,
    @Min(1) @Max(20) int semesters
  ) {}

  public record SubjectInput(
    @NotNull UUID courseId,
    @NotBlank @Size(max = 100) String name
  ) {}

  public record GroupInput(
    @NotNull UUID courseId,
    @NotBlank @Size(max = 40) String code,
    @Min(1) @Max(20) int semester
  ) {}

  public record RoomInput(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Size(max = 20) String floor,
    @Min(1) Integer capacity
  ) {}

  public record LessonInput(
    @NotNull UUID courseId,
    @NotNull UUID subjectId,
    @NotNull UUID professorId,
    @NotNull UUID roomId,
    @NotEmpty Set<@NotNull UUID> groupIds,
    @NotNull LocalDate date,
    @NotNull LocalTime start,
    @NotNull LocalTime end,
    boolean repeatWeekly
  ) {}

  public record LocationInput(@NotNull UUID roomId, @NotNull Status status) {}
}
