package br.com.anhanguera.academico.security;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface AccessTokenRepository
  extends JpaRepository<AccessToken, String>
{
  void deleteByUserId(UUID userId);
  void deleteByExpiresAtBefore(Instant instant);
}
