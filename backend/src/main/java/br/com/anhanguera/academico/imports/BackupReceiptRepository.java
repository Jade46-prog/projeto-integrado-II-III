package br.com.anhanguera.academico.imports;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface BackupReceiptRepository
  extends JpaRepository<BackupReceipt, String> {}
