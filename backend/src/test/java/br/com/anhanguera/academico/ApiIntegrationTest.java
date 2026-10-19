package br.com.anhanguera.academico;

import static org.junit.jupiter.api.Assertions.*;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Requires an isolated PostgreSQL database; creates only uniquely named test records. */
@SpringBootTest(
  webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
  properties = {
    "debug=false",
    "logging.level.root=WARN",
    "app.semester-start=2026-08-03",
    "app.semester-end=2026-12-18",
  }
)
class ApiIntegrationTest {

  @org.springframework.test.context.DynamicPropertySource
  static void isolatedDatabase(
    org.springframework.test.context.DynamicPropertyRegistry properties
  ) {
    String url = System.getenv("DB_URL");
    if (
      url == null ||
      !url.matches("jdbc:postgresql://[^/]+/[A-Za-z0-9_]*_test(?:\\?.*)?")
    ) throw new IllegalStateException(
      "Execute os testes em um DB_URL PostgreSQL exclusivo com nome terminado em _test."
    );
    properties.add("spring.datasource.url", () -> url);
  }

  @Value("${local.server.port}")
  int port;

  @Value("${app.admin-cpf}")
  String adminCpf;

  @Value("${app.admin-password}")
  String adminPassword;

  @org.springframework.beans.factory.annotation.Autowired
  javax.sql.DataSource dataSource;

  @org.springframework.beans.factory.annotation.Autowired
  org.springframework.security.crypto.password.PasswordEncoder passwords;

  final HttpClient http = HttpClient.newHttpClient();
  final JsonMapper json = JsonMapper.builder().build();
  final String password = "Integration-Test-123!";

  record Reply(int status, JsonNode body) {}

