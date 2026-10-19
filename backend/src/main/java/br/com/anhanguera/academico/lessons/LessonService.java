package br.com.anhanguera.academico.lessons;

import static br.com.anhanguera.academico.security.Access.*;
import static br.com.anhanguera.academico.shared.Records.required;

import br.com.anhanguera.academico.courses.*;
import br.com.anhanguera.academico.groups.*;
import br.com.anhanguera.academico.notifications.*;
import br.com.anhanguera.academico.rooms.*;
import br.com.anhanguera.academico.security.*;
import br.com.anhanguera.academico.shared.*;
import br.com.anhanguera.academico.subjects.*;
import br.com.anhanguera.academico.users.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class LessonService {

  private static final UUID NONE = new UUID(0, 0);
  private final LessonRepository lessons;
  private final CourseRepository courses;
  private final SubjectRepository subjects;
  private final AcademicUserRepository users;
  private final RoomRepository rooms;
  private final StudentGroupRepository groups;
  private final NotificationRepository notifications;
  private final Access access;
  private final TransactionLock lock;
  private final LocalDate first, last;

  public LessonService(
    LessonRepository lessons,
    CourseRepository courses,
    SubjectRepository subjects,
    AcademicUserRepository users,
    RoomRepository rooms,
    StudentGroupRepository groups,
    NotificationRepository notifications,
    Access access,
    TransactionLock lock,
    @Value("${app.semester-start}") String first,
    @Value("${app.semester-end}") String last
  ) {
    this.lessons = lessons;
    this.courses = courses;
    this.subjects = subjects;
    this.users = users;
    this.rooms = rooms;
    this.groups = groups;
    this.notifications = notifications;
    this.access = access;
    this.lock = lock;
    this.first = LocalDate.parse(first);
    this.last = LocalDate.parse(last);
  }

  public ApiView.LessonView detail(Lesson l) {
    return new ApiView.LessonView(
      l.id,
      l.seriesId,
      l.courseId,
      l.subjectId,
      l.professorId,
      l.roomId,
      l.date,
      l.start,
      l.end,
      l.published,
      l.status,
      required(subjects.findById(l.subjectId)).name,
      required(users.findById(l.professorId)).name,
      required(rooms.findById(l.roomId)).name,
      required(courses.findById(l.courseId)).name,
      l.groups
        .stream()
        .sorted(Comparator.comparing(g -> g.code))
        .map(ApiView.GroupView::of)
        .toList()
    );
  }

  public List<ApiView.LessonView> list(
    UUID courseId,
    Integer semester,
    String period,
    LocalDate from,
    LocalDate to,
    boolean anonymous
  ) {
    valid(
      from != null &&
        to != null &&
        !to.isBefore(from) &&
        !to.isAfter(from.plusDays(366)),
      "Informe intervalo de até 366 dias."
    );
    valid(
      period == null || Set.of("MATUTINO", "NOTURNO").contains(period),
      "Período deve ser MATUTINO ou NOTURNO."
    );
    valid(
      semester == null || (semester >= 1 && semester <= 20),
      "Semestre inválido."
    );
    if (!anonymous) access.readCourse(courseId);
    var actor = anonymous ? null : access.actor();
    return lessons
      .findByCourseIdAndDateBetweenOrderByDateAscStartAsc(courseId, from, to)
      .stream()
      .filter(l -> !anonymous || l.published)
      .filter(
        l ->
          actor == null ||
          !actor.role().equals("PROFESSOR") ||
          (l.published && l.professorId.equals(actor.id()))
      )
      .filter(
        l ->
          semester == null ||
          l.groups.stream().anyMatch(g -> g.semester == semester)
      )
      .filter(
        l ->
          period == null ||
          (period.equals("MATUTINO")
            ? l.start.isBefore(LocalTime.NOON)
            : !l.start.isBefore(LocalTime.of(19, 0)))
      )
      .map(this::detail)
      .toList();
  }

  private void validate(ApiModels.LessonInput in, LocalDate date) {
    valid(
      !date.isBefore(first) &&
        !date.isAfter(last) &&
        date.getDayOfWeek().getValue() <= 5,
      "Escolha um dia útil dentro do semestre configurado."
    );
    valid(
      in.start().getSecond() == 0 &&
        in.end().getSecond() == 0 &&
        in.start().getNano() == 0 &&
        in.end().getNano() == 0,
      "Informe horários em horas e minutos."
    );
    valid(
      in.start().isBefore(in.end()),
      "O término deve ser posterior ao início."
    );
    valid(
      (!in.start().isBefore(LocalTime.of(8, 0)) &&
        !in.end().isAfter(LocalTime.of(11, 50))) ||
        (!in.start().isBefore(LocalTime.of(19, 0)) &&
          !in.end().isAfter(LocalTime.of(22, 50))),
      "A aula deve estar entre 08:00 e 11:50 ou entre 19:00 e 22:50."
    );
    valid(
      subjects
        .findById(in.subjectId())
        .map(s -> s.courseId.equals(in.courseId()))
        .orElse(false),
      "Matéria não pertence ao curso."
    );
    valid(
      users
        .findById(in.professorId())
        .map(
          u ->
            u.active &&
            u.role.equals("PROFESSOR") &&
            u.courses.stream().anyMatch(c -> c.id.equals(in.courseId()))
        )
        .orElse(false),
      "Professor não vinculado ao curso."
    );
    required(rooms.findById(in.roomId()));
    for (UUID group : in.groupIds())
      valid(
        groups
          .findById(group)
          .map(g -> g.courseId.equals(in.courseId()))
          .orElse(false),
        "Turma não pertence ao curso."
      );
  }

  private void check(
    UUID ignore,
    UUID series,
    ApiModels.LessonInput in,
    LocalDate date
  ) {
    conflict(
      !lessons.conflicts(
        ignore == null ? NONE : ignore,
        series == null ? NONE : series,
        date,
        in.start(),
        in.end(),
        in.professorId(),
        in.roomId()
      ),
      "Conflito de sala ou professor em " +
        date +
        ". Nenhuma alteração foi salva."
    );
  }

  private void apply(Lesson l, ApiModels.LessonInput in, LocalDate date) {
    l.courseId = in.courseId();
    l.subjectId = in.subjectId();
    l.professorId = in.professorId();
    l.roomId = in.roomId();
    l.date = date;
    l.start = in.start();
    l.end = in.end();
    l.groups.clear();
    for (UUID g : in.groupIds()) l.groups.add(required(groups.findById(g)));
  }

  private void notifyGroups(Lesson l, String message) {
    for (var g : l.groups) {
      var n = new Notification();
      n.courseId = l.courseId;
      n.groupId = g.id;
      n.lessonDate = l.date;
      n.message =
        message +
        ": " +
        required(subjects.findById(l.subjectId)).name +
        " (" +
        l.date +
        ")";
      notifications.save(n);
    }
  }

  @Transactional
  public List<ApiView.LessonView> save(UUID id, ApiModels.LessonInput in) {
    lock.acquire();
    access.coordinate(in.courseId());
    var old = id == null ? null : required(lessons.findById(id));
    valid(
      old == null || old.courseId.equals(in.courseId()),
      "A aula deve permanecer no curso original."
    );
    validate(in, in.date());
    UUID series = old == null ? UUID.randomUUID() : old.seriesId;
    List<LocalDate> dates = new ArrayList<>();
    for (
      var d = in.date();
      !d.isAfter(in.repeatWeekly() ? last : in.date());
      d = d.plusWeeks(1)
    ) {
      boolean exists = lessons.existsBySeriesIdAndDateAndIdNot(
        series,
        d,
        id == null ? NONE : id
      );
      if (d.equals(in.date())) conflict(
        !exists,
        "Já existe uma ocorrência desta série na data selecionada."
      );
      if (!exists) dates.add(d);
    }
    for (var d : dates) check(id, null, in, d);
    List<Lesson> saved = new ArrayList<>();
    for (var date : dates) {
      var l = old != null && date.equals(in.date()) ? old : new Lesson();
      l.seriesId = series;
      if (l.published) notifyGroups(l, "Aula atualizada");
      apply(l, in, date);
      l = lessons.save(l);
      if (l.published) notifyGroups(l, "Confira os dados atualizados da aula");
      saved.add(l);
    }
    lessons.flush();
    return saved.stream().map(this::detail).toList();
  }

  @Transactional
  public List<ApiView.LessonView> editSeries(
    UUID id,
    ApiModels.LessonInput in
  ) {
    lock.acquire();
    var selected = required(lessons.findById(id));
    access.coordinate(selected.courseId);
    valid(
      selected.courseId.equals(in.courseId()),
      "A aula deve permanecer no curso original."
    );
    valid(
      !in.repeatWeekly(),
      "Editar a série altera as ocorrências existentes; não cria novas repetições."
    );
    var rows = lessons.findBySeriesIdOrderByDateAscIdAsc(selected.seriesId);
    long shift = ChronoUnit.DAYS.between(selected.date, in.date());
    Map<UUID, LocalDate> dates = new LinkedHashMap<>();
    for (var l : rows) {
      access.coordinate(l.courseId);
      valid(
        l.courseId.equals(in.courseId()),
        "Série com cursos incompatíveis."
      );
      var date = l.date.plusDays(shift);
      validate(in, date);
      conflict(
        !dates.containsValue(date),
        "A série contém ocorrências na mesma data."
      );
      dates.put(l.id, date);
      if (!l.status.equals("CANCELLED")) check(null, l.seriesId, in, date);
    }
    for (var l : rows) {
      if (l.published) notifyGroups(l, "Aula da série atualizada");
      apply(l, in, dates.get(l.id));
      if (l.published) notifyGroups(l, "Confira os dados atualizados da série");
    }
    lessons.flush();
    return rows.stream().map(this::detail).toList();
  }

  @Transactional
  public ApiView.LessonView location(UUID id, ApiModels.LocationInput in) {
    lock.acquire();
    var l = required(lessons.findById(id));
    access.professor(l.professorId);
    valid(
      l.published,
      "Somente aulas publicadas podem ser alteradas pelo professor."
    );
    required(rooms.findById(in.roomId()));
    if (in.status() == ApiModels.Status.CONFIRMED) conflict(
      !lessons.conflicts(
        id,
        NONE,
        l.date,
        l.start,
        l.end,
        l.professorId,
        in.roomId()
      ),
      "Conflito de sala ou professor neste intervalo."
    );
    boolean changed =
      !l.roomId.equals(in.roomId()) || !l.status.equals(in.status().name());
    l.roomId = in.roomId();
    l.status = in.status().name();
    if (changed) notifyGroups(l, "Local ou situação da aula alterado");
    lessons.flush();
    return detail(l);
  }

  @Transactional
  public Map<String, Integer> publish(UUID courseId) {
    lock.acquire();
    access.coordinate(courseId);
    var drafts = lessons.findByCourseIdAndPublishedFalse(courseId);
    for (var l : drafts) {
      l.published = true;
      notifyGroups(l, "Nova aula publicada");
    }
    return Map.of("published", drafts.size());
  }

  @Transactional
  public Map<String, Integer> deleteSeries(UUID seriesId) {
    lock.acquire();
    var rows = lessons.findBySeriesIdOrderByDateAscIdAsc(seriesId);
    required(rows.stream().findFirst());
    for (var l : rows) access.coordinate(l.courseId);
    for (var l : rows)
      if (l.published) notifyGroups(l, "Aula excluída do cronograma");
    lessons.deleteAll(rows);
    lessons.flush();
    return Map.of("deleted", rows.size());
  }
}
