package br.com.anhanguera.academico.shared;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;

@Component
public class TransactionLock {

  private final EntityManager em;

  public TransactionLock(EntityManager em) {
    this.em = em;
  }

  @Transactional(propagation = Propagation.MANDATORY)
  public void acquire() {
    em.createNativeQuery(
      "select pg_advisory_xact_lock(20261015)",
      Object.class
    ).getSingleResult();
  }
}
