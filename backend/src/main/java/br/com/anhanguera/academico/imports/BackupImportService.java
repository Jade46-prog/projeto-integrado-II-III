package br.com.anhanguera.academico.imports;

import static br.com.anhanguera.academico.imports.ImportPersistence.id;
import static br.com.anhanguera.academico.security.Access.*;

import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

/** Importação aditiva: a prévia executa as mesmas validações em transação revertida. */
@org.springframework.stereotype.Service
public class BackupImportService {

  public record Input(
    JsonNode backup,
    Map<String, String> passwords,
    Map<String, ApiModels.RoomInput> rooms,
    String previewToken
  ) {}

  private record Ticket(
    UUID user,
    String inputHash,
    Map<String, Object> report,
    Instant expires
  ) {}

  private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
  private final ImportPersistence db;
  private final Access access;
  private final PasswordEncoder encoder;
  private final TransactionTemplate tx;
  private final LocalDate first, last;

  public BackupImportService(
    ImportPersistence db,
    Access access,
    PasswordEncoder encoder,
    TransactionTemplate tx,
    @Value("${app.semester-start}") String first,
    @Value("${app.semester-end}") String last
  ) {
    this.db = db;
    this.access = access;
    this.encoder = encoder;
    this.tx = tx;
    this.first = LocalDate.parse(first);
    this.last = LocalDate.parse(last);
  }

  public Map<String, Object> preview(Input input) {
    access.admin();
    checkEnvelope(input);
    Map<String, Object> report = tx.execute(status -> {
      try {
        return run(input);
      } finally {
        status.setRollbackOnly();
      }
    });
    tickets
      .entrySet()
      .removeIf(e -> e.getValue().expires().isBefore(Instant.now()));
    valid(
      tickets.size() < 100,
      "Muitas prévias pendentes. Aguarde dez minutos."
    );
    String token = UUID.randomUUID().toString();
    tickets.put(
      token,
      new Ticket(
        access.actor().id(),
        inputHash(input),
        report,
        Instant.now().plusSeconds(600)
      )
    );
    return Map.of("previewToken", token, "report", report, "expiresIn", 600);
  }

  public Map<String, Object> confirm(Input input) {
    access.admin();
    checkEnvelope(input);
    Ticket ticket =
      input.previewToken() == null ? null : tickets.get(input.previewToken());
    conflict(
      ticket != null &&
        ticket.user().equals(access.actor().id()) &&
        ticket.expires().isAfter(Instant.now()) &&
        ticket.inputHash().equals(inputHash(input)),
      "Prévia ausente, expirada ou alterada. Valide o arquivo novamente."
    );
    var result = tx.execute(status -> {
      var report = run(input);
      conflict(
        report.equals(ticket.report()),
        "Os cadastros mudaram desde a prévia. Valide novamente."
      );
      db.receipt(backupHash(input), access.actor().id());
      return report;
    });
    tickets.remove(input.previewToken());
    return Map.of("report", result, "imported", true);
  }

  private String backupHash(Input in) {
    return AuthService.hash(canonical(in.backup().path("dados")));
  }

  private String canonical(JsonNode node) {
    if (node.isObject()) {
      var values = new TreeMap<String, String>();
      for (var entry : node.properties())
        if (!Set.of("senha", "uid").contains(entry.getKey())) values.put(
          entry.getKey(),
          canonical(entry.getValue())
        );
      StringBuilder result = new StringBuilder("object:");
      values.forEach((key, value) ->
        result
          .append(key.length())
          .append(':')
          .append(key)
          .append(value.length())
          .append(':')
          .append(value)
      );
      return result.toString();
    }
    if (node.isArray()) {
      StringBuilder result = new StringBuilder("array:");
      node.forEach(n -> {
        String value = canonical(n);
        result.append(value.length()).append(':').append(value);
      });
      return result.toString();
    }
    return node.toString();
  }

  private String inputHash(Input in) {
    return AuthService.hash(
      backupHash(in) +
        new TreeMap<>(in.passwords()).toString() +
        new TreeMap<>(in.rooms()).toString()
    );
  }

