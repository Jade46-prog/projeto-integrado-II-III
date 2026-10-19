package br.com.anhanguera.academico.rooms;

import jakarta.persistence.*;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "room")
public class Room {

  @Id
  public UUID id = UUID.randomUUID();

  @Column(length = 100, nullable = false)
  public String name;

  @Column(length = 20, nullable = false)
  public String floor;

  public Integer capacity;
}
