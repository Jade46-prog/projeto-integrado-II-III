package br.com.anhanguera.academico.rooms;

import java.time.*;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface RoomRepository extends JpaRepository<Room, UUID> {
  List<Room> findAllByOrderByFloorAscNameAsc();
  Optional<Room> findByName(String name);
}