  private void checkEnvelope(Input in) {
    valid(
      in.backup() != null &&
        in.backup().isObject() &&
        "projeto-integrado".equals(in.backup().path("formato").asText()) &&
        in.backup().path("versao").asInt() == 1,
      "Backup deve estar no formato projeto-integrado, versão 1."
    );
    valid(
      in.backup().toString().getBytes(StandardCharsets.UTF_8).length <=
        2_000_000,
      "Backup excede o limite de 2 MB."
    );
    valid(
      in.passwords() != null && in.rooms() != null,
      "Informe as senhas das novas contas e os dados das salas."
    );
    var data = in.backup().path("dados");
    for (String key : List.of("CURSOS", "TURMAS", "USERS"))
      valid(data.path(key).isObject(), "Campo inválido: " + key);
    for (String key : List.of("DISC", "AULAS", "NOTIFS", "DOCENTES"))
      valid(data.path(key).isArray(), "Campo inválido: " + key);
    valid(
      data.path("AULAS").size() <= 3000 &&
        data.path("USERS").size() <= 200 &&
        data.path("NOTIFS").size() <= 3000,
      "Limite: 3000 aulas, 200 contas e 3000 notificações por arquivo."
    );
  }

  private String text(JsonNode n, String key, int max) {
    var v = n.path(key);
    valid(
      v.isTextual() && !v.asText().isBlank() && v.asText().length() <= max,
      "Campo inválido: " + key
    );
    return v.asText().trim();
  }

  private UUID ref(Map<String, UUID> map, String key, String label) {
    valid(map.containsKey(key), label + " não encontrado: " + key);
    return map.get(key);
  }

  private void count(Map<String, Integer> stats, String key) {
    stats.merge(key, 1, Integer::sum);
  }