  Reply request(String method, String path, String token, Object payload)
    throws Exception {
    var builder = HttpRequest.newBuilder(
      URI.create("http://127.0.0.1:" + port + "/api" + path)
    );
    if (token != null) builder.header("Authorization", "Bearer " + token);
    builder.header("Content-Type", "application/json");
    var body =
      payload == null
        ? HttpRequest.BodyPublishers.noBody()
        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload));
    var response = http.send(
      builder.method(method, body).build(),
      HttpResponse.BodyHandlers.ofString()
    );
    return new Reply(
      response.statusCode(),
      response.body().isBlank()
        ? json.nullNode()
        : json.readTree(response.body())
    );
  }

  JsonNode ok(
    int status,
    String method,
    String path,
    String token,
    Object payload
  ) throws Exception {
    var response = request(method, path, token, payload);
    assertEquals(status, response.status(), response.body().toString());
    return response.body();
  }

  String login(String cpf, String secret) throws Exception {
    return ok(
      200,
      "POST",
      "/auth/login",
      null,
      Map.of("cpf", cpf, "password", secret)
    )
      .path("accessToken")
      .asText();
  }

  String cpf() {
    return String.format(
      "%011d",
      Math.abs(UUID.randomUUID().getLeastSignificantBits() % 100000000000L)
    );
  }

  String id(JsonNode node) {
    return node.path("id").asText();
  }

  JsonNode user(String admin, String cpf, String role, List<String> courses)
    throws Exception {
    return ok(
      201,
      "POST",
      "/users",
      admin,
      Map.of(
        "name",
        "Teste " + role,
        "cpf",
        cpf,
        "password",
        password,
        "role",
        role,
        "courseIds",
        courses
      )
    );
  }

  Map<String, Object> lesson(
    String course,
    String subject,
    String professor,
    String room,
    String group,
    String date,
    String start,
    String end,
    boolean repeat
  ) {
    return new HashMap<>(
      Map.of(
        "courseId",
        course,
        "subjectId",
        subject,
        "professorId",
        professor,
        "roomId",
        room,
        "groupIds",
        List.of(group),
        "date",
        date,
        "start",
        start,
        "end",
        end,
        "repeatWeekly",
        repeat
      )
    );
  }

  @Test
  void completeAcademicFlowAndAuthorization() throws Exception {
    assertEquals(
      "2026-08-03",
      ok(200, "GET", "/public/calendar", null, null).path("start").asText()
    );
    var admin = login(adminCpf, adminPassword);
    ok(401, "GET", "/users", null, null);
    ok(
      401,
      "POST",
      "/auth/login",
      null,
      Map.of("cpf", adminCpf, "password", "wrong")
    );
    var suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    var course = id(
      ok(
        201,
        "POST",
        "/courses",
        admin,
        Map.of("code", "T" + suffix, "name", "Curso " + suffix, "semesters", 2)
      )
    );
    var other = id(
      ok(
        201,
        "POST",
        "/courses",
        admin,
        Map.of("code", "U" + suffix, "name", "Outro " + suffix, "semesters", 1)
      )
    );
    var group = id(
      ok(200, "GET", "/groups?courseId=" + course, admin, null).get(0)
    );
    var subject = id(
      ok(
        201,
        "POST",
        "/subjects",
        admin,
        Map.of("courseId", course, "name", "Sistemas")
      )
    );
    var room = id(
      ok(
        201,
        "POST",
        "/rooms",
        admin,
        Map.of("name", "Sala " + suffix, "floor", "1", "capacity", 40)
      )
    );
    String cc = cpf(),
      pc = cpf(),
      oc = cpf();
    var coordinator = user(admin, cc, "COORDINATOR", List.of(course));
    var professor = user(admin, pc, "PROFESSOR", List.of(course, other));
    user(admin, oc, "PROFESSOR", List.of(course));
    var coord = login(cc, password);
    var prof = login(pc, password);
    var outsider = login(oc, password);
    assertEquals(2, ok(200, "GET", "/courses", prof, null).size());
    assertFalse(
      ok(200, "GET", "/users", admin, null).toString().contains("password")
    );
    ok(403, "GET", "/users", coord, null);
    ok(403, "GET", "/subjects?courseId=" + other, coord, null);
    ok(
      403,
      "POST",
      "/courses",
      prof,
      Map.of("code", "FORBID", "name", "Forbidden", "semesters", 1)
    );
    var query = "?courseId=" + course + "&from=2026-08-03&to=2026-12-18";
    var input = lesson(
      course,
      subject,
      id(professor),
      room,
      group,
      "2026-12-07",
      "19:00",
      "20:00",
      false
    );
    ok(403, "POST", "/lessons", prof, input);
    var created = ok(201, "POST", "/lessons", coord, input).get(0);
    assertEquals(
      0,
      ok(200, "GET", "/public/lessons" + query, null, null).size()
    );
    assertEquals(0, ok(200, "GET", "/lessons" + query, prof, null).size());
    var overlap = new HashMap<>(input);
    overlap.put("start", "19:30");
    ok(409, "POST", "/lessons", coord, overlap);
    var invalid = new HashMap<>(input);
    invalid.put("end", "23:00");
    ok(400, "POST", "/lessons", coord, invalid);
    input.put("repeatWeekly", true);
    assertEquals(
      2,
      ok(200, "PUT", "/lessons/" + id(created), coord, input).size()
    );
    assertEquals(
      2,
      ok(200, "POST", "/courses/" + course + "/publish", coord, null)
        .path("published")
        .asInt()
    );
    assertEquals(
      2,
      ok(200, "GET", "/public/lessons" + query, null, null).size()
    );
    assertEquals(0, ok(200, "GET", "/lessons" + query, outsider, null).size());
    ok(
      403,
      "PATCH",
      "/lessons/" + id(created) + "/location",
      outsider,
      Map.of("roomId", room, "status", "CANCELLED")
    );
    ok(
      200,
      "PATCH",
      "/lessons/" + id(created) + "/location",
      prof,
      Map.of("roomId", room, "status", "CANCELLED")
    );
    var replacement = ok(201, "POST", "/lessons", coord, overlap).get(0);
    ok(
      409,
      "PATCH",
      "/lessons/" + id(created) + "/location",
      prof,
      Map.of("roomId", room, "status", "CONFIRMED")
    );
    ok(
      200,
      "PUT",
      "/subjects/" + subject,
      admin,
      Map.of("courseId", course, "name", "Sistemas Operacionais")
    );
    assertEquals(
      "Sistemas Operacionais",
      ok(200, "GET", "/public/lessons" + query, null, null)
        .get(0)
        .path("subject_name")
        .asText()
    );
    ok(409, "DELETE", "/subjects/" + subject, admin, null);
    ok(
      409,
      "PUT",
      "/users/" + id(professor),
      admin,
      Map.of(
        "name",
        "Professor",
        "cpf",
        pc,
        "role",
        "PROFESSOR",
        "courseIds",
        List.of(other)
      )
    );
    assertTrue(
      ok(
        200,
        "GET",
        "/public/notifications?courseId=" + course + "&semester=1",
        null,
        null
      ).size() > 0
    );
    assertEquals(
      2,
      ok(
        200,
        "DELETE",
        "/lesson-series/" + created.path("series_id").asText(),
        coord,
        null
      )
        .path("deleted")
        .asInt()
    );
    assertEquals(1, ok(200, "GET", "/lessons" + query, coord, null).size());
    ok(
      200,
      "DELETE",
      "/lesson-series/" + replacement.path("series_id").asText(),
      coord,
      null
    );
    // A conflict on a later week must roll back the entire recurring insertion.
    var blocked = lesson(
      course,
      subject,
      id(professor),
      room,
      group,
      "2026-12-14",
      "19:00",
      "20:00",
      false
    );
    var blocker = ok(201, "POST", "/lessons", coord, blocked).get(0);
    ok(409, "POST", "/lessons", coord, input);
    assertEquals(1, ok(200, "GET", "/lessons" + query, coord, null).size());
    ok(
      200,
      "DELETE",
      "/lesson-series/" + blocker.path("series_id").asText(),
      coord,
      null
    );
    // Concurrent requests cannot reserve the same room or professor twice.
    input.put("repeatWeekly", false);
    var first = CompletableFuture.supplyAsync(() ->
      uncheckedPost(coord, input)
    );
    var second = CompletableFuture.supplyAsync(() ->
      uncheckedPost(coord, input)
    );
    assertEquals(Set.of(201, 409), Set.of(first.join(), second.join()));
    var adjacent = new HashMap<>(input);
    adjacent.put("start", "20:00");
    adjacent.put("end", "21:00");
    ok(201, "POST", "/lessons", coord, adjacent);
    ok(204, "POST", "/auth/logout", coord, null);
    ok(401, "GET", "/auth/me", coord, null);
    ok(
      200,
      "PUT",
      "/users/" + id(coordinator),
      admin,
      Map.of(
        "name",
        "Coordenador atualizado",
        "cpf",
        cc,
        "password",
        password + "x",
        "role",
        "COORDINATOR",
        "courseIds",
        List.of(course, other)
      )
    );
    ok(
      401,
      "POST",
      "/auth/login",
      null,
      Map.of("cpf", cc, "password", password)
    );
    assertEquals(
      2,
      ok(200, "GET", "/courses", login(cc, password + "x"), null).size()
    );
    ok(
      200,
      "PUT",
      "/users/" + id(professor),
      admin,
      Map.of(
        "name",
        "Professor atualizado",
        "cpf",
        pc,
        "password",
        password + "x",
        "role",
        "PROFESSOR",
        "courseIds",
        List.of(course, other)
      )
    );
    ok(401, "GET", "/auth/me", prof, null);
  }

  @Test
  void backupPreviewRollbackConfirmationAndReplay() throws Exception {
    String admin = login(adminCpf, adminPassword),
      code = "I" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    String professorCpf = cpf(),
      coordinatorCpf = cpf(),
      professorName = "Professor " + code;
    var group = code + "-1A";
    Map<String, Object> lesson = new HashMap<>(
      Map.of(
        "id",
        1,
        "serieId",
        "serie-1",
        "n",
        "Sistemas",
        "d",
        professorName,
        "c",
        code,
        "t",
        List.of(group),
        "data",
        "2026-12-07",
        "h",
        "19:00",
        "fim",
        "20:00",
        "sala",
        "Sala " + code
      )
    );
    lesson.put("pub", true);
    lesson.put("st", "OK");
    var second = new HashMap<>(lesson);
    second.put("id", 2);
    second.put("data", "2026-12-14");
    Map<String, Object> data = new HashMap<>();
    data.put("CURSOS", Map.of(code, "Curso " + code));
    data.put("TURMAS", Map.of(group, Map.of("c", code, "s", 1)));
    data.put(
      "DISC",
      List.of(
        Map.of("c", code, "n", "Sistemas"),
        Map.of("c", code, "n", "Sistemas")
      )
    );
    data.put(
      "USERS",
      Map.of(
        professorCpf,
        Map.of(
          "name",
          professorName,
          "doc",
          professorName,
          "role",
          "professor",
          "cursos",
          List.of(code)
        ),
        coordinatorCpf,
        Map.of(
          "name",
          "Coordenador " + code,
          "role",
          "coordenador",
          "cursos",
          List.of(code)
        ),
        "99999999999",
        Map.of("role", "admin")
      )
    );
    data.put("AULAS", List.of(lesson, second));
    data.put(
      "NOTIFS",
      List.of(Map.of("txt", "<b>Aviso antigo</b>", "t", List.of(group)))
    );
    data.put("DOCENTES", List.of(professorName));
    Map<String, Object> backup = new HashMap<>(
      Map.of("formato", "projeto-integrado", "versao", 1, "dados", data)
    );
    Map<String, Object> input = new HashMap<>(
      Map.of(
        "backup",
        backup,
        "passwords",
        Map.of(professorCpf, password, coordinatorCpf, password),
        "rooms",
        Map.of(
          "Sala " + code,
          Map.of("name", "Sala " + code, "floor", "1", "capacity", 40)
        )
      )
    );
    ok(401, "POST", "/admin/import/preview", null, input);
    var invalidSecond = new HashMap<>(second);
    invalidSecond.put("data", "2026-12-07");
    data.put("AULAS", List.of(lesson, invalidSecond));
    ok(409, "POST", "/admin/import/preview", admin, input);
    assertFalse(
      ok(200, "GET", "/courses", admin, null).toString().contains(code)
    );
    data.put("AULAS", List.of(lesson, second));
    var preview = ok(200, "POST", "/admin/import/preview", admin, input);
    assertEquals(
      2,
      preview.path("report").path("counts").path("lessonsCreated").asInt()
    );
    assertEquals(
      1,
      preview.path("report").path("counts").path("subjectsGrouped").asInt()
    );
    assertFalse(
      ok(200, "GET", "/courses", admin, null).toString().contains(code)
    );
    ok(
      401,
      "POST",
      "/auth/login",
      null,
      Map.of("cpf", professorCpf, "password", password)
    );
    input.put("previewToken", preview.path("previewToken").asText());
    input.put(
      "passwords",
      Map.of(professorCpf, "Senha-alterada-123!", coordinatorCpf, password)
    );
    ok(409, "POST", "/admin/import/confirm", admin, input);
    input.put(
      "passwords",
      Map.of(professorCpf, password, coordinatorCpf, password)
    );
    // Uma alteração concorrente exige nova prévia e reverte contas/aulas tentadas.
    ok(
      201,
      "POST",
      "/courses",
      admin,
      Map.of("code", code, "name", "Curso " + code, "semesters", 1)
    );
    ok(409, "POST", "/admin/import/confirm", admin, input);
    ok(
      401,
      "POST",
      "/auth/login",
      null,
      Map.of("cpf", professorCpf, "password", password)
    );
    var updatedPreview = ok(200, "POST", "/admin/import/preview", admin, input);
    input.put("previewToken", updatedPreview.path("previewToken").asText());
    ok(200, "POST", "/admin/import/confirm", admin, input);
    String prof = login(professorCpf, password),
      coord = login(coordinatorCpf, password);
    var course = id(ok(200, "GET", "/courses", coord, null).get(0));
    var lessons = ok(
      200,
      "GET",
      "/lessons?courseId=" + course + "&from=2026-08-03&to=2026-12-18",
      prof,
      null
    );
    assertEquals(2, lessons.size());
    assertEquals(
      lessons.get(0).path("series_id"),
      lessons.get(1).path("series_id")
    );
    assertEquals(
      "Aviso antigo",
      ok(
        200,
        "GET",
        "/public/notifications?courseId=" + course + "&semester=1",
        null,
        null
      )
        .get(0)
        .path("message")
        .asText()
    );
    ok(403, "POST", "/admin/import/preview", prof, input);
    ok(409, "POST", "/admin/import/confirm", admin, input);
    backup.put("exportadoEm", "Outra data");
    ok(409, "POST", "/admin/import/preview", admin, input);
    // Arquivo diferente, só com cadastros: reaproveita contas e não troca senhas.
    data.put("AULAS", List.of());
    data.put("NOTIFS", List.of());
    input.put("passwords", Map.of(professorCpf, "Outra-senha-segura"));
    var reuse = ok(200, "POST", "/admin/import/preview", admin, input);
    assertEquals(
      2,
      reuse.path("report").path("counts").path("usersReused").asInt()
    );
    input.put("previewToken", reuse.path("previewToken").asText());
    ok(200, "POST", "/admin/import/confirm", admin, input);
    login(professorCpf, password);
    ok(
      401,
      "POST",
      "/auth/login",
      null,
      Map.of("cpf", professorCpf, "password", "Outra-senha-segura")
    );
    var firstLesson = lessons.get(0);
    var editAll = lesson(
      course,
      firstLesson.path("subject_id").asText(),
      firstLesson.path("professor_id").asText(),
      firstLesson.path("room_id").asText(),
      id(firstLesson.path("groups").get(0)),
      "2026-12-07",
      "19:00",
      "20:30",
      false
    );
    var blocker = new HashMap<>(editAll);
    blocker.put("date", "2026-12-14");
    blocker.put("start", "20:00");
    blocker.put("end", "21:00");
    var blocked = ok(201, "POST", "/lessons", coord, blocker).get(0);
    ok(403, "PUT", "/lessons/" + id(firstLesson) + "/series", prof, editAll);
    ok(409, "PUT", "/lessons/" + id(firstLesson) + "/series", coord, editAll);
    var unchanged = ok(
      200,
      "GET",
      "/public/lessons?courseId=" + course + "&from=2026-08-03&to=2026-12-18",
      null,
      null
    );
    assertEquals("20:00:00", unchanged.get(0).path("ends_at").asText());
    ok(
      200,
      "DELETE",
      "/lesson-series/" + blocked.path("series_id").asText(),
      coord,
      null
    );
    editAll.put("date", "2026-12-18"); // deslocaria a segunda ocorrência para fora do semestre
    ok(400, "PUT", "/lessons/" + id(firstLesson) + "/series", coord, editAll);
    editAll.put("date", "2026-12-08");
    var edited = ok(
      200,
      "PUT",
      "/lessons/" + id(firstLesson) + "/series",
      coord,
      editAll
    );
    assertEquals(2, edited.size());
    assertEquals("2026-12-08", edited.get(0).path("lesson_date").asText());
    assertEquals("2026-12-15", edited.get(1).path("lesson_date").asText());
    assertEquals("20:30:00", edited.get(1).path("ends_at").asText());
    assertTrue(edited.get(0).path("published").asBoolean());
    assertEquals(
      firstLesson.path("series_id"),
      edited.get(1).path("series_id")
    );
    assertEquals(
      2,
      ok(
        200,
        "DELETE",
        "/lesson-series/" + lessons.get(0).path("series_id").asText(),
        coord,
        null
      )
        .path("deleted")
        .asInt()
    );
  }

  int uncheckedPost(String token, Object input) {
    try {
      return request("POST", "/lessons", token, input).status();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  @Test
  void existingDatabaseRowsKeepIdentifiersLinksAndPasswordHashes()
    throws Exception {
    var jdbc = new org.springframework.jdbc.core.JdbcTemplate(dataSource);
    var course = UUID.randomUUID();
    var group = UUID.randomUUID();
    var subject = UUID.randomUUID();
    var room = UUID.randomUUID();
    var professor = UUID.randomUUID();
    var lesson = UUID.randomUUID();
    var series = UUID.randomUUID();
    String code = "P" + course.toString().substring(0, 8).toUpperCase(),
      cpf = cpf(),
      hash = passwords.encode(password);
    // Simulate records inserted by the earlier JDBC version, using its original schema.
    jdbc.update(
      "insert into course(id,code,name,semesters) values(?,?,?,1)",
      course,
      code,
      "Preservado " + code
    );
    jdbc.update(
      "insert into student_group(id,course_id,code,semester) values(?,?,?,1)",
      group,
      course,
      code + "-1A"
    );
    jdbc.update(
      "insert into subject(id,course_id,name) values(?,?,?)",
      subject,
      course,
      "Matéria preservada"
    );
    jdbc.update(
      "insert into room(id,name,floor,capacity) values(?,?,?,40)",
      room,
      "Sala preservada " + code,
      "1"
    );
    jdbc.update(
      "insert into app_user(id,name,cpf,password_hash,role) values(?,?,?,?, 'PROFESSOR')",
      professor,
      "Professor preservado",
      cpf,
      hash
    );
    jdbc.update(
      "insert into user_course(user_id,course_id) values(?,?)",
      professor,
      course
    );
    jdbc.update(
      "insert into lesson(id,series_id,course_id,subject_id,professor_id,room_id,lesson_date,starts_at,ends_at,published,status) values(?,?,?,?,?,?,'2026-12-07','19:00','20:00',true,'CANCELLED')",
      lesson,
      series,
      course,
      subject,
      professor,
      room
    );
    jdbc.update(
      "insert into lesson_group(lesson_id,group_id) values(?,?)",
      lesson,
      group
    );
    var token = login(cpf, password);
    var result = ok(
      200,
      "GET",
      "/lessons?courseId=" + course + "&from=2026-08-03&to=2026-12-18",
      token,
      null
    ).get(0);
    assertEquals(lesson.toString(), id(result));
    assertEquals(series.toString(), result.path("series_id").asText());
    assertEquals(group.toString(), id(result.path("groups").get(0)));
    assertTrue(result.path("published").asBoolean());
    assertEquals("CANCELLED", result.path("status").asText());
    String admin = login(adminCpf, adminPassword);
    var edited = ok(
      200,
      "PUT",
      "/rooms/" + room,
      admin,
      Map.of("name", "Sala renomeada " + code, "floor", "2", "capacity", 45)
    );
    assertEquals(room.toString(), id(edited));
    assertEquals(
      hash,
      jdbc.queryForObject(
        "select password_hash from app_user where id=?",
        String.class,
        professor
      )
    );
    assertEquals(
      room,
      jdbc.queryForObject(
        "select room_id from lesson where id=?",
        UUID.class,
        lesson
      )
    );
    assertEquals(
      1,
      jdbc.queryForObject(
        "select count(*) from user_course where user_id=? and course_id=?",
        Integer.class,
        professor,
        course
      )
    );
  }

  @Test
  void corsAcceptsReactDevelopmentOrigin() throws Exception {
    var request = HttpRequest.newBuilder(
      URI.create("http://127.0.0.1:" + port + "/api/auth/login")
    )
      .header("Origin", "http://127.0.0.1:5173")
      .header("Access-Control-Request-Method", "POST")
      .header("Access-Control-Request-Headers", "content-type")
      .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
      .build();
    var response = http.send(request, HttpResponse.BodyHandlers.ofString());
    assertEquals(200, response.statusCode());
    assertEquals(
      "http://127.0.0.1:5173",
      response.headers().firstValue("Access-Control-Allow-Origin").orElse("")
    );
  }
}
