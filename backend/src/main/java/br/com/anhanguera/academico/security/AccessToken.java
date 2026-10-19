package br.com.anhanguera.academico.security;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "access_token")
public class AccessToken {

  @Id
  @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.CHAR)
  @Column(name = "token_hash", columnDefinition = "char(64)")
  public String id;

  @Column(name = "user_id", nullable = false)
  public UUID userId;

  @Column(name = "expires_at", nullable = false)
  public Instant expiresAt;
}