  private Map<String, Object> run(Input in) {
    db.lock();
    conflict(!db.imported(backupHash(in)), "Este backup já foi importado.");
    var s = in.backup().path("dados");
    var stats = new TreeMap<String, Integer>();
    var notes = new ArrayList<String>();
    Map<String, UUID> courses = new HashMap<>(),
      groups = new HashMap<>(),
      subjects = new HashMap<>(),
      professors = new HashMap<>(),
      rooms = new HashMap<>(),
      series = new HashMap<>();
    Map<String, String> groupCourses = new HashMap<>(),
      seriesCourses = new HashMap<>();
    var courseEntries = s.path("CURSOS").properties();
    for (var entry : courseEntries) {
      String code = entry.getKey(),
        name = entry.getValue().asText();
      valid(
        entry.getValue().isTextual() &&
          code.matches("[A-Z][A-Z0-9]{1,11}") &&
          !name.isBlank() &&
          name.length() <= 100,
        "Curso inválido: " + code
      );
      int semesters = 1;
      for (var group : s.path("TURMAS").properties())
        if (code.equals(group.getValue().path("c").asText())) semesters =
          Math.max(semesters, group.getValue().path("s").asInt());
      valid(semesters <= 20, "Curso excede 20 semestres: " + code);
      var existing = db.course(code);
      UUID course;
      if (existing.isEmpty()) {
        conflict(
          !db.courseNameExists(name),
          "Nome de curso já usado com outra sigla: " + name
        );
        course = UUID.randomUUID();
        db.createCourse(course, code, name, semesters);
        count(stats, "coursesCreated");
      } else {
        var old = existing.get(0);
        conflict(
          name.equals(old.get("name")) &&
            (int) old.get("semesters") >= semesters,
          "Curso existente divergente: " + code
        );
        course = id(old, "id");
        count(stats, "coursesReused");
      }
      courses.put(code, course);
    }
    for (var entry : s.path("TURMAS").properties()) {
      String code = entry.getKey(),
        course = text(entry.getValue(), "c", 12);
      int semester = entry.getValue().path("s").asInt();
      valid(
        !code.isBlank() &&
          code.length() <= 40 &&
          entry.getValue().path("s").isIntegralNumber() &&
          semester >= 1 &&
          semester <= 20,
        "Turma inválida: " + code
      );
      UUID courseId = ref(courses, course, "Curso");
      var existing = db.group(code);
      UUID group;
      if (existing.isEmpty()) {
        group = UUID.randomUUID();
        db.createGroup(group, courseId, code, semester);
        count(stats, "groupsCreated");
      } else {
        var old = existing.get(0);
        conflict(
          old.get("course_id").equals(courseId) &&
            (int) old.get("semester") == semester,
          "Turma existente divergente: " + code
        );
        group = id(old, "id");
        count(stats, "groupsReused");
      }
      groups.put(code, group);
      groupCourses.put(code, course);
    }
    for (var subject : s.path("DISC")) {
      String course = text(subject, "c", 12),
        name = text(subject, "n", 100),
        key = course + "\n" + name.toLowerCase(Locale.ROOT);
      if (subjects.containsKey(key)) {
        count(stats, "subjectsGrouped");
        continue;
      }
      UUID courseId = ref(courses, course, "Curso");
      var existing = db.subject(courseId, name);
      UUID id;
      if (existing.isEmpty()) {
        id = UUID.randomUUID();
        db.createSubject(id, courseId, name);
        count(stats, "subjectsCreated");
      } else {
        id = id(existing.get(0), "id");
        count(stats, "subjectsReused");
      }
      subjects.put(key, id);
    }
    Set<String> seenCpf = new HashSet<>();
    for (var entry : s.path("USERS").properties()) {
      var user = entry.getValue();
      String role = text(user, "role", 20);
      valid(
        Set.of("admin", "professor", "coordenador").contains(role),
        "Perfil inválido."
      );
      if (role.equals("admin")) {
        count(stats, "adminsSkipped");
        continue;
      }
      String cpf = AuthService.cpf(entry.getKey()),
        name = text(user, role.equals("professor") ? "doc" : "name", 100),
        dbRole = role.equals("professor") ? "PROFESSOR" : "COORDINATOR";
      valid(seenCpf.add(cpf), "CPF duplicado no arquivo.");
      var existing = db.user(cpf);
      UUID userId;
      if (existing.isEmpty()) {
        String password = in.passwords().get(cpf);
        valid(
          password != null &&
            password.length() >= 12 &&
            password.getBytes(StandardCharsets.UTF_8).length <= 72,
          "Defina uma nova senha de 12 caracteres a 72 bytes para " + name + "."
        );
        userId = UUID.randomUUID();
        db.createUser(userId, name, cpf, encoder.encode(password), dbRole);
        count(stats, "usersCreated");
      } else {
        var old = existing.get(0);
        conflict(
          old.get("role").equals(dbRole) &&
            old.get("name").equals(name) &&
            Boolean.TRUE.equals(old.get("active")),
          "Conta existente divergente: " + name
        );
        userId = id(old, "id");
        count(stats, "usersReused");
      }
      List<String> links = new ArrayList<>();
      if (user.has("cursos")) {
        valid(user.path("cursos").isArray(), "Vínculos inválidos: " + name);
        user.path("cursos").forEach(c -> links.add(c.asText()));
      } else {
        links.add(user.path("curso").asText("ADS"));
        notes.add("Vínculo legado de " + name + ": " + links.get(0));
      }
      valid(!links.isEmpty(), "Usuário sem cursos: " + name);
      for (String code : new HashSet<>(links)) {
        UUID course = ref(courses, code, "Curso");
        int added = db.link(userId, course);
        if (added > 0) count(stats, "linksAdded");
      }
      if (role.equals("professor")) {
        valid(
          !professors.containsKey(name),
          "Professores homônimos no arquivo: " + name
        );
        professors.put(name, userId);
      }
    }
    Set<Integer> lessonIds = new HashSet<>();
    for (var lesson : s.path("AULAS")) {
      int legacyId = lesson.path("id").asInt();
      valid(
        lesson.path("id").isIntegralNumber() &&
          legacyId > 0 &&
          lessonIds.add(legacyId),
        "Identificador de aula inválido ou repetido."
      );
      String label = "Aula " + legacyId + ": ",
        course = text(lesson, "c", 12),
        name = text(lesson, "n", 100),
        professor = text(lesson, "d", 100),
        roomName = text(lesson, "sala", 100).replace(" - Bloco B", "");
      UUID courseId = ref(courses, course, "Curso"),
        subject = ref(
          subjects,
          course + "\n" + name.toLowerCase(Locale.ROOT),
          "Matéria"
        ),
        prof = ref(professors, professor, "Professor");
      valid(
        db.linked(prof, courseId),
        label + "professor sem vínculo com o curso."
      );
      if (!rooms.containsKey(roomName)) {
        var existing = db.room(roomName);
        UUID room;
        if (existing.isEmpty()) {
          var input = in.rooms().get(roomName);
          valid(
            input != null &&
              roomName.equals(input.name()) &&
              input.floor() != null &&
              !input.floor().isBlank() &&
              input.floor().length() <= 20 &&
              (input.capacity() == null || input.capacity() > 0),
            "Informe o andar da sala: " + roomName
          );
          room = UUID.randomUUID();
          db.createRoom(room, roomName, input.floor(), input.capacity());
          count(stats, "roomsCreated");
        } else {
          room = id(existing.get(0), "id");
          count(stats, "roomsReused");
        }
        rooms.put(roomName, room);
      }
      LocalDate date;
      LocalTime start, end;
      String endText = lesson.path("fim").asText();
      valid(
        !endText.isBlank(),
        label + "informe o horário de término no backup antes de importar."
      );
      try {
        date = LocalDate.parse(text(lesson, "data", 10));
        start = LocalTime.parse(text(lesson, "h", 5));
        end = LocalTime.parse(endText);
      } catch (Exception e) {
        throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          label + "data ou horário inválido."
        );
      }
      valid(
        !date.isBefore(first) &&
          !date.isAfter(last) &&
          date.getDayOfWeek().getValue() <= 5,
        label + "data fora dos dias úteis do semestre."
      );
      valid(
        start.getSecond() == 0 &&
          end.getSecond() == 0 &&
          start.getNano() == 0 &&
          end.getNano() == 0 &&
          start.isBefore(end) &&
          ((!start.isBefore(LocalTime.of(8, 0)) &&
            !end.isAfter(LocalTime.of(11, 50))) ||
            (!start.isBefore(LocalTime.of(19, 0)) &&
              !end.isAfter(LocalTime.of(22, 50)))),
        label + "horário fora dos períodos permitidos."
      );
      String status = text(lesson, "st", 20);
      valid(
        Set.of("OK", "CANCELADA").contains(status) &&
          lesson.path("pub").isBoolean(),
        label + "situação inválida."
      );
      boolean cancelled = status.equals("CANCELADA");
      if (!cancelled) conflict(
        !db.hasConflict(date, end, start, prof, rooms.get(roomName)),
        label + "conflito de sala ou professor em " + date + "."
      );
      var groupList = lesson.path("t");
      valid(
        groupList.isArray() && !groupList.isEmpty(),
        label + "selecione turmas."
      );
      String seriesKey = lesson.path("serieId").asText();
      if (seriesKey.isBlank()) {
        seriesKey = "isolada-" + legacyId;
        count(stats, "lessonsWithoutSeries");
      }
      valid(
        !seriesCourses.containsKey(seriesKey) ||
          seriesCourses.get(seriesKey).equals(course),
        label + "série reúne cursos diferentes."
      );
      seriesCourses.put(seriesKey, course);
      UUID seriesId = series.computeIfAbsent(seriesKey, k -> UUID.randomUUID()),
        lessonId = UUID.randomUUID();
      conflict(
        !db.occurrenceExists(seriesId, date),
        label + "série contém duas ocorrências no mesmo dia."
      );
      db.createLesson(
        lessonId,
        seriesId,
        courseId,
        subject,
        prof,
        rooms.get(roomName),
        date,
        start,
        end,
        lesson.path("pub").asBoolean(),
        cancelled ? "CANCELLED" : "CONFIRMED"
      );
      Set<String> uniqueGroups = new HashSet<>();
      for (var g : groupList) {
        String code = g.asText();
        UUID group = ref(groups, code, "Turma");
        valid(
          course.equals(groupCourses.get(code)),
          label + "turma pertence a outro curso."
        );
        if (uniqueGroups.add(code)) db.lessonGroup(lessonId, group);
      }
      count(stats, "lessonsCreated");
    }
    for (var notification : s.path("NOTIFS")) {
      String message = text(notification, "txt", 2000)
        .replace("<b>", "")
        .replace("</b>", "");
      valid(
        message.length() <= 500 &&
          !message.contains("<") &&
          !message.contains(">"),
        "Notificação contém marcação inválida ou excede 500 caracteres."
      );
      valid(
        notification.path("t").isArray(),
        "Turmas da notificação inválidas."
      );
      Set<String> unique = new HashSet<>();
      for (var g : notification.path("t")) {
        String code = g.asText();
        UUID group = ref(groups, code, "Turma");
        if (unique.add(code)) {
          db.notification(
            UUID.randomUUID(),
            courses.get(groupCourses.get(code)),
            group,
            message
          );
          count(stats, "notificationsCreated");
        }
      }
    }
    stats.put("seriesCreated", series.size());
    notes.add(
      "Administradores e senhas da demonstração não são importados. Contas existentes mantêm senha e vínculos; novos vínculos são adicionados."
    );
    notes.add(
      "Notificações históricas recebem a data da importação. Leitura local e sala original não são migradas."
    );
    return Map.of("counts", stats, "notes", notes);
  }
}
