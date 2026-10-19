package br.com.anhanguera.academico.imports;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "backup_import")
public class BackupReceipt {

  @Id
  @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.CHAR)
  @Column(name = "backup_hash", columnDefinition = "char(64)")
  public String id;

  @Column(name = "imported_by", nullable = false)
  public UUID importedBy;

  @Column(name = "imported_at", nullable = false)
  public Instant importedAt = Instant.now();
}
